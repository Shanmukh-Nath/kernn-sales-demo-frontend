import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function DevicesSessions() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deviceTypeFilter, setDeviceTypeFilter] = useState("ALL");

  useEffect(() => {
    // Mock data (API later)
    setTimeout(() => {
      setDevices([
        {
          id: 1,
          employee: "Ramesh Kumar",
          deviceType: "WEB",
          platform: "Chrome / Windows",
          license: "HYBRID",
          sessions: 1,
          lastSeen: "2026-01-15 10:22",
          status: "ALLOWED",
        },
        {
          id: 2,
          employee: "Suresh",
          deviceType: "MOBILE",
          platform: "Android",
          license: "NONE",
          sessions: 0,
          lastSeen: "2025-12-20 18:10",
          status: "BLOCKED",
        },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filteredDevices =
    deviceTypeFilter === "ALL"
      ? devices
      : devices.filter((d) => d.deviceType === deviceTypeFilter);

  const styles = {
    statCard: {
      background: "#fff",
      padding: "14px",
      borderRadius: "6px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    },
    actionCol: {
      display: "flex",
      gap: "6px",
    },
  };

  let index = 1;

  return (
    <>
      {/* Breadcrumb */}
      <p className="path">
        <span onClick={() => navigate("/licensing")}>Licensing</span>{" "}
        <i className="bi bi-chevron-right"></i> Devices & Sessions
      </p>

      {/* Stats */}
      <div className="row m-0 p-3">
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Total Devices</h6>
            <h4>{devices.length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Active Sessions</h6>
            <h4>{devices.reduce((a, b) => a + b.sessions, 0)}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Blocked Devices</h6>
            <h4>{devices.filter((d) => d.status === "BLOCKED").length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Logged-in Employees</h6>
            <h4>{new Set(devices.map((d) => d.employee)).size}</h4>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row m-0 p-3">
        <div className="col-3 formcontent">
          <label>Device Type</label>
          <select
            value={deviceTypeFilter}
            onChange={(e) => setDeviceTypeFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="WEB">Web</option>
            <option value="MOBILE">Mobile</option>
            <option value="POS">POS</option>
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
                <th>Employee</th>
                <th>Device</th>
                <th>Platform</th>
                <th>License</th>
                <th>Sessions</th>
                <th>Last Seen</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9}>Loading devices...</td>
                </tr>
              )}

              {!loading && filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={9}>NO DATA FOUND</td>
                </tr>
              )}

              {!loading &&
                filteredDevices.map((d) => (
                  <tr key={d.id}>
                    <td>{index++}</td>
                    <td>{d.employee}</td>
                    <td>{d.deviceType}</td>
                    <td>{d.platform}</td>
                    <td>{d.license}</td>
                    <td>{d.sessions}</td>
                    <td>{d.lastSeen}</td>
                    <td>
                      <span
                        className={`badge ${
                          d.status === "ALLOWED" ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td style={styles.actionCol}>
                      {d.status === "ALLOWED" && (
                        <button className="btn btn-sm btn-warning">
                          Logout
                        </button>
                      )}
                      <button className="btn btn-sm btn-danger">Revoke</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default DevicesSessions;
