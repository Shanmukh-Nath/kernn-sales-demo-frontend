import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LicensePool.module.css";

function LicensePool() {
  const navigate = useNavigate();

  /* ---------------------------
     MOCK DATA (API REPLACE LATER)
  ----------------------------*/
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Filters */
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    // Mock license pool
    setTimeout(() => {
      setLicenses([
        {
          id: 1,
          type: "HYBRID",
          role: "Billing Officer",
          device: "WEB",
          price: 0,
          isFree: true,
          status: "ACTIVE",
          assignedTo: "Ramesh Kumar",
          validTo: "2026-01-14",
        },
        {
          id: 2,
          type: "ROLE",
          role: "Store Manager",
          device: "-",
          price: 6600,
          isFree: false,
          status: "ACTIVE",
          assignedTo: "Suresh",
          validTo: "2025-11-02",
        },
        {
          id: 3,
          type: "DEVICE",
          role: "-",
          device: "MOBILE",
          price: 5000,
          isFree: false,
          status: "EXPIRED",
          assignedTo: "-",
          validTo: "2024-12-31",
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  /* ---------------------------
     FILTERING
  ----------------------------*/
  const filteredLicenses = licenses.filter((l) => {
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && l.type !== typeFilter) return false;
    return true;
  });

  let index = 1;

  return (
    <>
      {/* Breadcrumb */}
      <p className="path">
        <span onClick={() => navigate("/licensing")}>Licensing</span>{" "}
        <i className="bi bi-chevron-right"></i> License Pool
      </p>

      {/* Top Actions */}
      <div className="row m-0 p-3">
        <div className="col">
          <button
            className="homebtn me-2"
            onClick={() => alert("Assign License (next step)")}
          >
            Assign License
          </button>

          <button
            className="homebtn"
            onClick={() => navigate("/licensing/add")}
          >
            Add License
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="row m-0 p-3">
        <div className="col-3 formcontent">
          <label>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        <div className="col-3 formcontent">
          <label>License Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="ROLE">Role</option>
            <option value="DEVICE">Device</option>
            <option value="HYBRID">Hybrid</option>
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
                <th>License ID</th>
                <th>Type</th>
                <th>Role</th>
                <th>Device</th>
                <th>Price (₹)</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Valid Till</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10}>Loading licenses...</td>
                </tr>
              )}

              {!loading && filteredLicenses.length === 0 && (
                <tr>
                  <td colSpan={10}>NO LICENSES FOUND</td>
                </tr>
              )}

              {!loading &&
                filteredLicenses.map((lic) => (
                  <tr key={lic.id}>
                    <td>{index++}</td>
                    <td>LIC-{lic.id}</td>
                    <td>{lic.type}</td>
                    <td>{lic.role}</td>
                    <td>{lic.device}</td>
                    <td>
                      {lic.isFree ? (
                        <span className="badge bg-success">FREE</span>
                      ) : (
                        lic.price
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          lic.status === "ACTIVE"
                            ? "bg-success"
                            : lic.status === "EXPIRED"
                              ? "bg-danger"
                              : "bg-warning"
                        }`}
                      >
                        {lic.status}
                      </span>
                    </td>
                    <td>{lic.assignedTo}</td>
                    <td>{lic.validTo}</td>
                    <td className={styles.actionCol}>
                      <button className="btn btn-sm btn-info me-1">View</button>
                      <button className="btn btn-sm btn-warning me-1">
                        Reassign
                      </button>
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

export default LicensePool;
