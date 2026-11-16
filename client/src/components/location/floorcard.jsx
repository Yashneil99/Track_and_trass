import { Card, Typography } from "@mui/material";

export const FloorCard = ({ node }) => {
        const isOccupied = !!node.material_code && node.quantity > 0;

        const STATUS_COLORS = {
            Moved: "#A5D6A7",
            "In Transit": "#FFF9C4",
            empty: "#FFEBEE",
        };

        const cardColor = isOccupied
            ? STATUS_COLORS[node.status] || "#C8E6C9"
            : STATUS_COLORS["empty"];

        return (
            <Card
                sx={{
                    p: 1,
                    cursor: isOccupied ? "pointer" : "default",
                    borderRadius: 2,
                    border: "1px solid #BDBDBD",
                    backgroundColor: cardColor,
                    transition: "0.2s",
                    position: "relative",
                    "&:hover": {
                        backgroundColor: isOccupied ? "#B2DDB3" : "#FFCDD2",
                    },
                }}
            >
                <Typography fontWeight={700}>{node.name}</Typography>
                <Typography variant="caption">{node.type}</Typography>
            </Card>
        );
    };