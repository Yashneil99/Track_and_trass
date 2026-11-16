import { useEffect, useState } from "react";
import "./dashboard.css";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllCurrentMaterialPresenceAtAllLocations, fetchMaterialMovement } from "../../features/materialMovement/materialMovementSlice";
import WarehouseDashboard from "./warehouse";
import { fetchMaterials } from "../../features/material/materialSlice";
import { fetchAllLocation } from "../../features/location/locationSlice";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import DoneIcon from '@mui/icons-material/Done';
import { Box, Typography, Card, CardContent } from "@mui/material";

export default function Dashboard() {
  const [activeButton, setActiveButton] = useState("Yesterday");
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAllCurrentMaterialPresenceAtAllLocations());  
    dispatch(fetchMaterialMovement()); 
  }, [dispatch]);

  const { presenceAll: rows, movements } = useSelector((state) => state.materialMovement);
  const { data: material } = useSelector((state) => state.material);
  const { list: locations } = useSelector((state) => state.location);

  const inTransitCount = movements.filter(row => row.status === "In Transit").length;
  const movedCount = movements.filter(row => row.status === "Moved").length;

  useEffect(() => {
    if (!material || material.length === 0) {
      dispatch(fetchMaterials());
    }
    if (!locations || locations.length === 0) {
      dispatch(fetchAllLocation());
    }
  }, []);

  return (
    <div className="container">
      <div className="left-section">
        
        {/* Section 1 */}
        <Box className="fade-in-up section-1">
          <Typography variant="h5" fontWeight="700">
            Dashboard
          </Typography>
        </Box>

        {/* Section 2 */}
        <p className="text-sm text-gray-500 mt-1 fade-in-up section-2">
          Real-time Material Tracking System
        </p>

        {/* Section 3 - Stats Cards */}
        <Box className="stats-grids fade-in-up section-3">
          <Card className="stats-cards">
            <CardContent className="stats-contents orange-borders">
              <Box>
                <Typography variant="body2">Total Movements</Typography>
                <Typography variant="h4" fontWeight="600" color="#000000">
                  {movements?.length || 0}
                </Typography>
              </Box>
              <Box className="icon-boxs icon-oranges">
                <Inventory2Icon sx={{ color: "#f97316" }} />
              </Box>
            </CardContent>
          </Card>

          <Card className="stats-cards">
            <CardContent className="stats-contents green-borders">
              <Box>
                <Typography variant="body2">Completed</Typography>
                <Typography variant="h4" fontWeight="600" color="#000000">
                  {movedCount}
                </Typography>
              </Box>
              <Box className="icon-boxs icon-greens">
                <DoneIcon sx={{ color: "#16a34a" }} />
              </Box>
            </CardContent>
          </Card>

          <Card className="stats-cards">
            <CardContent className="stats-contents violet-borders">
              <Box>
                <Typography variant="body2">Current Movement</Typography>
                <Typography variant="h4" fontWeight="600" color="#000000">
                  {inTransitCount}
                </Typography>
              </Box>
              <Box className="icon-boxs icon-violets">
                <LocalShippingIcon sx={{ color: "#A32BFB" }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Section 4 - Buttons */}
        <div className="left-side fade-in-up section-4">
          <div id="grad1">
            <div className="text-column">
              <span className="text-title">Total Material</span>
              <span className="text-number">{material?.length || 0}</span>
            </div>
            {/* <div className="button-group">
              <button
                className={activeButton === "Yesterday" ? "active" : ""}
                onClick={() => setActiveButton("Yesterday")}
              >
                Yesterday
              </button>
              <button
                className={activeButton === "Today" ? "active" : ""}
                onClick={() => setActiveButton("Today")}
              >
                Today
              </button>
            </div> */}
          </div>
        </div>

        {/* Section 5 - Warehouse */}
        <div className="locations-wrapper fade-in-up section-5">
          <WarehouseDashboard locations={rows} />
        </div>
      </div>
    </div>
  );
}
