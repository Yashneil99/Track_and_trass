import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactECharts from "echarts-for-react";
import { fetchAllMaterialPresenceAtLocationSpecificDate } from "../../features/materialMovement/materialMovementSlice";

export default function MaterialFlowBarNegative() {
  const dispatch = useDispatch();
  const { presenceAllMaterialLocationnSpecicDate } = useSelector(
    (state) => state.materialMovement
  );

  const date = new Date();
  const defaultDate = date.toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  useEffect(() => {
    dispatch(fetchAllMaterialPresenceAtLocationSpecificDate(selectedDate));
  }, [selectedDate]);

  const chartData = useMemo(() => {
    if (!presenceAllMaterialLocationnSpecicDate)
      return { categories: [], inData: [], outData: [], netData: [] };

    const categories = [];
    const inData = [];
    const outData = [];
    const netData = [];

    presenceAllMaterialLocationnSpecicDate.forEach((item) => {
      const { location, material, total_in, total_out, net_quantity } = item;
  
      categories.push(`${location} - ${material}`);

      inData.push(Number(total_in));
      outData.push(Number(total_out));
      netData.push(Number(net_quantity));
    });

    return { categories, inData, outData, netData };
  }, [presenceAllMaterialLocationnSpecicDate]);

// const option = {
 
//   tooltip: {
//     trigger: "axis",
//     axisPointer: { type: "shadow" },
//     formatter: (params) => {
//       let tooltip = `<b>${params[0].name}</b><br/>`;
//       params.forEach((p) => {
//         tooltip += `${p.seriesName}: ${p.value}<br/>`;
//       });
//       return tooltip;
//     },
//   },
//   legend: {
//     data: ["Total In", "Total Out", "Net Quantity"],
//     top: 30,
//   },
//   grid: {
//     top: 80,
//     bottom: 80, 
//     left: 120,
//   },
//   xAxis: {
//     type: "value",
//     position: "top",
//     splitLine: { lineStyle: { type: "dashed" } },
//   },
//   yAxis: {
//     type: "category",
//     data: chartData.categories,
//     axisLine: { show: false },
//     axisTick: { show: false },
//     splitLine: { show: false },
//     axisLabel: {
//       show: true,
//       formatter: function (value) {
//         const maxLength = 25;
//         if (value.length > maxLength) {
//           const regex = new RegExp(`.{1,${maxLength}}`, "g");
//           return value.match(regex).join("\n");
//         }
//         return value;
//       },
//     },
//   },
//   // 👇 Add scrollbar here
//   dataZoom: [
//     {
//       type: "slider",
//       orient: "vertical", 
//       yAxisIndex: 0,
//       start: 0,
//       end: 100, 
//     },
//     {
//       type: "inside",
//       orient: "vertical",
//       yAxisIndex: 0,
//     },
//   ],
//   series: [
//     {
//       name: "Total In",
//       type: "bar",
//       label: { show: true },
//       data: chartData.inData,
//       itemStyle: { color: "#4caf50" },
//       barWidth: 25,
//     },
//     {
//       name: "Total Out",
//       type: "bar",
//       label: { show: true },
//       data: chartData.outData.map((v) => -v),
//       itemStyle: { color: "#f44336" },
//       barWidth: 25,
//     },
//     {
//       name: "Net Quantity",
//       type: "bar",
//       label: { show: true },
//       data: chartData.netData,
//       itemStyle: { color: "#2196f3" },
//       barWidth: 25,
//     },
//   ],
// };
 const option = useMemo(() => {
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          let tooltip = `<b>${params[0].name}</b><br/>`;
          params.forEach((p) => {
            tooltip += `${p.seriesName}: ${p.value}<br/>`;
          });
          return tooltip;
        },
      },
      legend: {
        data: ["Total In", "Total Out", "Net Quantity"],
        top: 30,
      },
      grid: {
        top: 80,
        bottom: 80,
        left: 120,
      },
      xAxis: {
        type: "value",
        position: "top",
        splitLine: { lineStyle: { type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: chartData.categories,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: true,
          formatter: function (value) {
            const maxLength = 25;
            if (value.length > maxLength) {
              const regex = new RegExp(`.{1,${maxLength}}`, "g");
              return value.match(regex).join("\n");
            }
            return value;
          },
        },
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
          label: { show: true },
          data: chartData.inData,
          itemStyle: { color: "#4caf50" },
          barWidth: 25,
        },
        {
          name: "Total Out",
          type: "bar",
          label: { show: true },
          data: chartData.outData.map((v) => -v),
          itemStyle: { color: "#f44336" },
          barWidth: 25,
        },
        {
          name: "Net Quantity",
          type: "bar",
          label: { show: true },
          data: chartData.netData,
          itemStyle: { color: "#2196f3" },
          barWidth: 25,
        },
      ],
    };
  }, [chartData]); 
  return (
    <div className="chart-card" style={{ width: "100%" }}>
      <div className="chart-header">
        <h3>Material Presence All Location</h3>
        <input
          type="date"
          className="calendar-input"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        />
      </div>

      <ReactECharts option={option} style={{ height: 650, width: "100%" }} />
    </div>
  );
}
