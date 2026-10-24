import { useEffect, useMemo, useRef, useState } from "react";

const NODE_W = 150;
const NODE_H = 48;

const COLOR_MAP = {
  purple: {
    bg: "#7c3aed",
    border: "#a78bfa",
    text: "#ffffff",
  },
  yellow: {
    bg: "#facc15",
    border: "#fde68a",
    text: "#1f2937",
  },
  cyan: {
    bg: "#22d3ee",
    border: "#67e8f9",
    text: "#0f172a",
  },
  green: {
    bg: "#34d399",
    border: "#86efac",
    text: "#052e16",
  },
  pink: {
    bg: "#fb7185",
    border: "#fda4af",
    text: "#ffffff",
  },
};

const COLOR_ORDER = ["purple", "yellow", "cyan", "green", "pink"];

function makeId(prefix = "node") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeNodes(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return [
      {
        id: "node-1",
        text: "New element",
        x: 90,
        y: 70,
        color: "purple",
      },
    ];
  }

  return nodes.map((node, index) => ({
    id: node.id || `node-${index + 1}`,
    text: node.text || "New element",
    x: Number.isFinite(node.x) ? node.x : 90 + index * 170,
    y: Number.isFinite(node.y) ? node.y : 70,
    color: node.color || COLOR_ORDER[index % COLOR_ORDER.length],
  }));
}

function normalizeEdges(edges, nodes) {
  if (!Array.isArray(edges)) return [];

  const nodeIds = new Set(nodes.map((node) => node.id));

  return edges
    .filter((edge) => edge?.from && edge?.to)
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge, index) => ({
      id: edge.id || `edge-${index + 1}`,
      from: edge.from,
      to: edge.to,
    }));
}

function getConfigFromProps(props) {
  return (
    props?.task?.diagramCanvas ||
    props?.activity?.diagramCanvas ||
    props?.config?.diagramCanvas ||
    props?.diagramCanvas ||
    props?.task ||
    props?.activity ||
    props?.config ||
    {}
  );
}

export default function DiagramCanvasTask(props) {
  const config = getConfigFromProps(props);

  const nodesKey = JSON.stringify(config.nodes || []);
  const edgesKey = JSON.stringify(config.edges || []);

  const initialNodes = useMemo(() => normalizeNodes(config.nodes), [nodesKey]);

  const initialEdges = useMemo(
    () => normalizeEdges(config.edges, initialNodes),
    [edgesKey, initialNodes]
  );

  const canvasWidth = config?.canvas?.width || 880;
  const canvasHeight = config?.canvas?.height || 520;
  const canvasBackground = config?.canvas?.background || "#111827";

  const allowEditText = config.allowEditText !== false;
  const allowDrag = config.allowDrag !== false;
  const allowAddChild = config.allowAddChild !== false;
  const allowDelete = config.allowDelete !== false;
  const showToolbar =
    config.toolbar?.showSave !== false || config.toolbar?.showZoom !== false;
  const showZoom = config.toolbar?.showZoom !== false;
  const showSave = config.toolbar?.showSave !== false;
  const showNextButton = config.showNextButton !== false;

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [zoom, setZoom] = useState(1);
  const [saved, setSaved] = useState(false);

  const dragRef = useRef(null);

  // Important:
  // Do not call setNodes on every contentEditable input.
  // That causes React to re-render the editable div and the caret jumps/reverses.
  const latestTextRef = useRef({});

  useEffect(() => {
    const textMap = {};

    initialNodes.forEach((node) => {
      textMap[node.id] = node.text || "New element";
    });

    latestTextRef.current = textMap;
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  useEffect(() => {
    function handlePointerMove(event) {
      const dragging = dragRef.current;
      if (!dragging) return;

      const dx = (event.clientX - dragging.startClientX) / zoom;
      const dy = (event.clientY - dragging.startClientY) / zoom;

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== dragging.nodeId) return node;

          return {
            ...node,
            x: clamp(dragging.startX + dx, 0, canvasWidth - NODE_W),
            y: clamp(dragging.startY + dy, 0, canvasHeight - NODE_H),
          };
        })
      );
    }

    function handlePointerUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [zoom, canvasWidth, canvasHeight]);

  function startDrag(event, node) {
    if (!allowDrag) return;
    if (event.target.closest("[data-no-drag='true']")) return;

    dragRef.current = {
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: node.x,
      startY: node.y,
    };
  }

  function rememberNodeText(nodeId, text) {
    latestTextRef.current[nodeId] = text || "New element";
  }

  function commitNodeText(nodeId, text) {
    const nextText = text || "New element";

    latestTextRef.current[nodeId] = nextText;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              text: nextText,
            }
          : node
      )
    );
  }

  function getCurrentNodesWithLatestText() {
    return nodes.map((node) => ({
      ...node,
      text: latestTextRef.current[node.id] ?? node.text,
    }));
  }

  function addChild(parentNode) {
    const childCount = edges.filter((edge) => edge.from === parentNode.id).length;
    const childId = makeId("node");
    const color = COLOR_ORDER[(nodes.length + 1) % COLOR_ORDER.length];

    const newNode = {
      id: childId,
      text: "New element",
      x: clamp(parentNode.x + 190, 0, canvasWidth - NODE_W),
      y: clamp(parentNode.y + childCount * 76, 0, canvasHeight - NODE_H),
      color,
    };

    latestTextRef.current[childId] = newNode.text;

    setNodes((currentNodes) => [...currentNodes, newNode]);
    setEdges((currentEdges) => [
      ...currentEdges,
      {
        id: makeId(`edge-${parentNode.id}-${childId}`),
        from: parentNode.id,
        to: childId,
      },
    ]);
  }

  function deleteNode(nodeId) {
    if (nodes.length <= 1) return;

    delete latestTextRef.current[nodeId];

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId)
    );
  }

  function getNodeById(nodeId) {
    return nodes.find((node) => node.id === nodeId);
  }

  function getEdgePath(edge) {
    const fromNode = getNodeById(edge.from);
    const toNode = getNodeById(edge.to);

    if (!fromNode || !toNode) return "";

    const startX = fromNode.x + NODE_W;
    const startY = fromNode.y + NODE_H / 2;
    const endX = toNode.x;
    const endY = toNode.y + NODE_H / 2;
    const midX = startX + Math.max(70, Math.abs(endX - startX) / 2);

    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  }

  function handleSave() {
    const payload = {
      nodes: getCurrentNodesWithLatestText(),
      edges,
    };

    props.onChange?.(payload);
    props.onSave?.(payload);

    setNodes(payload.nodes);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  function handleNext() {
    const payload = {
      nodes: getCurrentNodesWithLatestText(),
      edges,
    };

    props.onTaskCompleted?.({
      completionType: 'submitted',
      needsReview: true,
      feedback: 'Diagram submitted.',
      metadata: payload,
    });

    props.onComplete?.(payload);
    props.onNext?.(payload);
  }

  return (
    <div className="diagram-task-stage">
      <style>{`
        .diagram-task-stage {
          width: 100%;
          min-height: calc(100vh - 80px);
          background: linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%);
          padding: 22px 24px 34px;
          box-sizing: border-box;
          color: #ffffff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .diagram-task-shell {
          width: min(1120px, 100%);
          margin: 0 auto;
        }

        .diagram-task-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .diagram-task-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }

        .diagram-task-steps {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .diagram-step-pill {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.55);
          color: #ffffff;
          background: rgba(255, 255, 255, 0.14);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
        }

        .diagram-step-pill.active {
          background: #ffffff;
          color: #6d28d9;
        }

        .diagram-main-row {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 16px;
        }

        .diagram-canvas-scroll {
          max-width: 100%;
          overflow: auto;
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
          background: rgba(15, 23, 42, 0.45);
          padding: 12px;
        }

        .diagram-canvas-scale-box {
          position: relative;
        }

        .diagram-canvas {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          transform-origin: top left;
          background-image:
            radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.08) 1px, transparent 0);
          background-size: 28px 28px;
        }

        .diagram-edge-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        .diagram-node {
          position: absolute;
          width: ${NODE_W}px;
          min-height: ${NODE_H}px;
          border-radius: 12px;
          border: 2px solid transparent;
          box-sizing: border-box;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
          z-index: 2;
          cursor: grab;
          user-select: none;
        }

        .diagram-node:active {
          cursor: grabbing;
        }

        .diagram-node-text {
          min-height: 22px;
          padding: 13px 36px 13px 14px;
          outline: none;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.25;
          white-space: pre-wrap;
          word-break: break-word;
          user-select: text;
        }

        .diagram-node-text[contenteditable="true"] {
          cursor: text;
        }

        .diagram-node-delete,
        .diagram-node-add {
          position: absolute;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 900;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.22);
        }

        .diagram-node-delete {
          top: -8px;
          right: -8px;
          background: #ffffff;
          color: #ef4444;
        }

        .diagram-node-add {
          right: -10px;
          bottom: -10px;
          background: #ffffff;
          color: #6d28d9;
        }

        .diagram-toolbar {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 10px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(10px);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.2);
        }

        .diagram-tool-button {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 0;
          background: #ffffff;
          color: #6d28d9;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .diagram-tool-button:active {
          transform: translateY(1px);
        }

        .diagram-save-note {
          font-size: 11px;
          text-align: center;
          color: #ffffff;
          font-weight: 700;
        }

        .diagram-bottom {
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
        }

        .diagram-next-button {
          min-width: 112px;
          height: 42px;
          border: 0;
          border-radius: 999px;
          background: #ffffff;
          color: #6d28d9;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
        }

        .diagram-next-button:active {
          transform: translateY(1px);
        }

        @media (max-width: 860px) {
          .diagram-main-row {
            flex-direction: column;
            align-items: center;
          }

          .diagram-toolbar {
            flex-direction: row;
          }

          .diagram-task-topbar {
            align-items: flex-start;
            gap: 12px;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="diagram-task-shell">
        <div className="diagram-task-topbar">
          <h2 className="diagram-task-title">
            {config.title || "Creating a diagram"}
          </h2>

          <div className="diagram-task-steps">
            <span className="diagram-step-pill active">1</span>
            <span className="diagram-step-pill">2</span>
            <span className="diagram-step-pill">⛶</span>
          </div>
        </div>

        <div className="diagram-main-row">
          <div className="diagram-canvas-scroll">
            <div
              className="diagram-canvas-scale-box"
              style={{
                width: canvasWidth * zoom,
                height: canvasHeight * zoom,
              }}
            >
              <div
                className="diagram-canvas"
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  backgroundColor: canvasBackground,
                  transform: `scale(${zoom})`,
                }}
              >
                <svg
                  className="diagram-edge-layer"
                  viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                  preserveAspectRatio="none"
                >
                  {edges.map((edge) => {
                    const path = getEdgePath(edge);
                    if (!path) return null;

                    return (
                      <path
                        key={edge.id}
                        d={path}
                        fill="none"
                        stroke="rgba(255,255,255,0.72)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>

                {nodes.map((node) => {
                  const color = COLOR_MAP[node.color] || COLOR_MAP.purple;

                  return (
                    <div
                      key={node.id}
                      className="diagram-node"
                      onPointerDown={(event) => startDrag(event, node)}
                      style={{
                        left: node.x,
                        top: node.y,
                        background: color.bg,
                        borderColor: color.border,
                        color: color.text,
                      }}
                    >
                      {allowDelete && nodes.length > 1 && (
                        <button
                          type="button"
                          className="diagram-node-delete"
                          data-no-drag="true"
                          onClick={() => deleteNode(node.id)}
                          aria-label="Delete node"
                        >
                          ×
                        </button>
                      )}

                      <div
                        className="diagram-node-text"
                        data-no-drag="true"
                        contentEditable={allowEditText}
                        suppressContentEditableWarning
                        onInput={(event) =>
                          rememberNodeText(node.id, event.currentTarget.innerText)
                        }
                        onBlur={(event) =>
                          commitNodeText(node.id, event.currentTarget.innerText)
                        }
                      >
                        {node.text}
                      </div>

                      {allowAddChild && (
                        <button
                          type="button"
                          className="diagram-node-add"
                          data-no-drag="true"
                          onClick={() => addChild(node)}
                          aria-label="Add child node"
                        >
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {showToolbar && (
            <div className="diagram-toolbar">
              {showSave && (
                <>
                  <button
                    type="button"
                    className="diagram-tool-button"
                    onClick={handleSave}
                    title="Save"
                  >
                    ✓
                  </button>

                  {saved && <div className="diagram-save-note">Saved</div>}
                </>
              )}

              {showZoom && (
                <>
                  <button
                    type="button"
                    className="diagram-tool-button"
                    onClick={() =>
                      setZoom((current) => clamp(current + 0.1, 0.6, 1.6))
                    }
                    title="Zoom in"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    className="diagram-tool-button"
                    onClick={() =>
                      setZoom((current) => clamp(current - 0.1, 0.6, 1.6))
                    }
                    title="Zoom out"
                  >
                    −
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {showNextButton && (
          <div className="diagram-bottom">
            <button
              type="button"
              className="diagram-next-button"
              onClick={handleNext}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}