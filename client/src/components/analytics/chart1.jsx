import React, { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Autocomplete, TextField, Box, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllMaterials } from "../../features/material/materialSlice";
import { fetchAllLocation } from "../../features/location/locationSlice";
import { getMaterialMovementOverTime } from "../../features/materialMovement/materialMovementService";
import { fetchMaterialMovementOverTime } from "../../features/materialMovement/materialMovementSlice";
const theme = {
  darkTeal: "#388087",
  mediumTeal: "#6FB3B8",
  lightBlue: "#BADFE7",
};

export default function Chart1Area({material , location}) {
  const dispatch = useDispatch();
  const [selectedMaterial, setSelectedMaterial] = useState({  code: "RFID0001",
    displayName: "RFID0001_2518122725 - RFID0001", });
  const [selectedFrom, setSelectedFrom] = useState({ code: "hul_1f_bin_1", displayName: "BIN F1 001 - hul_1f_bin_1" });
  const [selectedTo, setSelectedTo] = useState({ code: "hul_1f_bin_2", displayName: "BIN F1 002 - hul_1f_bin_2" });
  const [chartData, setChartData] = useState([]);

  const flattenMaterials = (materials) =>
    materials.map((mat) => ({
      ...mat,
      displayName: `${mat.name} - ${mat.code}`,
      group: mat.name,
      isParent: false,
    }));
  const materialOptions = flattenMaterials(material || []);

  const flattenLocations = (locations) => {
    const final = [];
    locations.forEach((loc) => {
      if (Array.isArray(loc.layout?.children)) {
        loc.layout.children.forEach((child) => {
          final.push({
            ...child,
            parent: loc.name,
            group: loc.name,
            displayName: `${child.name} - ${child.code}`,
            isParent: false,
          });
        });
      } else {
        final.push({
          ...loc,
          parent: null,
          group: loc.name,
          displayName: `${loc.name} - ${loc.code}`,
          isParent: true,
        });
      }
    });
    return final;
  };

  const locationOptions = flattenLocations(location || []);

  useEffect(() => {
    if (!selectedMaterial || !selectedFrom || !selectedTo) return;

    const fetchMovement = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await getMaterialMovementOverTime(
          selectedMaterial.code,
          selectedFrom.code,
          selectedTo.code,
          token
        );

        const formatted = (res.data || []).map((row) => ({
          date: row.day,
          total_quantity: Number(row.total_quantity || 0),
          movement_count: Number(row.movement_count || 0),
        }));

        setChartData(formatted);
      } catch (err) {
        console.error("❌ Error fetching movement:", err);
      }
    };

    fetchMovement();
  }, [selectedMaterial, selectedFrom, selectedTo]);

  return (
    <div className="chart-card">
       <h3 style={{ flexGrow: 1 }}>Material Movement Over Time</h3>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <Box sx={{ width: 250 }}>
          <Autocomplete
            options={materialOptions}
            groupBy={(option) => option.group}
            getOptionLabel={(option) => option.displayName || ""}
            value={selectedMaterial}
            onChange={(e, value) => setSelectedMaterial(value)}
            renderInput={(params) => (
              <TextField {...params} label="Material" size="small" />
            )}
          />
        </Box>
        <Box sx={{ width: 250 }}>
          <Autocomplete
            options={locationOptions}
            groupBy={(option) => option.group}
            getOptionLabel={(option) => option.displayName || ""}
            value={selectedFrom}
            onChange={(e, value) => setSelectedFrom(value)}
            renderGroup={(params) => (
              <li key={params.key}>
                <Typography sx={{ fontWeight: "bold", mt: 1 }}>
                  {params.group}
                </Typography>
                <ul style={{ paddingLeft: 20 }}>{params.children}</ul>
              </li>
            )}
            renderOption={(props, option) => (
              <li {...props} style={{ paddingLeft: option.isParent ? 0 : 20 }}>
                {option.displayName}
              </li>
            )}
            renderInput={(params) => (
              <TextField {...params} label="From Location" size="small" />
            )}
          />
        </Box>
        <Box sx={{ width: 250 }}>
          <Autocomplete
            options={locationOptions}
            groupBy={(option) => option.group}
            getOptionLabel={(option) => option.displayName || ""}
            value={selectedTo}
            onChange={(e, value) => setSelectedTo(value)}
            renderGroup={(params) => (
              <li key={params.key}>
                <Typography sx={{ fontWeight: "bold", mt: 1 }}>
                  {params.group}
                </Typography>
                <ul style={{ paddingLeft: 20 }}>{params.children}</ul>
              </li>
            )}
            renderOption={(props, option) => (
              <li {...props} style={{ paddingLeft: option.isParent ? 0 : 20 }}>
                {option.displayName}
              </li>
            )}
            renderInput={(params) => (
              <TextField {...params} label="To Location" size="small" />
            )}
          />
        </Box>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.lightBlue} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={theme.darkTeal} />
          <YAxis stroke={theme.darkTeal} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="total_quantity"
            barSize={20}
            fill={theme.mediumTeal}
            name="Total Quantity"
          />
          <Line
            type="monotone"
            dataKey="movement_count"
            stroke={theme.darkTeal}
            strokeWidth={3}
            name="Movement Count"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
