import React from "react";
import { BaseEdge, getSmoothStepPath } from "@xyflow/react";

export function AnimatedArrowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Main Edge Line */}
      <BaseEdge id={id} path={edgePath} />

      {/* Moving Arrow Along Path */}
      <g>
        <path
          id={`arrow-${id}`}
          d="M -6 -4 L 0 0 L -6 4 Z"
          fill="#000000ff"
        />
        <animateMotion
          dur="2.5s"
          repeatCount="indefinite"
          rotate="auto"
          path={edgePath}
        />
      </g>
    </>
  );
}
