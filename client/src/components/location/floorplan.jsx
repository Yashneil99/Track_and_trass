import {
    Box,
    Card,
    Typography,
    CardContent
} from "@mui/material";
import { TYPE_COLORS } from "../constant/constants";
import { FloorCard } from "./floorcard";

export function FloorPlan({ locations }) {

    const renderFloorPlan = (node) => {
        let layout = {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
        };

        if (node.stack === "vertical stack")
            layout = { display: "flex", flexDirection: "column", gap: "8px" };

        if (node.stack === "horizontal stack")
            layout = { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "8px" };

        if (node.stack === "grid") {
            const total = node.children.length;
            const columns = Math.ceil(Math.sqrt(total));
            const rows = Math.ceil(total / columns);

            layout = {
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, auto)`,
                gap: "8px",
            };
        }

        return (
            <Card
                key={node.code}
                sx={{
                    backgroundColor: TYPE_COLORS[node.type],
                    border: "1px solid #E0E0E0",
                    boxShadow: "0px 3px 10px rgba(0,0,0,0.02)",
                    borderRadius: 2,
                    p: 2,
                    m: 1,
                }}
            >
                <Typography fontWeight={600}>{node.name}</Typography>
                <Typography variant="caption">
                    ({node.type}) {node.stack && `— ${node.stack}`}
                </Typography>

                <CardContent sx={{ mt: 1, ...layout }}>
                    {node.children?.map((child) => (
                        <Box key={child.code}>
                            {child.children?.length > 0 ? (
                                renderFloorPlan(child)
                            ) : (
                                <FloorCard node={child} />
                            )}

                        </Box>
                    ))}
                </CardContent>
            </Card>
        );
    };

    return <Box>{locations?.map((node) => renderFloorPlan(node))}</Box>;
}