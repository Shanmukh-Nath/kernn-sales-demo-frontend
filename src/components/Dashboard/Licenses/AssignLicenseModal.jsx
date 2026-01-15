import React, { useEffect, useState } from "react";

function AssignLicenseModal({ isOpen, onClose, employee }) {
  const [roles, setRoles] = useState([]);
  const [licenses, setLicenses] = useState([]);

  const [selectedRole, setSelectedRole] = useState("");
  const [channel, setChannel] = useState("WEB");
  const [selectedLicense, setSelectedLicense] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Mock roles & licenses (API later)
    setRoles(
      employee?.roles || [
        { id: 1, name: "Billing Officer" },
        { id: 2, name: "Store Executive" },
      ]
    );

    setLicenses([
      {
        id: 101,
        type: "HYBRID",
        validTo: "2026-01-14",
        price: 0,
      },
      {
        id: 102,
        type: "ROLE",
        validTo: "2025-12-31",
        price: 6600,
      },
    ]);
  }, [isOpen, employee]);

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    },
    modal: {
      background: "#fff",
      width: "520px",
      borderRadius: "6px",
      padding: "20px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "10px",
    },
    row: {
      marginBottom: "12px",
    },
    actions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "15px",
    },
  };

  const handleAssign = () => {
    if (!selectedRole || !selectedLicense) {
      alert("Please select role and license");
      return;
    }

    // API later
    console.log("Assign License", {
      employeeId: employee.id,
      roleId: selectedRole,
      licenseId: selectedLicense,
      channel,
    });

    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h5>Assign License</h5>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.row}>
          <label>Employee</label>
          <input className="form-control" value={employee?.name} disabled />
        </div>

        <div style={styles.row}>
          <label>Role</label>
          <select
            className="form-control"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">Select Role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.row}>
          <label>Channel</label>
          <select
            className="form-control"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="WEB">WEB</option>
            <option value="MOBILE">MOBILE</option>
            <option value="POS">POS</option>
          </select>
        </div>

        <div style={styles.row}>
          <label>Available Licenses</label>
          <select
            className="form-control"
            value={selectedLicense}
            onChange={(e) => setSelectedLicense(e.target.value)}
          >
            <option value="">Select License</option>
            {licenses.map((l) => (
              <option key={l.id} value={l.id}>
                {l.type} | Valid till {l.validTo} | ₹{l.price}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.actions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleAssign}>
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignLicenseModal;
