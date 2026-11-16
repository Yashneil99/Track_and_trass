import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllCurrentMaterialPresenceAtAllLocations,
  fetchOccupancyDistribution,
} from "../../features/materialMovement/materialMovementSlice";

const BinActiveDistribution = () => {
  const dispatch = useDispatch();

  const { loading, occupancyDistribution } = useSelector(
    (state) => state.materialMovement,
  );

  useEffect(() => {
    dispatch(fetchOccupancyDistribution());
  }, [dispatch]);

  const bins =
    occupancyDistribution?.map((bin) => ({
      binName: bin.location_name,
      binCode: bin.location_code,
      capacity: Number(bin.total_capacity || 0),
      occupied: Number(bin.total_occupied_in_bin || 0),
      available: Number(bin.remaining_bin_capacity || 0),

      utilization:
        Number(bin.total_capacity || 0) > 0
          ? (Number(bin.total_occupied_in_bin || 0) /
              Number(bin.total_capacity || 1)) *
            100
          : 0,

      materials: (bin.occupied_materials || []).map((mat) => ({
        name: mat.name,
        code: mat.code,
        status: mat.status,
        placedAt: mat.placed_at,
        attributes: mat.attributes || {},
      })),
    })) || [];

  // ===== SORT BINS IN SEQUENCE =====
  const sortedBins = [...bins].sort((a, b) => {
    const getParts = (name) => {
      // Matches: BIN F1 001
      const match = name.match(/F(\d+)\s*(\d+)/i);

      if (!match) {
        return {
          floor: 999,
          bin: 999,
        };
      }

      return {
        floor: Number(match[1]),
        bin: Number(match[2]),
      };
    };

    const aParts = getParts(a.binName);
    const bParts = getParts(b.binName);

    if (aParts.floor !== bParts.floor) {
      return aParts.floor - bParts.floor;
    }

    return aParts.bin - bParts.bin;
  });

  if (loading) {
    return (
      <div style={styles.centerText}>Loading warehouse tracking data...</div>
    );
  }

  if (!occupancyDistribution || occupancyDistribution.length === 0) {
    return <div style={styles.centerText}>No warehouse data available.</div>;
  }

  const overallOccupied = sortedBins.reduce(
    (acc, bin) => acc + bin.occupied,
    0,
  );

  const overallCapacity = sortedBins.reduce(
    (acc, bin) => acc + bin.capacity,
    0,
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Warehouse Bin Metrics</h3>

        <p style={styles.subtitle}>
          Global Load: {overallOccupied.toLocaleString()} /{" "}
          {overallCapacity.toLocaleString()} Units Capacity
        </p>
      </div>

      {/* Bin Cards */}
      <div style={styles.grid}>
        {sortedBins.map((bin, index) => (
          <div key={index} style={styles.binCard}>
            {/* Card Header */}
            <div style={styles.binHeader}>
              <div>
                <div style={styles.binName}>{bin.binName}</div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginTop: "2px",
                  }}
                >
                  {bin.binCode}
                </div>
              </div>

              <span
                style={{
                  ...styles.badge,
                  backgroundColor:
                    bin.utilization > 90
                      ? "#FEE2E2"
                      : bin.utilization === 0
                        ? "#F1F5F9"
                        : "#ECFDF5",

                  color:
                    bin.utilization > 90
                      ? "#EF4444"
                      : bin.utilization === 0
                        ? "#64748B"
                        : "#10B981",
                }}
              >
                {bin.utilization.toFixed(0)}% Used
              </span>
            </div>

            {/* Metrics */}
            <div style={styles.metricRow}>
              <div>
                <div style={styles.metricValue}>{bin.capacity}</div>

                <div style={styles.metricLabel}>Max Capacity</div>
              </div>

              <div>
                <div
                  style={{
                    ...styles.metricValue,
                    color: "#4F46E5",
                  }}
                >
                  {bin.occupied}
                </div>

                <div style={styles.metricLabel}>Occupied</div>
              </div>

              <div>
                <div
                  style={{
                    ...styles.metricValue,
                    color: "#64748B",
                  }}
                >
                  {bin.available}
                </div>

                <div style={styles.metricLabel}>Available</div>
              </div>
            </div>

            {/* Progress */}
            <div style={styles.progressBarBg}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${bin.utilization}%`,
                  backgroundColor: bin.utilization > 90 ? "#EF4444" : "#6366F1",
                }}
              />
            </div>

            {/* Materials */}
            <div style={styles.contentsSection}>
              {/* <div style={styles.contentsTitle}>Stored Materials</div> */}

              {bin.materials.length === 0 ? (
                <div style={styles.emptyStateText}>
                  No material loaded (Bin Empty)
                </div>
              ) : (
                <div style={styles.materialTableWrapper}>
                  <table style={styles.materialTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Garden</th>
                        <th style={styles.tableHeader}>Garden Inv No</th>
                        <th style={styles.tableHeader}>No. of Bags</th>
                        <th style={styles.tableHeader}>Nt Wt. Per Bags</th>
                        <th style={styles.tableHeader}>Net Weight</th>
                        <th style={styles.tableHeader}>Tare Weight</th>
                        <th style={styles.tableHeader}>Gross Weight</th>
                      </tr>
                    </thead>

                    <tbody>
                      {Object.entries(
                        bin.materials.reduce((acc, mat) => {
                          const garden = mat.attributes?.Garden || "-";
                          const invoice =
                            mat.attributes?.["Garden Inv No"] || "-";

                          const ntWtPerBag =
                            mat.attributes?.["Nt Wt. Per Bags"] || "-";

                          const key = `${garden}-${invoice}-${ntWtPerBag}`;
                          if (!acc[key]) {
                            acc[key] = {
                              ...mat,
                              bagCount: 0,
                            };
                          }

                          acc[key].bagCount += 1;

                          return acc;
                        }, {}),
                      ).map(([key, mat], idx) => (
                        <tr key={idx}>
                          <td style={styles.tableCell}>
                            {mat.attributes?.Garden || "-"}
                          </td>

                          <td style={styles.tableCell}>
                            {mat.attributes?.["Garden Inv No"] || "-"}
                          </td>

                          {/* ONLY COUNT GROUPED */}
                          <td style={styles.tableCell}>{mat.bagCount}</td>

                          {/* KEEP ORIGINAL VALUES */}
                          <td style={styles.tableCell}>
                            {mat.attributes?.["Nt Wt. Per Bags"] || "-"}
                          </td>

                          <td style={styles.tableCell}>
                            {mat.attributes?.["Net Weight"] || "-"}
                          </td>

                          <td style={styles.tableCell}>
                            {mat.attributes?.["Tare Weight"] || "-"}
                          </td>

                          <td style={styles.tableCell}>
                            {mat.attributes?.["Gross Weight"] || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "100%",
    margin: "20px auto",
    padding: "24px",
    background: "#FAFAFA",
    borderRadius: "12px",
    fontFamily: "Inter, system-ui, sans-serif",
  },

  header: {
    textAlign: "center",
    marginBottom: "32px",
  },

  title: {
    margin: "0 0 6px 0",
    color: "#0F172A",
    fontSize: "1.5rem",
    fontWeight: "700",
  },

  subtitle: {
    margin: 0,
    color: "#64748B",
    fontSize: "0.95rem",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
    gap: "20px",
  },

  binCard: {
    background: "#ffffff",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",

    display: "flex",
    flexDirection: "column",

    height: "700px", // FIXED HEIGHT
    overflow: "hidden",
  },

  contentsSection: {
    borderTop: "1px dashed #E2E8F0",
    paddingTop: "12px",

    flex: 1,
    overflowY: "auto",
    marginTop: "10px",
    paddingRight: "8px",
    scrollbarWidth: "thin", // Firefox
    scrollbarColor: "#CBD5E1 transparent",

    // Chrome / Edge / Safari
    msOverflowStyle: "none",
  },

  binHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },

  binName: {
    fontSize: "1.05rem",
    fontWeight: "600",
    color: "#1E293B",
  },

  badge: {
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "600",
  },

  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    textAlign: "center",
    marginBottom: "12px",
    background: "#F8FAFC",
    padding: "10px",
    borderRadius: "8px",
  },

  metricValue: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#0F172A",
  },

  metricLabel: {
    fontSize: "0.72rem",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginTop: "2px",
  },

  progressBarBg: {
    width: "100%",
    height: "6px",
    background: "#E2E8F0",
    borderRadius: "999px",
    overflow: "hidden",
    marginBottom: "16px",
  },

  progressBarFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.4s ease-in-out",
  },

  contentsTitle: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },

  emptyStateText: {
    fontSize: "0.85rem",
    color: "#94A3B8",
    fontStyle: "italic",
    padding: "4px 0",
  },

  materialList: {
    listStyleType: "none",
    padding: 0,
    margin: 0,
  },

  materialItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.85rem",
    padding: "8px 0",
    color: "#334155",
    borderBottom: "1px solid #F1F5F9",
  },

  matName: {
    fontWeight: "500",
  },

  centerText: {
    textAlign: "center",
    padding: "50px",
    color: "#64748B",
    fontSize: "1rem",
  },

  materialTableWrapper: {
    overflowX: "auto",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
  },

  materialTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
  },

  tableHeader: {
    background: "#6366F1",
    color: "white",
    padding: "10px",
    fontSize: "12px",
    fontWeight: "600",
    border: "1px solid #CBD5E1",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },

  tableCell: {
    padding: "10px",
    fontSize: "12px",
    border: "1px solid #E2E8F0",
    color: "#0F172A",
    background: "#FFFFFF",
  },
};

export default BinActiveDistribution;
