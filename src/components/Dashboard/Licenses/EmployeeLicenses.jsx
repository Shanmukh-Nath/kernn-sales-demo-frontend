import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AssignLicenseModal from "./AssignLicenseModal";

function EmployeeLicenses() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    // Mock data (API later)
    setTimeout(() => {
      setEmployees([
        {
          id: 1,
          name: "Ramesh Kumar",
          role: "Billing Officer",
          licenseType: "HYBRID",
          device: "WEB",
          validTo: "2026-01-14",
          status: "ACTIVE",
          sessions: 1,
        },
        {
          id: 2,
          name: "Suresh",
          role: "Store Executive",
          licenseType: "-",
          device: "-",
          validTo: "-",
          status: "NONE",
          sessions: 0,
        },
        {
          id: 3,
          name: "Mahesh",
          role: "Store Manager",
          licenseType: "ROLE",
          device: "-",
          validTo: "2024-12-31",
          status: "EXPIRED",
          sessions: 0,
        },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filteredEmployees = employees.filter((e) => {
    if (statusFilter === "ALL") return true;
    return e.status === statusFilter;
  });

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
        <i className="bi bi-chevron-right"></i> Employee Licenses
      </p>

      {/* Stats */}
      <div className="row m-0 p-3">
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Total Employees</h6>
            <h4>{employees.length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Licensed</h6>
            <h4>{employees.filter((e) => e.status === "ACTIVE").length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Blocked</h6>
            <h4>{employees.filter((e) => e.status !== "ACTIVE").length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Active Sessions</h6>
            <h4>{employees.reduce((a, b) => a + b.sessions, 0)}</h4>
          </div>
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
            <option value="NONE">Unlicensed</option>
            <option value="EXPIRED">Expired</option>
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
                <th>Role</th>
                <th>License Type</th>
                <th>Device</th>
                <th>Valid Till</th>
                <th>Sessions</th>
                <th>Access</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9}>Loading employees...</td>
                </tr>
              )}

              {!loading && filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={9}>NO DATA FOUND</td>
                </tr>
              )}

              {!loading &&
                filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{index++}</td>
                    <td>{emp.name}</td>
                    <td>{emp.role}</td>
                    <td>{emp.licenseType}</td>
                    <td>{emp.device}</td>
                    <td>{emp.validTo}</td>
                    <td>{emp.sessions}</td>
                    <td>
                      <span
                        className={`badge ${
                          emp.status === "ACTIVE" ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? "ALLOWED" : "BLOCKED"}
                      </span>
                    </td>
                    <td style={styles.actionCol}>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setAssignOpen(true);
                        }}
                      >
                        Assign
                      </button>

                      <button className="btn btn-sm btn-danger">Revoke</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <AssignLicenseModal
          isOpen={assignOpen}
          employee={selectedEmployee}
          onClose={() => setAssignOpen(false)}
        />
      </div>
    </>
  );
}

export default EmployeeLicenses;
