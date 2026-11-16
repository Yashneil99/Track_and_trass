import { Box, Card, CardContent, Typography } from "@mui/material";
import { FloorCard } from "./floorCard";

const TYPE_COLORS = {
  campus: "#E3F2FD",
  building: "#E8EAF6",
  floor: "#F3E5F5",
  Warehouse: "#FFF3E0",
  Production: "#F1F8E9",
};


export function FloorPlan({ node, currentCode, previousCode, handleClick }) {
  if (!node) return null;

  const isLeaf = !node.children || node.children.length === 0;

  if (isLeaf)
    return (
      <FloorCard
        node={node}
        currentCode={currentCode}
        previousCode={previousCode}
        handleClick={handleClick}
      />
    );

  let layout = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  };

  if (node.stack === "vertical stack")
    layout = { display: "flex", flexDirection: "column", gap: "12px" };

  if (node.stack === "horizontal stack")
    layout = { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "12px" };

  if (node.stack === "grid") {
    const total = node.children.length;
    const cols = Math.ceil(Math.sqrt(total));
    layout = {
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: "12px",
    };
  }

  return (
    <Box sx={{ border: "1px solid #DDD", borderRadius: 0 }}>
      <Card
        sx={{
          p: 2,
          backgroundColor: TYPE_COLORS[node.type] || "#FFF",
          boxShadow:
            node.parent_id !== null
              ? "0px 3px 12px rgba(0,0,0,0.15)"
              : "none",
        }}
      >
        <Typography fontWeight={700}>{node.name}</Typography>
        <Typography variant="caption">
          {node.type} {node.stack && `• ${node.stack}`}
        </Typography>

        <CardContent sx={{ mt: 2, ...layout }}>
          {node.children.map((child) => (
            <Box key={child.code} sx={{ flex: 1, minWidth: 0 }}>
              <FloorPlan
                node={child}
                currentCode={currentCode}
                previousCode={previousCode}
                handleClick={handleClick}
              />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
