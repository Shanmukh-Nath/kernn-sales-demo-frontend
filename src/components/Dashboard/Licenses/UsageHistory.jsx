import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UsageHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    // Mock data (API later)
    setTimeout(() => {
      setLogs([
        {
          id: 1,
          time: "2026-01-15 10:22",
          employee: "Ramesh Kumar",
          action: "LOGIN_ALLOWED",
          licenseId: 101,
          device: "WEB / Chrome",
          reason: "Valid hybrid license",
        },
        {
          id: 2,
          time: "2026-01-15 09:50",
          employee: "Suresh",
          action: "LOGIN_BLOCKED",
          licenseId: null,
          device: "MOBILE / Android",
          reason: "No valid license assigned",
        },
        {
          id: 3,
          time: "2026-01-14 18:30",
          employee: "Admin",
          action: "ASSIGNED",
          licenseId: 102,
          device: "-",
          reason: "Assigned from license pool",
        },
        {
          id: 4,
          time: "2026-01-14 18:00",
          employee: "Admin",
          action: "UNASSIGNED",
          licenseId: 101,
          device: "-",
          reason: "Employee left organization",
        },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filteredLogs =
    actionFilter === "ALL"
      ? logs
      : logs.filter((l) => l.action === actionFilter);

  const styles = {
    statCard: {
      background: "#fff",
      padding: "14px",
      borderRadius: "6px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    },
  };

  let index = 1;

  return (
    <>
      {/* Breadcrumb */}
      <p className="path">
        <span onClick={() => navigate("/licensing")}>Licensing</span>{" "}
        <i className="bi bi-chevron-right"></i> Usage History
      </p>

      {/* Stats */}
      <div className="row m-0 p-3">
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Total Events</h6>
            <h4>{logs.length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Login Allowed</h6>
            <h4>{logs.filter((l) => l.action === "LOGIN_ALLOWED").length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Login Blocked</h6>
            <h4>{logs.filter((l) => l.action === "LOGIN_BLOCKED").length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Assignments</h6>
            <h4>{logs.filter((l) => l.action === "ASSIGNED").length}</h4>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row m-0 p-3">
        <div className="col-3 formcontent">
          <label>Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNASSIGNED">Unassigned</option>
            <option value="LOGIN_ALLOWED">Login Allowed</option>
            <option value="LOGIN_BLOCKED">Login Blocked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="row m-0 p-3">
        <div className="col-lg-12">
          <table className="table table-bordered borderedtable">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Time</th>
                <th>Employee</th>
                <th>Action</th>
                <th>License</th>
                <th>Device</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}>Loading history...</td>
                </tr>
              )}

              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7}>NO DATA FOUND</td>
                </tr>
              )}

              {!loading &&
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{index++}</td>
                    <td>{log.time}</td>
                    <td>{log.employee}</td>
                    <td>
                      <span
                        className={`badge ${
                          log.action === "LOGIN_BLOCKED"
                            ? "bg-danger"
                            : log.action === "LOGIN_ALLOWED"
                              ? "bg-success"
                              : "bg-info"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>{log.licenseId || "-"}</td>
                    <td>{log.device}</td>
                    <td>{log.reason}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default UsageHistory;
