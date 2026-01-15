import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AddLicense() {
  const navigate = useNavigate();

  /* ---------------------------
     STATE
  ----------------------------*/
  const [licenseType, setLicenseType] = useState("ROLE"); // ROLE | DEVICE | HYBRID
  const [role, setRole] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [basePrice, setBasePrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);

  /* ---------------------------
     MOCK PRICING RULES
     (Replace with API later)
  ----------------------------*/
  const ROLE_PRICES = {
    "Billing Officer": 6600,
    "Store Manager": 8000,
  };

  const DEVICE_PRICES = {
    WEB: 5000,
    MOBILE: 4000,
  };

  /* ---------------------------
     PRICE CALCULATION
  ----------------------------*/
  useEffect(() => {
    let price = 0;

    if (licenseType === "ROLE" && role) {
      price = ROLE_PRICES[role] || 0;
    }

    if (licenseType === "DEVICE" && deviceType) {
      price = DEVICE_PRICES[deviceType] || 0;
    }

    if (licenseType === "HYBRID" && role && deviceType) {
      const rolePrice = ROLE_PRICES[role] || 0;
      const devicePrice = DEVICE_PRICES[deviceType] || 0;

      // 🔥 Hybrid pricing rule (can be dynamic later)
      price = rolePrice + devicePrice;

      // Example attraction discount
      if (role === "Billing Officer" && deviceType === "WEB") {
        price = 6000; // special combo price
      }
    }

    const total = price * quantity;
    const discountedTotal = total - discount;

    setBasePrice(total);
    setFinalPrice(discountedTotal > 0 ? discountedTotal : 0);
  }, [licenseType, role, deviceType, quantity, discount]);

  /* ---------------------------
     PAYMENT PLACEHOLDER
  ----------------------------*/
  const initiatePayment = () => {
    alert(`Initiating Razorpay\nAmount: ₹${finalPrice}\nLicenses: ${quantity}`);

    // Later:
    // 1. Create order from backend
    // 2. Open Razorpay
    // 3. Verify payment
    // 4. Add licenses to pool
  };

  /* ---------------------------
     STYLES (INLINE ONLY)
  ----------------------------*/
  const styles = {
    box: {
      background: "#fff",
      padding: "20px",
      borderRadius: "6px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
      marginBottom: "16px",
    },
    label: { fontWeight: 600 },
    priceBox: {
      background: "#f8f9fa",
      padding: "16px",
      borderRadius: "6px",
    },
    total: {
      fontSize: "20px",
      fontWeight: 700,
      color: "#0d6efd",
    },
  };

  return (
    <>
      {/* Breadcrumb */}
      <p className="path">
        <span onClick={() => navigate("/licensing")}>Licensing</span>{" "}
        <i className="bi bi-chevron-right"></i>{" "}
        <span onClick={() => navigate("/licensing/licenses")}>
          License Pool
        </span>{" "}
        <i className="bi bi-chevron-right"></i> Add License
      </p>

      {/* License Config */}
      <div className={styles.box}>
        <h5>Add New License</h5>

        <div className="row mt-3">
          <div className="col-4 formcontent">
            <label style={styles.label}>License Type</label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
            >
              <option value="ROLE">Role Based</option>
              <option value="DEVICE">Device Based</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          {(licenseType === "ROLE" || licenseType === "HYBRID") && (
            <div className="col-4 formcontent">
              <label style={styles.label}>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Select Role</option>
                <option>Billing Officer</option>
                <option>Store Manager</option>
              </select>
            </div>
          )}

          {(licenseType === "DEVICE" || licenseType === "HYBRID") && (
            <div className="col-4 formcontent">
              <label style={styles.label}>Device Type</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
              >
                <option value="">Select Device</option>
                <option value="WEB">Web</option>
                <option value="MOBILE">Mobile</option>
              </select>
            </div>
          )}
        </div>

        <div className="row mt-3">
          <div className="col-4 formcontent">
            <label style={styles.label}>Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <div className={styles.box}>
        <h6>Price Summary</h6>

        <div style={styles.priceBox}>
          <p>Base Price: ₹{basePrice}</p>
          <p>Discount: ₹{discount}</p>
          <p style={styles.total}>Total Payable: ₹{finalPrice}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="row m-0 p-3">
        <button
          className="homebtn"
          disabled={finalPrice <= 0}
          onClick={initiatePayment}
        >
          Pay & Add Licenses
        </button>
      </div>
    </>
  );
}

export default AddLicense;
