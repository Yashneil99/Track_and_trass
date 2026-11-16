import {
    Box,
    Grid,
    List,
    Typography,
    Divider,
} from "@mui/material";
import { TreeView } from "./treeView";
import { RenderLocations } from "./ongoingMovements";
import { FloorPlan } from "./floorPlan";
import { useEffect, useState } from "react";
import { SelectedLocationMovement } from "./selectedLocationMovement";

export default function WarehouseDashboard({ locations = [] }) {   
    const [onGoing, setOnGoing] = useState(new Set());
    const [currentCode, setCurrentCode] = useState(null);
    const [previousCode, setPreviousCode] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);

    const handleClick = (material) => {
        setSelectedMaterial(material);

        setTimeout(() => {
            setSelectedMaterial(null);
        }, 5000);
    };

    useEffect(() => {
        const transitSet = new Set();
        let activeCurrent = null;
        let activePrevious = null;

        const findTransitNodes = (nodes) => {
            nodes.forEach((n) => {
                if (n.status === "In Transit") {
                    transitSet.add(n);
                    activeCurrent = n.code;
                    activePrevious = n.previous_location;
                }
                if (n.children) findTransitNodes(n.children);
            });
        };

        findTransitNodes(locations);
        setOnGoing(transitSet);
        setCurrentCode(activeCurrent);
        setPreviousCode(activePrevious);
    }, [locations]);

    console.log(locations, 'locs');

    return (
        <Grid
            container
            spacing={2}
            sx={{
                p: 2,
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                overflow: "hidden",
                justifyContent: "space-between",
            }}
        >
            <Grid item>
                <Box
                    sx={{
                        width: 350,
                        height: "86vh",
                        bgcolor: "#FFF",
                        border: "1px solid #DDD",
                        borderRadius: 2,
                        overflowY: "auto",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                >
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ p: 2, borderBottom: "1px solid #EEE", textAlign: "center" }}
                    >
                        Warehouse Structure
                    </Typography>

                    <List>
                        {locations.map((node) => (
                            <TreeView key={node.code} node={node} />
                        ))}
                    </List>
                </Box>
            </Grid>

            <Grid
                item
                xs
                sx={{
                    px: 2,
                    height: "86vh",
                    overflowY: "auto",
                    borderRadius: 2,
                    border: "1px solid #DDD",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    bgcolor: "#FFF",
                }}
            >
                <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ p: 2, borderBottom: "1px solid #EEE", textAlign: "center", mb: 1 }}
                >
                    Floor Plan
                </Typography>

                {locations.map((node) => (
                    <FloorPlan
                        key={node.code}
                        node={node}
                        currentCode={currentCode}
                        previousCode={previousCode}
                        handleClick={handleClick}
                    />
                ))}
            </Grid>
            <Grid item>
                <Box
                    sx={{
                        width: 350,
                        height: "86vh",
                        bgcolor: "#FFF",
                        borderRadius: 2,
                        border: "1px solid #DDD",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        overflowY: "auto",
                    }}
                >
                    <Box>
                        <SelectedLocationMovement material={selectedMaterial} />
                    </Box>
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ p: 2, borderBottom: "1px solid #EEE", textAlign: "center" }}
                    >
                        Ongoing Movements
                    </Typography>
                    <Box sx={{ p: 1.5 }}>
                        <RenderLocations nodes={Array.from(onGoing)} />
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
}