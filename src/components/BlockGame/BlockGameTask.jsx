import React, { useState, useEffect, useRef, useCallback } from 'react';
import BlockWorkspace from './BlockWorkspace/BlockWorkspace';
import GameView from './GameEngine/GameView';
import { compileProgram, getNextPosition } from './GameEngine/gameInterpreter.js';
import { ALL_LEVELS, getLevelById, getDefaultLevel } from './levels/index.js';
import { playLmsSound, LMS_SOUND_TYPES } from '../../utils/lmsSounds';
import './BlockGameTask.css';

export default function BlockGameTask({
  task,
  state,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  standalone = false,
  initialLevelId = null,
}) {
  // Determine starting level
  const resolvedLevelId =
    initialLevelId ||
    task?.levelId ||
    task?.metadata?.levelId ||
    getDefaultLevel('plants').id;

  const [currentLevelId, setCurrentLevelId] = useState(resolvedLevelId);
  const level = getLevelById(currentLevelId);

  // Workspace blocks state
  const [blocks, setBlocks] = useState(() => level.initialBlocks || []);
  const [activeBlockId, setActiveBlockId] = useState(null);

  // Game board state
  const [robotState, setRobotState] = useState(() => ({ ...level.initialRobot }));
  const [cargos, setCargos] = useState(() => [...(level.initialCargos || [])]);
  const [plants, setPlants] = useState(() => [...(level.initialPlants || [])]);

  // Effects state
  const [laserActive, setLaserActive] = useState(false);
  const [waterActive, setWaterActive] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState('idle'); // 'idle' | 'running' | 'completed' | 'failed'
  const [statusMessage, setStatusMessage] = useState('');

  // Resizable split pane state ("kéo ra kéo dô" chia cột giao diện)
  const [splitRatio, setSplitRatio] = useState(50); // percentage for left pane
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef(null);

  const handleStartResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const newPercent = (relativeX / rect.width) * 100;
      // Clamp between 25% and 75%
      const clamped = Math.max(25, Math.min(75, newPercent));
      setSplitRatio(clamped);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing]);

  // Timer ref for stepping loop
  const executionTimerRef = useRef(null);

  // Load level when currentLevelId changes
  useEffect(() => {
    const nextLevel = getLevelById(currentLevelId);
    setBlocks(nextLevel.initialBlocks || []);
    setRobotState({ ...nextLevel.initialRobot });
    setCargos([...(nextLevel.initialCargos || [])]);
    setPlants([...(nextLevel.initialPlants || [])]);
    setExecutionStatus('idle');
    setStatusMessage('');
    setActiveBlockId(null);
    setIsExecuting(false);
  }, [currentLevelId]);

  // Reset level to initial state (preserves user code in workspace)
  const handleReset = useCallback(() => {
    if (executionTimerRef.current) {
      clearTimeout(executionTimerRef.current);
      executionTimerRef.current = null;
    }

    setRobotState({ ...level.initialRobot });
    setCargos([...(level.initialCargos || [])]);
    setPlants([...(level.initialPlants || [])]);
    setLaserActive(false);
    setWaterActive(false);
    setIsExecuting(false);
    setActiveBlockId(null);
    setExecutionStatus('idle');
    setStatusMessage('');
  }, [level]);

  // Run program
  const handleRun = useCallback(() => {
    if (isExecuting) return;

    // Reset board before running
    setRobotState({ ...level.initialRobot });
    setCargos([...(level.initialCargos || [])]);
    setPlants([...(level.initialPlants || [])]);
    setLaserActive(false);
    setWaterActive(false);
    setStatusMessage('');
    setExecutionStatus('running');

    let steps;
    try {
      steps = compileProgram(blocks);
    } catch (err) {
      setExecutionStatus('failed');
      setStatusMessage(err.message || 'Error compiling program');
      return;
    }

    if (!steps || steps.length === 0) {
      setExecutionStatus('failed');
      setStatusMessage('Add some commands below "When Start clicked" first!');
      return;
    }

    setIsExecuting(true);
    playLmsSound(LMS_SOUND_TYPES.CLICK);

    // Simulation variables
    let stepIndex = 0;
    let simRobot = { ...level.initialRobot };
    let simCargos = [...(level.initialCargos || [])];
    let simPlants = [...(level.initialPlants || [])];
    const tileSet = new Set((level.grid?.tiles || []).map((t) => `${t.x},${t.y}`));

    const stepDelay = 380; // ms per step

    function executeNextStep() {
      if (stepIndex >= steps.length) {
        // Finished all steps -> Check Win Condition
        setIsExecuting(false);
        setActiveBlockId(null);

        if (level.mode === 'radial') {
          const remainingEvil = simPlants.filter((p) => p.isEvil && !p.destroyed);
          const reqDestroy = level.targetDestroyedCount ?? 1;
          const reqWater = level.targetWateredCount ?? 0;
          const destroyedEvil = simPlants.filter((p) => p.isEvil && p.destroyed).length;
          const wateredGood = simPlants.filter((p) => !p.isEvil && p.isWatered).length;

          if (remainingEvil.length === 0 && destroyedEvil >= reqDestroy && wateredGood >= reqWater) {
            setExecutionStatus('completed');
            playLmsSound(LMS_SOUND_TYPES.CORRECT);
            onTaskCompleted?.({
              completionType: 'correct',
              isCorrect: true,
              score: 1,
              maxScore: 1,
              feedback: 'Great job! Destroyed pest plant and grew good plant.',
            });
          } else {
            setExecutionStatus('failed');
            playLmsSound(LMS_SOUND_TYPES.WRONG);
            if (remainingEvil.length > 0) {
              setStatusMessage('Pest plant still alive! Aim laser and destroy it.');
            } else if (wateredGood < reqWater) {
              setStatusMessage('Good plant not watered yet! Turn to the sprout and water it.');
            } else {
              setStatusMessage('Mission incomplete! Check instructions.');
            }
          }
          return;
        } else {
          // Grid / Mars mode
          if (simCargos.length === 0) {
            setExecutionStatus('completed');
            playLmsSound(LMS_SOUND_TYPES.CORRECT);
            onTaskCompleted?.({
              completionType: 'correct',
              isCorrect: true,
              score: 1,
              maxScore: 1,
              feedback: 'All cargo collected successfully!',
            });
          } else {
            setExecutionStatus('failed');
            playLmsSound(LMS_SOUND_TYPES.WRONG);
            setStatusMessage(`Mission incomplete! ${simCargos.length} cargo box(es) remaining.`);
          }
        }
        return;
      }

      const step = steps[stepIndex];
      setActiveBlockId(step.blockId);

      // Execute current action
      if (step.action === 'move_forward') {
        const nextPos = getNextPosition(simRobot.x, simRobot.y, simRobot.direction);

        // Check if next tile is on the track
        if (tileSet.has(`${nextPos.x},${nextPos.y}`)) {
          simRobot = { ...simRobot, x: nextPos.x, y: nextPos.y };
          setRobotState({ ...simRobot });
        } else {
          // Off track crash!
          setIsExecuting(false);
          setActiveBlockId(null);
          setExecutionStatus('failed');
          playLmsSound(LMS_SOUND_TYPES.WRONG);
          setStatusMessage('Oops! Robot went off the path.');
          return;
        }
      } else if (step.action === 'point_direction') {
        simRobot = { ...simRobot, direction: step.direction };
        setRobotState({ ...simRobot });
      } else if (step.action === 'take_cargo') {
        const cargoIndex = simCargos.findIndex((c) => c.x === simRobot.x && c.y === simRobot.y);
        if (cargoIndex >= 0) {
          simCargos.splice(cargoIndex, 1);
          simRobot.carriedCargo = (simRobot.carriedCargo || 0) + 1;
          setCargos([...simCargos]);
          setRobotState({ ...simRobot });
          playLmsSound(LMS_SOUND_TYPES.CORRECT);
        } else {
          setStatusMessage('No cargo found at current tile!');
        }
      } else if (step.action === 'turn_clockwise') {
        simRobot = { ...simRobot, direction: (simRobot.direction + step.angle) % 360 };
        setRobotState({ ...simRobot });
      } else if (step.action === 'turn_counterclockwise') {
        simRobot = {
          ...simRobot,
          direction: ((simRobot.direction - step.angle) % 360 + 360) % 360,
        };
        setRobotState({ ...simRobot });
      } else if (step.action === 'destroy') {
        setLaserActive(true);
        setTimeout(() => setLaserActive(false), 280);

        // Check if plant at current robot direction
        simPlants = simPlants.map((p) => {
          if (p.angle === simRobot.direction && p.isEvil) {
            return { ...p, destroyed: true };
          }
          return p;
        });
        setPlants([...simPlants]);
      } else if (step.action === 'water') {
        setWaterActive(true);
        setTimeout(() => setWaterActive(false), 280);

        // Water plant at current direction
        simPlants = simPlants.map((p) => {
          if (p.angle === simRobot.direction && !p.isEvil) {
            return { ...p, isWatered: true };
          }
          return p;
        });
        setPlants([...simPlants]);
      }

      stepIndex += 1;
      executionTimerRef.current = setTimeout(executeNextStep, stepDelay);
    }

    executionTimerRef.current = setTimeout(executeNextStep, 150);
  }, [blocks, isExecuting, level, onTaskCompleted]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (executionTimerRef.current) {
        clearTimeout(executionTimerRef.current);
      }
    };
  }, []);

  const isRadial = level.mode === 'radial';

  return (
    <div className="block-game-task-root">
      {/* Top Header Navigation Bar (Exact Algo LMS Style from Screenshot) */}
      <div className="block-game-level-bar">
        {/* Left: Back Button */}
        <button
          type="button"
          className="algo-lms-back-btn"
          onClick={() => (onPrevTask ? onPrevTask() : window.history.back())}
          title="Back to lesson catalog"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>

        {/* Center: Sequence of Level progression pills */}
        <div className="level-pills-container">
          {/* Item 0: Overview video / image icon */}
          <button
            type="button"
            className="level-pill-btn completed pill-icon-btn"
            title="Lesson Overview"
            onClick={() => setCurrentLevelId(isRadial ? 'plant_level_1' : 'mars_level_1')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </button>

          {/* Level Numbers (1 to 7 active/completed) */}
          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
            const lvlId = isRadial ? `plant_level_${num}` : `mars_level_${num}`;
            const isCurrent = level.levelNumber === num;
            const isAvailable = Boolean(ALL_LEVELS.find((l) => l.levelNumber === num && l.mode === level.mode));

            return (
              <button
                key={num}
                type="button"
                className={`level-pill-btn ${isCurrent ? 'active has-ring' : isAvailable ? 'completed' : 'completed'}`}
                onClick={() => {
                  const targetLevel = ALL_LEVELS.find((l) => l.levelNumber === num && l.mode === level.mode);
                  if (targetLevel) setCurrentLevelId(targetLevel.id);
                }}
                title={`Level ${num}`}
              >
                {num}
              </button>
            );
          })}

          {/* Mid-lesson video icon */}
          <button
            type="button"
            className="level-pill-btn completed pill-icon-btn"
            title="Video Guide"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>

          {/* Locked / Future Levels (8, 9, 10, Lock) */}
          {[8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              className="level-pill-btn locked"
              title={`Level ${num} (Locked)`}
              disabled
            >
              {num}
            </button>
          ))}

          {/* Lock icon pill */}
          <button
            type="button"
            className="level-pill-btn locked pill-icon-btn"
            title="Locked"
            disabled
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          </button>
        </div>

        {/* Right: User Profile Avatar */}
        <div className="algo-lms-user-badge">
          <div className="algo-lms-avatar-circle">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
              <circle cx="12" cy="8" r="4" />
              <path d="M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z" />
            </svg>
          </div>
          <div className="algo-lms-username-text">
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9' }}>Huy (501713)</span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Học sinh</span>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '2px' }}>▾</span>
        </div>
      </div>

      {/* Main Split Screen */}
      <div
        className={`block-game-split-pane ${isResizing ? 'is-resizing' : ''}`}
        ref={splitContainerRef}
      >
        {/* Left: Block Workspace */}
        <div
          className="block-game-pane-left"
          style={{ width: `${splitRatio}%`, flex: 'none' }}
        >
          <BlockWorkspace
            blocks={blocks}
            onChangeBlocks={setBlocks}
            toolboxBlockTypes={level.toolboxBlocks}
            maxCommands={level.maxCommands}
            activeBlockId={activeBlockId}
            isExecuting={isExecuting}
          />
        </div>

        {/* Resizer Divider Bar */}
        <div
          className={`block-game-resizer ${isResizing ? 'active' : ''}`}
          onPointerDown={handleStartResize}
          title="Drag to resize panels (Kéo để chỉnh kích thước)"
        >
          <div className="resizer-handle-grip" />
        </div>

        {/* Right: Game View */}
        <div
          className="block-game-pane-right"
          style={{ width: `calc(${100 - splitRatio}% - 10px)`, flex: 'none' }}
        >
          <GameView
            level={level}
            robotState={robotState}
            cargos={cargos}
            plants={plants}
            isExecuting={isExecuting}
            laserActive={laserActive}
            waterActive={waterActive}
            onRun={handleRun}
            onReset={handleReset}
            executionStatus={executionStatus}
            statusMessage={statusMessage}
          />
        </div>
      </div>
    </div>
  );
}
