import React from "react";
import { Handle, Position } from "reactflow";

export default function HorizontalNode({ data }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 8,
        border: "2px solid #6FB3B8",
        background: "#C2EDCE",
        width: 180,
        textAlign: "left",
        fontSize: "12px"
      }}
    >
      {/* LEFT HANDLE (input) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />

      {/* NODE CONTENT */}
      {data.label}

      {/* RIGHT HANDLE (output) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />
    </div>
  );
}
