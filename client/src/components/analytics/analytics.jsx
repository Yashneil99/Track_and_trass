import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector, } from "react-redux";
import { fetchMaterials } from "../../features/material/materialSlice";
import { fetchAllLocation } from "../../features/location/locationSlice";
import Chart1 from "./chart1";
import GetMaterialLocationToday from "./materialLocationToday";
import GetAverageoMovement from "./averageMovementTime";
import GetMaterialPresenceAtLocationSpecificDate from "./materialPresenceAtLocationSpecificDate";
import "./analytics.css";
import BinOccupancy from "./binOccupancy";
import BinActiveDistribution from "./binActiveDistribution";
import { io } from 'socket.io-client';
import Report from "./report";


export default function Analytics() {
  const dispatch = useDispatch();
  const { data: material } = useSelector((state) => state.material);
  const { list: locations } = useSelector((state) => state.location);
 

  useEffect(() => {
    if (!material || material.length === 0) {
      dispatch(fetchMaterials());
    }
    if (!locations || locations.length === 0) {
      dispatch(fetchAllLocation());
    }
  }, []);

  return (
    <div className="analytics-container">

      {/* <div className="FullRow">
        <Chart1 material={material} location={locations} />
      </div> */}

      {/* <div className="FullRow">
        <GetMaterialLocationToday material={material}   />
      </div> */}

      <div className="FullRow">
        {/* <GetAverageoMovement material={material}  /> */}
        <BinOccupancy />
      </div>

      <div className="FullRow">
        <BinActiveDistribution />
      </div>

         <div className="FullRow">
        <Report />
      </div>

      {/* <div className="FullRow">
        <GetMaterialPresenceAtLocationSpecificDate material={material}  />
      </div> */}
    </div>
  );
};
