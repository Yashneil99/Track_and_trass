import React, { useEffect } from "react";
import { ReactFlowProvider, useReactFlow } from "reactflow";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
} from "reactflow";
import HorizontalNode from "./horizontalNode";
import { AnimatedArrowEdge } from "./animatedArrowEdge"; // <-- NEW IMPORT

import "reactflow/dist/style.css";
import "./flow.css";

function FlowContent({ movement, selectedMaterial }) {
  const theme = {
    darkTeal: "#388087",
    mediumTeal: "#6FB3B8",
    lightBlue: "#BADFE7",
    mintGreen: "#C2EDCE",
    offWhite: "#F6F6F2",
  };

  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const reactFlowInstance = useReactFlow();

  // REGISTER CUSTOM NODE & EDGE TYPES
  const nodeTypes = { horizontal: HorizontalNode };
  const edgeTypes = { animatedArrow: AnimatedArrowEdge };

  useEffect(() => {
    if (!movement || movement.length === 0) return;

    const NODES_PER_ROW = 5;
    const COL_GAP = 260;
    const ROW_GAP = 180;

    // ------------------ NODES ------------------
    const dynamicNodes = movement.map((step, index) => {
      const row = Math.floor(index / NODES_PER_ROW);
      const col = index % NODES_PER_ROW;

      return {
        id: `node-${index}`,
        type: "horizontal",
        data: {
          label: (
            <div style={{ fontSize: "12px", padding: "8px" }}>
              <strong>Location:</strong> {step.to_location || "null"} <br />
              <strong>Quantity:</strong> {step.quantity || "null"} <br />
              <strong>Arrived At:</strong>{" "}
              {step.arrived_at
                ? new Date(step.arrived_at).toLocaleString()
                : "NA"}
              <br />
              <strong>Hours Spent:</strong>{" "}
              {step.hours_spent_here != null
                ? Number(step.hours_spent_here).toFixed(2)
                : "NA"}
            </div>
          ),
        },
        position: { x: col * COL_GAP, y: row * ROW_GAP + 90 },
      };
    });

    // ------------------ EDGES ------------------
    const dynamicEdges = movement
      .map((_, index) => {
        if (index === 0) return null;

        const prev = index - 1;
        const prevRow = Math.floor(prev / NODES_PER_ROW);
        const currRow = Math.floor(index / NODES_PER_ROW);

        // SAME ROW → straight edge
        if (prevRow === currRow) {
          return {
            id: `edge-${index}`,
            source: `node-${prev}`,
            target: `node-${index}`,
            animated: true,
            type: "straight",
            style: { stroke: theme.darkTeal, strokeWidth: 2 },
            sourcePosition: "right",
            targetPosition: "left",
          };
        }

        // NEXT ROW → curved & animated arrow
        const firstNodeOfNextRow = currRow * NODES_PER_ROW;

        return {
          id: `edge-row-${index}`,
          source: `node-${prev}`,
          target: `node-${firstNodeOfNextRow}`,
          animated: true,
          type: "animatedArrow",  // <-- CUSTOM ANIMATED ARROW EDGE
          style: { stroke: theme.mediumTeal, strokeWidth: 2 },
          sourcePosition: "bottom",
          targetPosition: "top",
          curvature: 0.7,
        };
      })
      .filter(Boolean);

    setNodes(dynamicNodes);
    setEdges(dynamicEdges);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.3 });
    }, 150);
  }, [movement]);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title */}
      <div
        style={{
          padding: "10px 20px",
          fontSize: "18px",
          fontWeight: "bold",
          color: "#388087",
          textAlign: "center",
        }}
      >
        Material Routing History of{" "}
        <span style={{ color: "#6FB3B8" }}>{selectedMaterial}</span>
      </div>

      <div style={{ flex: 1, height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes} // <-- REGISTER EDGE TYPES
          fitView
        >
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function DynamicFlow({ movement, selectedMaterial }) {
  return (
    <ReactFlowProvider>
      <FlowContent movement={movement} selectedMaterial={selectedMaterial} />
    </ReactFlowProvider>
  );
}
