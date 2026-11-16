import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllCurrentMaterialPresenceAtAllLocations } from "../../features/materialMovement/materialMovementSlice";
import WareHouseDashboard from "./warehouseDashboard";

const Dashboard = () => {
    const dispatch = useDispatch();
    const { data: rows } = useSelector((state) => state.materialMovement);

    useEffect(() => {
        dispatch(fetchAllCurrentMaterialPresenceAtAllLocations());
    }, [dispatch]);

    if (!rows || rows.length === 0) return <div>Loading...</div>;

    return (
        <div>
            <WareHouseDashboard locations={rows} />
        </div>
    );
};

export default Dashboard;
