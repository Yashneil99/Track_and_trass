import React, { useEffect, useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Autocomplete, TextField, Box } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchAverageOfAllMovementTime,
  fetchAverageOfMovementTimePerRoute,
} from "../../features/materialMovement/materialMovementSlice";

export default function AverageMovementTime({ material }) {
  const dispatch = useDispatch();

  const { data: materialMovement, avgTimePerRoute = [] } = useSelector(
    (state) => state.materialMovement || {}
  );

  const [selectedMaterial, setSelectedMaterial] = useState({
    code: "RFID0001",
    name : "RFID0001_2518122725",
    displayName: "RFID0001_2518122725 - RFID0001",
  });

  useEffect(() => {
    if (selectedMaterial?.code) {
      dispatch(fetchAverageOfAllMovementTime({ code: selectedMaterial.name }));
      dispatch(
        fetchAverageOfMovementTimePerRoute({ code: selectedMaterial.name })
      );
    }
  }, [selectedMaterial]);

  const materialOptions = (material || []).map((mat) => ({
    ...mat,
    displayName: `${mat.name} - ${mat.code}`,
    group: mat.name,
  }));

  // Inner pie data (hours/minutes/seconds)
  const chartData = useMemo(() => {
    if (!materialMovement) return [];
    return materialMovement.map((row) => {
      const hours = row.avg_time_taken?.hours || 0;
      const minutes = row.avg_time_taken?.minutes || 0;

      const labelParts = [];
      if (hours) labelParts.push(`${hours} hr`);
      if (minutes) labelParts.push(`${minutes} min`);

      return {
        value: hours * 3600 + minutes * 60,
        name: labelParts.join(" "),
      };
    });
  }, [materialMovement]);

  const pieData = useMemo(() => {
    if (!avgTimePerRoute?.length) return [];
    return avgTimePerRoute.map((d) => {
      const hours = d.avg_time_taken?.hours || 0;
      const minutes = d.avg_time_taken?.minutes || 0;

      const labelParts = [];
      if (hours) labelParts.push(`${hours} hr`);
      if (minutes) labelParts.push(`${minutes} min`);
      const formattedTime = labelParts.join(" ");
      return {
        value: hours * 3600 + minutes * 60,
        name: `${d.from_location} → ${d.to_location} (${formattedTime})`,
      };
    });
  }, [avgTimePerRoute]);

  // Combined nested pie chart option
  // const nestedPieOption = {
  //   title: {
  //     text: "Average Movement Time Per Route",
  //     left: "center",
  //   },
  //   tooltip: {
  //     trigger: "item",
  //     formatter: "{a} <br/>{b}: {c} ({d}%)",
  //   },
  //   legend: {
  //     orient: "vertical",
  //     left: "left",
  //   },
  //   series: [
  //     {
  //       name: "Overall Avg Time",
  //       type: "pie",
  //       selectedMode: "single",
  //       radius: [0, "40%"],
  //       label: {
  //         show: false,
  //       },
  //       labelLine: {
  //         show: false,
  //       },
  //       data: chartData,
  //     },
  //     {
  //       name: "Per Route Avg Time",
  //       type: "pie",
  //       radius: ["50%", "70%"],
  //       labelLine: {
  //         length: 20,
  //       },
  //       label: {
  //         show: false,
  //       },
  //       data: pieData,
  //     },
  //   ],
  // };
  const nestedPieOption = useMemo(() => {
    return {
      title: {
        text: "Average Movement Time Per Route",
        left: "center",
      },
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b}:  ({d}%)",
      },
      legend: {
        orient: "vertical",
        left: "left",
      },
      series: [
        {
          name: "Overall Avg Time",
          type: "pie",
          selectedMode: "single",
          radius: [0, "40%"],
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          data: chartData,
        },
        {
          name: "Per Route Avg Time",
          type: "pie",
          radius: ["50%", "70%"],
          labelLine: {
            length: 20,
          },
          label: {
            show: false,
          },
          data: pieData,
        },
      ],
    };
  }, [chartData, pieData]);
  return (
    <div
      className="chart-card"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >

      <div
        className="chart-header"
        style={{
          display: "flex",
          gap: 20,
          justifyContent: "center",
          width: "100%",
        }}
      >
        <h3 style={{ flexGrow: 1, textAlign: "center" }}>
          Average Material Movement Time
        </h3>
        <Box sx={{ width: 250 }}>
          <Autocomplete
            options={materialOptions}
            groupBy={(option) => option.group}
            getOptionLabel={(option) => option.displayName}
            value={selectedMaterial}
            onChange={(e, val) => setSelectedMaterial(val)}
            renderInput={(params) => (
              <TextField {...params} label="Select Material" size="small" />
            )}
          />
        </Box>
      </div>

      <div style={{ width: "100%", marginTop: 20 }}>
        <ReactECharts
          option={nestedPieOption}
          style={{ width: "100%", height: 500 }}
        />
      </div>
    </div>
  );
}
