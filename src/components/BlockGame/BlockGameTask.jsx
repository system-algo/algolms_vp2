import React, { useState, useEffect, useRef, useCallback } from 'react';
import BlockWorkspace from './BlockWorkspace/BlockWorkspace';
import GameView from './GameEngine/GameView';
import { compileProgram, getNextPosition } from './GameEngine/gameInterpreter.js';
import { ALL_LEVELS, getLevelById, getDefaultLevel } from './levels/index.js';
import { countCommands } from './BlockWorkspace/blockDefinitions.js';
import { playLmsSound, LMS_SOUND_TYPES } from '../../utils/lmsSounds';
import './BlockGameTask.css';
import ExcursionTask from './ExcursionTask.jsx';
import martianReferences from './levels/martianReference.json';
import retroReferences from './levels/retroReference.json';
import mineralReferences from './levels/mineralReference.json';
import excursionReferences from './levels/excursionReference.json';
import rocketReferences from './levels/rocketReference.json';
import fieldReferences from './levels/fieldReference.json';
import darkReferences from './levels/darkReference.json';
import trainingReferences from './levels/trainingReference.json';
import chefReferences from './levels/chefReference.json';
import unknownReferences from './levels/unknownReference.json';
import sortingReferences from './levels/sortingReference.json';
import journeyReferences from './levels/journeyReference.json';
import flightReferences from './levels/flightReference.json';
import plantsReferences from './levels/plantsReference.json';
import collectingReferences from './levels/collectingReference.json';
import excavationReferences from './levels/excavationReference.json';
import constructionReferences from './levels/constructionReference.json';

function resolveInitialLevelId(task, initialLevelId) {
  if (initialLevelId) return initialLevelId;
  if (task?.levelId) return task.levelId;
  if (task?.metadata?.levelId) return task.metadata.levelId;

  const taskId = String(task?.id || task?.taskId || '');
  const taskTitle = String(task?.title || '').toLowerCase();
  const text = (String(task?.instruction || '') + ' ' + String(task?.bodyText || '') + ' ' + taskTitle).toLowerCase();

  const match = taskId.match(/task-(\d+)-/);
  if (match) {
    const taskNum = parseInt(match[1], 10);
    if (taskNum === 1) {
      return 'plant_level_1';
    }
    // Task 2 -> plant_level_1 ... Task 8 -> plant_level_7
    if (taskNum >= 2 && taskNum <= 8) {
      return `plant_level_${taskNum - 1}`;
    }
    // Task 11 -> plant_level_8 ... Task 14 -> plant_level_11
    if (taskNum >= 11 && taskNum <= 14) {
      return `plant_level_${taskNum - 3}`;
    }
  }

  const posMatch = taskId.match(/_(\d+)$/);
  const pos = posMatch ? parseInt(posMatch[1], 10) : Number(task?.position || task?.level_position || 1);

  if (taskId.includes('M1L1_1') || taskTitle.includes('excursion')) {
    return `mars_level_${Math.max(1, Math.min(14, pos))}`;
  }
  if (taskId.includes('M1L1_2') || taskTitle.includes('rocket')) {
    return `mars_level_${Math.max(1, Math.min(14, pos + 6))}`;
  }
  if (taskId.includes('M1L2_1') || taskTitle.includes('marsbase')) {
    return `mars_level_${Math.max(1, Math.min(14, pos))}`;
  }
  if (taskId.includes('M1L2_2') || taskTitle.includes('excavation')) {
    return `mars_level_${Math.max(1, Math.min(14, pos + 5))}`;
  }

  if (text.includes('destroy one pest plant and grow')) return 'plant_level_3';
  if (text.includes('find the small sprout')) return 'plant_level_2';
  if (text.includes('destroy one pest plant')) return 'plant_level_1';
  if (text.includes('the greenhouse needs plants')) return 'plant_level_5';
  if (text.includes('sprout all the plants')) return 'plant_level_7';
  if (text.includes('the hordes are coming')) return 'plant_level_8';
  if (text.includes('sometimes the long way is faster')) return 'plant_level_10';
  if (text.includes('no more than 3 commands')) return 'plant_level_11';
  if (text.includes('help with the plants')) return 'plant_level_9';
  if (text.includes('help with the greenhouse')) return 'plant_level_4';

  if (text.includes('mars') || text.includes('living compartment') || text.includes('cargo')) {
    return `mars_level_${Math.max(1, Math.min(14, pos))}`;
  }

  return getDefaultLevel('plants').id;
}

export default function BlockGameTask(props) {
  const taskId = String(props.task?.id || props.task?.taskId || '');
  const martian=taskId.match(/^VP2?_M5L4_3_(\d+)$/);
  if(martian)return <ExcursionTask key={taskId} {...props} level={martianReferences.find(l=>l.number===Number(martian[1]))}/>;
  const retro=taskId.match(/^VP2?_M5L2_3_(\d+)$/);
  if(retro)return <ExcursionTask key={taskId} {...props} level={retroReferences.find(l=>l.number===Number(retro[1]))}/>;
  const mineral=taskId.match(/^VP2?_M5L1_3_(\d+)$/);
  if(mineral)return <ExcursionTask key={taskId} {...props} level={mineralReferences.find(l=>l.number===Number(mineral[1]))}/>;
  const field = taskId.match(/^VP2?_M4L4_2_(\d+)$/);
  if (field) return <ExcursionTask key={taskId} {...props} level={fieldReferences.find(l => l.number === Number(field[1]))} />;
  const dark = taskId.match(/^VP2?_M4L2_4_(\d+)$/);
  if (dark) return <ExcursionTask key={taskId} {...props} level={darkReferences.find(l => l.number === Number(dark[1]))} />;
  const training = taskId.match(/^VP2?_M4L2_2_(\d+)$/);
  if (training) return <ExcursionTask key={taskId} {...props} level={trainingReferences.find(l => l.number === Number(training[1]))} />;
  const chef = taskId.match(/^VP2?_M4L1_3_track[12]_(\d+)$/);
  if (chef) return <ExcursionTask key={taskId} {...props} level={chefReferences.find(l => l.number === Number(chef[1]))} />;
  const unknown = taskId.match(/^VP2?_M4L2_1_track1_(\d+)$/);
  if (unknown) return <ExcursionTask key={taskId} {...props} level={unknownReferences.find(l => l.number === Number(unknown[1]))} />;
  const sorting = taskId.match(/^VP2?_M3L1_1_(\d+)$/);
  if (sorting) return <ExcursionTask key={taskId} {...props} level={sortingReferences.find(l => l.number === Number(sorting[1]))} />;
  const journey = taskId.match(/^VP2?_M3L2_1_(\d+)$/);
  if (journey) return <ExcursionTask key={taskId} {...props} level={journeyReferences.find(l => l.number === Number(journey[1]))} />;
  const match = taskId.match(/^VP2?_M1L([12])_([12])_(\d+)$/);
  const flight = taskId.match(/^VP2?_M2L1_1_(\d+)$/);
  if (flight) return <ExcursionTask key={taskId} {...props} level={flightReferences.find(l => l.number === Number(flight[1]))} />;
  const plants = taskId.match(/^VP2?_M2L3_1_(\d+)$/);
  if (plants) return <ExcursionTask key={taskId} {...props} level={plantsReferences.find(l => l.number === Number(plants[1]))} />;
  const collecting = taskId.match(/^VP2?_M2L2_1_(\d+)$/);
  if (collecting) return <ExcursionTask key={taskId} {...props} level={collectingReferences.find(l => l.number === Number(collecting[1]))} />;
  const reference = match && (match[1] === "2" ? (match[2] === "1" ? constructionReferences : excavationReferences) : match[2] === "2" ? rocketReferences : excursionReferences).find(item => item.number === Number(match[3]));
  if (reference) return <ExcursionTask key={taskId} {...props} level={reference} />;
  return <LegacyBlockGameTask {...props} />;
}

function LegacyBlockGameTask({
  task,
  state,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  standalone = false,
  initialLevelId = null,
}) {
  const resolvedLevelId = resolveInitialLevelId(task, initialLevelId);

  const [currentLevelId, setCurrentLevelId] = useState(resolvedLevelId);
  const level = getLevelById(currentLevelId);

  // Sync currentLevelId when task prop changes
  useEffect(() => {
    const nextLevelId = resolveInitialLevelId(task, initialLevelId);
    if (nextLevelId && nextLevelId !== currentLevelId) {
      setCurrentLevelId(nextLevelId);
    }
  }, [task?.id, task?.taskId, initialLevelId]);

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

        const usedCommands = countCommands(blocks);

        if (level.mode === 'radial') {
          const remainingEvil = simPlants.filter((p) => p.isEvil && !p.destroyed);
          const reqDestroy = level.targetDestroyedCount ?? 1;
          const reqWater = level.targetWateredCount ?? 0;
          const destroyedEvil = simPlants.filter((p) => p.isEvil && p.destroyed).length;
          const wateredGood = simPlants.filter((p) => !p.isEvil && p.isWatered).length;

          const actionGoalsMet =
            remainingEvil.length === 0 && destroyedEvil >= reqDestroy && wateredGood >= reqWater;

          if (actionGoalsMet) {
            // Strict command limit check
            if (level.maxCommands && usedCommands > level.maxCommands) {
              setExecutionStatus('failed');
              playLmsSound(LMS_SOUND_TYPES.WRONG);
              setStatusMessage(
                `Số lệnh đã dùng: ${usedCommands} / ${level.maxCommands} (vượt quá giới hạn)! Dù hoàn thành mục tiêu nhưng bạn chưa đạt yêu cầu số lệnh. Hãy tối ưu bằng vòng lặp repeat!`
              );
              return;
            }

            setExecutionStatus('completed');
            playLmsSound(LMS_SOUND_TYPES.CORRECT);
            onTaskCompleted?.({
              completionType: 'correct',
              isCorrect: true,
              score: 1,
              maxScore: 1,
              feedback: 'Great job! Destroyed pest plant and grew good plant within command limit.',
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
          const hasTargetTile = Boolean(level.targetTile);
          const reachedTarget = hasTargetTile
            ? simRobot.x === level.targetTile.x && simRobot.y === level.targetTile.y
            : true;
          const cargoCompleted = simCargos.length === 0;

          if (reachedTarget && cargoCompleted) {
            // Strict command limit check
            if (level.maxCommands && usedCommands > level.maxCommands) {
              setExecutionStatus('failed');
              playLmsSound(LMS_SOUND_TYPES.WRONG);
              setStatusMessage(
                `Số lệnh đã dùng: ${usedCommands} / ${level.maxCommands} (vượt quá giới hạn)! Hãy tối ưu đường đi bằng vòng lặp repeat!`
              );
              return;
            }

            setExecutionStatus('completed');
            playLmsSound(LMS_SOUND_TYPES.CORRECT);
            onTaskCompleted?.({
              completionType: 'correct',
              isCorrect: true,
              score: 1,
              maxScore: 1,
              feedback: 'Success! Robot reached the living compartment within command limit.',
            });
          } else {
            setExecutionStatus('failed');
            playLmsSound(LMS_SOUND_TYPES.WRONG);
            if (!reachedTarget) {
              setStatusMessage('The robot has not reached the station living compartment (marked with ✖)!');
            } else {
              setStatusMessage(`Mission incomplete! ${simCargos.length} cargo box(es) remaining.`);
            }
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
      } else if (step.action === 'turn_direction') {
        const delta = step.direction === 'left' ? -90 : 90;
        simRobot = {
          ...simRobot,
          direction: ((simRobot.direction + delta) % 360 + 360) % 360,
        };
        setRobotState({ ...simRobot });
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

          {/* Sequence of practice levels 1 to 7 */}
          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
            const isCurrent = level.levelNumber === num;
            return (
              <button
                key={num}
                type="button"
                className={`level-pill-btn ${isCurrent ? 'active has-ring' : 'completed'}`}
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

          {/* Smiley Icon Pill */}
          <button
            type="button"
            className="level-pill-btn completed pill-icon-btn"
            title="Practice Complete"
          >
            <span style={{ fontSize: '13px' }}>😊</span>
          </button>

          {/* Gallery image icon */}
          <button
            type="button"
            className="level-pill-btn completed pill-icon-btn"
            title="Artwork Gallery"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </button>

          {/* Bonus Levels 8 to 11 (Bonus 1, 2, 3, 4) */}
          {[8, 9, 10, 11].map((bNum, idx) => {
            const isCurrent = level.levelNumber === bNum;
            return (
              <button
                key={bNum}
                type="button"
                className={`level-pill-btn ${isCurrent ? 'active has-ring' : 'completed'} pill-icon-btn`}
                title={`Bonus ${idx + 1}`}
                onClick={() => {
                  const targetLevel = ALL_LEVELS.find((l) => l.levelNumber === bNum && l.mode === level.mode);
                  if (targetLevel) setCurrentLevelId(targetLevel.id);
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </button>
            );
          })}
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

      {/* Level Objective & Command Limit Banner */}
      <div
        className="block-game-instruction-banner"
        style={{
          background: isRadial ? '#1b0b13' : '#1e1124',
          borderBottom: isRadial ? '1px solid #4a1926' : '1px solid #382046',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '13.5px' }}>
          <span style={{ fontSize: '16px' }}>🎯</span>
          <span style={{ fontWeight: 700, color: '#fb923c' }}>{level.title}:</span>
          <span style={{ color: '#e2e8f0' }}>{level.instruction || level.hint}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {level.maxCommands && (
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: countCommands(blocks) > level.maxCommands ? '#f87171' : '#a7f3d0',
                background: countCommands(blocks) > level.maxCommands ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${countCommands(blocks) > level.maxCommands ? '#ef4444' : 'rgba(16, 185, 129, 0.3)'}`,
                borderRadius: '6px',
                padding: '3px 10px',
              }}
            >
              Lệnh dùng: <strong>{countCommands(blocks)} / {level.maxCommands}</strong>
              {countCommands(blocks) > level.maxCommands && ' (Vượt quá giới hạn!)'}
            </div>
          )}
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
