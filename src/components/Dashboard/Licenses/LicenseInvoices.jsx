import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function LicenseInvoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    // Mock data (API later)
    setTimeout(() => {
      setInvoices([
        {
          id: 1,
          invoiceNo: "LIC-INV-001",
          date: "2026-01-10",
          items: 3,
          amount: 19800,
          status: "PAID",
          paidAt: "2026-01-10",
        },
        {
          id: 2,
          invoiceNo: "LIC-INV-002",
          date: "2026-01-15",
          items: 2,
          amount: 11600,
          status: "PENDING",
          paidAt: null,
        },
        {
          id: 3,
          invoiceNo: "LIC-INV-003",
          date: "2025-12-20",
          items: 1,
          amount: 6600,
          status: "OVERDUE",
          paidAt: null,
        },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filteredInvoices =
    statusFilter === "ALL"
      ? invoices
      : invoices.filter((i) => i.status === statusFilter);

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
        <i className="bi bi-chevron-right"></i> License Invoices
      </p>

      {/* Stats */}
      <div className="row m-0 p-3">
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Total Invoices</h6>
            <h4>{invoices.length}</h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Paid Amount</h6>
            <h4>
              ₹
              {invoices
                .filter((i) => i.status === "PAID")
                .reduce((a, b) => a + b.amount, 0)}
            </h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Pending Amount</h6>
            <h4>
              ₹
              {invoices
                .filter((i) => i.status === "PENDING")
                .reduce((a, b) => a + b.amount, 0)}
            </h4>
          </div>
        </div>
        <div className="col-3">
          <div style={styles.statCard}>
            <h6>Overdue</h6>
            <h4>{invoices.filter((i) => i.status === "OVERDUE").length}</h4>
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
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
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
                <th>Invoice No</th>
                <th>Date</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Paid On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8}>Loading invoices...</td>
                </tr>
              )}

              {!loading && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8}>NO DATA FOUND</td>
                </tr>
              )}

              {!loading &&
                filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{index++}</td>
                    <td>{inv.invoiceNo}</td>
                    <td>{inv.date}</td>
                    <td>{inv.items}</td>
                    <td>₹{inv.amount}</td>
                    <td>
                      <span
                        className={`badge ${
                          inv.status === "PAID"
                            ? "bg-success"
                            : inv.status === "OVERDUE"
                              ? "bg-danger"
                              : "bg-warning"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td>{inv.paidAt || "-"}</td>
                    <td style={styles.actionCol}>
                      <button className="btn btn-sm btn-info">View</button>
                      {inv.status === "PENDING" && (
                        <button className="btn btn-sm btn-primary">Pay</button>
                      )}
                      {inv.status !== "PAID" && (
                        <button className="btn btn-sm btn-danger">Void</button>
                      )}
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

export default LicenseInvoices;
