import React, { useState } from "react";

function BuyFreeLicenseModal({ open, onClose }) {
  const [type, setType] = useState("ROLE");
  const [quantity, setQuantity] = useState(1);

  if (!open) return null;

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modal: {
      background: "#fff",
      padding: "20px",
      width: "420px",
      borderRadius: "6px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
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

  const confirm = () => {
    console.log("Create FREE licenses", {
      type,
      quantity,
      price: 0,
    });

    alert("Zero-value invoice created (API later)");
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h5>Buy Free Licenses</h5>

        <div style={styles.row}>
          <label>License Type</label>
          <select
            className="form-control"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="ROLE">Role Based</option>
            <option value="DEVICE">Device Based</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>

        <div style={styles.row}>
          <label>Quantity</label>
          <input
            type="number"
            min={1}
            className="form-control"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>

        <div style={styles.row}>
          <label>Total Amount</label>
          <input className="form-control" value="₹0 (Free)" disabled />
        </div>

        <div style={styles.actions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={confirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default BuyFreeLicenseModal;
