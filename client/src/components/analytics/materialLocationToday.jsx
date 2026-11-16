import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactECharts from "echarts-for-react";
import { fetchMaterialPresenceAtLocationToday } from "../../features/materialMovement/materialMovementSlice";
import { Autocomplete, TextField, Box } from "@mui/material";
export default function MaterialPresenceByRouteWeek({material}) {
  const dispatch = useDispatch();
  const { presenceToday } = useSelector((state) => state.materialMovement);

  // Default selected code
  const [selectedCode, setSelectedCode] = useState({
    code: "RFID0001",
    name : "RFID0001_2518122725",
    displayName: "RFID0001_2518122725 - RFID0001",
  });

  useEffect(() => {
    if (selectedCode?.code) {
      dispatch(
        fetchMaterialPresenceAtLocationToday({ code: selectedCode.name })
      );
    }
  }, [dispatch, selectedCode]);
  
  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      legend: {
        data: ["Total In", "Total Out", "Net Quantity"],
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: { type: "value" },
      yAxis: {
        type: "category",
        axisTick: { show: false },
        data: presenceToday.map((item) => item.location_code),
      },
      dataZoom: [
        {
          type: "slider",
          orient: "vertical",
          yAxisIndex: 0,
          start: 0,
          end: 100,
        },
        {
          type: "inside",
          orient: "vertical",
          yAxisIndex: 0,
        },
      ],
      series: [
        {
          name: "Total In",
          type: "bar",
          stack: "Total",
          label: { show: true },
          emphasis: { focus: "series" },
          data: presenceToday.map((item) => Number(item.total_in)),
          itemStyle: { color: "#4caf50" }, // green
        },
        {
          name: "Total Out",
          type: "bar",
          stack: "Total",
          label: { show: true },
          emphasis: { focus: "series" },
          data: presenceToday.map((item) => -Number(item.total_out)), // negative
          itemStyle: { color: "#f44336" }, // red
        },
        {
          name: "Net Quantity",
          type: "bar",
          label: { show: true, position: "inside" },
          emphasis: { focus: "series" },
          data: presenceToday.map((item) => Number(item.net_quantity)),
          itemStyle: { color: "#2196f3" }, // blue
        },
      ],
    }),
    [presenceToday]
  );
  const materialOptions = (material || []).map((mat) => ({
    ...mat,
    displayName: `${mat.name} - ${mat.code}`,
    group: mat.name,
  }));
  return (
    <Box className="chart-card" style={{ display: "flex", flexDirection: "column", alignItems: "center",
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#fff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        width: "100%",
      }}
    >
      {/* Header section */}
      <div className="chart-header" style={{ width: "100%", marginBottom: "16px" }}>
  {/* Centered heading */}
  <h2 style={{ display: "flex", justifyContent: "", marginTop: "12px"  }}>Material Presence Today</h2>

  {/* Keep Autocomplete as it is */}
  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
    <Autocomplete
      options={materialOptions}
      getOptionLabel={(option) => option.displayName}
      value={selectedCode}
      onChange={(event, newValue) => {
        if (newValue) setSelectedCode(newValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Material Code"
          variant="outlined"
        />
      )}
      sx={{ width: 300 }}
    />
  </div>
</div>

      {/* Chart body */}
      <div
        className="chart-body"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {presenceToday && presenceToday.length > 0 && (
          <ReactECharts
            option={option}
            style={{ height: 400, width: "100%" }}
          />
        )}
      </div>
    </Box>
  );
}
