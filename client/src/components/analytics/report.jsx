import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMaterialPresenceFromToDate } from "../../features/materialMovement/materialMovementSlice";
import "./report.css";
import { downloadConsolidatedReport } from "../../utils/buildConsolidatedReport";

const Report = () => {
  const dispatch = useDispatch();

  const [dates, setDates] = useState(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = new Date();
    return {
      // Default range: start of the current month → today
      fromDate: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
      toDate: fmt(today),
    };
  });

  const [filters, setFilters] = useState({
    inwardGarden: "",
    inwardInvNo: "",
    outwardGarden: "",
    outwardInvNo: "",
  });

  const { loading, presenceFromToDate } = useSelector(
    (state) => state.materialMovement,
  );

  const handleGenerate = () => {
    dispatch(
      fetchMaterialPresenceFromToDate({
        fromDate: dates.fromDate,
        toDate: dates.toDate,
      }),
    );
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  const inward =
    presenceFromToDate?.filter(
      (item) =>
        item?.purpose === "Material Inward" || item?.purpose === "Material In",
    ) || [];

  const outward =
    presenceFromToDate?.filter(
      (item) =>
        item?.purpose === "Material Outward" ||
        item?.purpose === "Material Out",
    ) || [];

  // FILTERED DATA
  const filteredInward = inward.filter((item) => {
    return (
      item?.attributes?.Garden?.toLowerCase().includes(
        filters.inwardGarden.toLowerCase(),
      ) &&
      item?.attributes?.["Garden Inv No"]
        ?.toLowerCase()
        .includes(filters.inwardInvNo.toLowerCase())
    );
  });

  const filteredOutward = outward.filter((item) => {
    return (
      item?.attributes?.Garden?.toLowerCase().includes(
        filters.outwardGarden.toLowerCase(),
      ) &&
      item?.attributes?.["Garden Inv No"]
        ?.toLowerCase()
        .includes(filters.outwardInvNo.toLowerCase())
    );
  });

  const handleDownload = async () => {
    try {
      await downloadConsolidatedReport({
        inward: filteredInward,
        outward: filteredOutward,
        fromDate: dates.fromDate,
        toDate: dates.toDate,
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Sorry, the report could not be generated. Please try again.");
    }
  };

  return (
    <div className="report-page">
      <div className="report-header">
        <div>
          <h2>Reports</h2>
        </div>
      </div>

      <div className="date-filter-bar">
        <div className="date-group">
          <label>From Date</label>
          <input
            type="date"
            value={dates.fromDate}
            onChange={(e) => setDates({ ...dates, fromDate: e.target.value })}
          />
        </div>

        <div className="date-group">
          <label>To Date</label>
          <input
            type="date"
            value={dates.toDate}
            onChange={(e) => setDates({ ...dates, toDate: e.target.value })}
          />
        </div>

        <button className="generate-btn" onClick={handleGenerate}>
          Generate Report
        </button>
        <button className="download-btn" onClick={handleDownload}>
          Download Excel
        </button>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <p>Inward Count</p>
          <h3>{inward.length}</h3>
        </div>

        <div className="kpi-card">
          <p>Outward Count</p>
          <h3>{outward.length}</h3>
        </div>
      </div>

      {/* GRID */}
      <div className="movement-grid">
        {/* INWARD */}
        <div className="movement-card">
          <div className="card-title">
            <h3>Material Inward</h3>
            <span className="badge green">{filteredInward.length}</span>
          </div>

          {/* FILTERS */}
          <div className="table-filters">
            <input
              type="text"
              placeholder="Filter Garden"
              value={filters.inwardGarden}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  inwardGarden: e.target.value,
                })
              }
            />

            <input
              type="text"
              placeholder="Filter Inv No"
              value={filters.inwardInvNo}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  inwardInvNo: e.target.value,
                })
              }
            />
          </div>

          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  {/* <th>Code</th> */}
                  <th>Garden</th>
                  <th>Garden Inv No</th>
                  <th>Grade</th>
                  <th>No. of Bags</th>
                  <th>Net Weight</th>
                  <th>Tare Weight</th>
                  <th>Gross Weight</th>
                  <th>Location</th>
                  <th>Purpose</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredInward.map((item, index) => (
                  <tr key={index}>
                    {/* <td>{item.code}</td> */}
                    <td>{item.attributes?.Garden}</td>
                    <td>{item.attributes?.["Garden Inv No"]}</td>
                    <td>{item.attributes?.Grade}</td>
                    <td>{item.attributes?.["No. of Bags"]}</td>
                    <td>{item.attributes?.["Net Weight"]}</td>
                    <td>{item.attributes?.["Tare Weight"]}</td>
                    <td>{item.attributes?.["Gross Weight"]}</td>
                    <td>{item.location}</td>
                    <td>{item.purpose}</td>
                    <td>{new Date(item.moved_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* OUTWARD */}
        <div className="movement-card">
          <div className="card-title">
            <h3>Material Outward</h3>
            <span className="badge red">{filteredOutward.length}</span>
          </div>

          {/* FILTERS */}
          <div className="table-filters">
            <input
              type="text"
              placeholder="Filter Garden"
              value={filters.outwardGarden}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  outwardGarden: e.target.value,
                })
              }
            />

            <input
              type="text"
              placeholder="Filter Inv No"
              value={filters.outwardInvNo}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  outwardInvNo: e.target.value,
                })
              }
            />
          </div>

          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  {/* <th>Code</th> */}
                  <th>Garden</th>
                  <th>Garden Inv No</th>
                  <th>Grade</th>
                  <th>No. of Bags</th>
                  <th>Net Weight</th>
                  <th>Tare Weight</th>
                  <th>Gross Weight</th>
                  <th>Location</th>
                  <th>Purpose</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredOutward.map((item, index) => (
                  <tr key={index}>
                    {/* <td>{item.code}</td> */}
                    <td>{item.attributes?.Garden}</td>
                    <td>{item.attributes?.["Garden Inv No"]}</td>
                    <td>{item.attributes?.Grade}</td>
                    <td>{item.attributes?.["No. of Bags"]}</td>
                    <td>{item.attributes?.["Net Weight"]}</td>
                    <td>{item.attributes?.["Tare Weight"]}</td>
                    <td>{item.attributes?.["Gross Weight"]}</td>
                    <td>{item.location}</td>
                    <td>{item.purpose}</td>
                    <td>{new Date(item.moved_at).toLocaleDateString("en-US", {
                      day: '2-digit',
                      month: "2-digit",
                      year: "2-digit",
                      "hour": '2-digit',
                      minute: "2-digit"
                    })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
