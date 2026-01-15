import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BuyFreeLicenseModal from "./BuyFreeLicenseModal";

function LicensingSettings() {
  const navigate = useNavigate();

  const [showFreeModal, setShowFreeModal] = useState(false);

  const [config, setConfig] = useState({
    licensingType: "HYBRID",
    freeLicenseQuota: 3,
    freeLicenseValidityDays: 365,
    gracePeriodDays: 7,
    enforceSingleDevice: false,
    enforceStrictChannel: true,
  });

  const [hybrid, setHybrid] = useState({
    roleWeight: 1.0,
    deviceWeight: 1.0,
    bundleMultiplier: 1.0,
    flatDiscount: 0,
    minPrice: 0,
    maxDiscountPercent: 50,
  });

  const styles = {
    section: {
      background: "#fff",
      padding: "16px",
      marginBottom: "16px",
      borderRadius: "6px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "12px",
    },
    actions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      marginTop: "20px",
    },
  };

  const saveSettings = () => {
    console.log("Saving licensing config", config, hybrid);
    alert("Settings saved (API later)");
  };

  return (
    <>
      {/* Breadcrumb */}
      <p className="path">
        <span onClick={() => navigate("/licensing")}>Licensing</span>{" "}
        <i className="bi bi-chevron-right"></i> License Settings
      </p>

      {/* Licensing Mode */}
      <div style={styles.section}>
        <h5>Licensing Mode</h5>
        <select
          className="form-control"
          value={config.licensingType}
          onChange={(e) =>
            setConfig({ ...config, licensingType: e.target.value })
          }
        >
          <option value="ROLE_BASED">Role Based</option>
          <option value="DEVICE_BASED">Device Based</option>
          <option value="HYBRID">Hybrid</option>
        </select>
      </div>

      {/* Free License Policy */}
      <div style={styles.section}>
        <h5>Free License Policy</h5>
        <div style={styles.grid}>
          <div>
            <label>Free License Quota</label>
            <input
              type="number"
              className="form-control"
              value={config.freeLicenseQuota}
              onChange={(e) =>
                setConfig({ ...config, freeLicenseQuota: e.target.value })
              }
            />
          </div>

          <div>
            <label>Free Validity (Days)</label>
            <input
              type="number"
              className="form-control"
              value={config.freeLicenseValidityDays}
              onChange={(e) =>
                setConfig({
                  ...config,
                  freeLicenseValidityDays: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label>Grace Period (Days)</label>
            <input
              type="number"
              className="form-control"
              value={config.gracePeriodDays}
              onChange={(e) =>
                setConfig({ ...config, gracePeriodDays: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Enforcement */}
      <div style={styles.section}>
        <h5>Enforcement Rules</h5>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={config.enforceSingleDevice}
            onChange={(e) =>
              setConfig({ ...config, enforceSingleDevice: e.target.checked })
            }
          />
          <label className="form-check-label">
            Enforce Single Device per User
          </label>
        </div>

        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={config.enforceStrictChannel}
            onChange={(e) =>
              setConfig({ ...config, enforceStrictChannel: e.target.checked })
            }
          />
          <label className="form-check-label">
            Enforce Strict Channel (WEB ≠ MOBILE)
          </label>
        </div>
      </div>

      {/* Free License Purchase */}
      <div style={styles.section}>
        <h5>Free Licenses</h5>

        <p style={{ marginBottom: "10px", color: "#555" }}>
          Free licenses are added via zero-value invoices and behave exactly
          like paid licenses (expiry, assignment, enforcement).
        </p>

        <button
          className="btn btn-success"
          onClick={() => setShowFreeModal(true)}
        >
          Buy Free Licenses
        </button>
      </div>

      {/* Hybrid Pricing Formula */}
      {config.licensingType === "HYBRID" && (
        <div style={styles.section}>
          <h5>Hybrid Pricing Formula</h5>
          <div style={styles.grid}>
            <div>
              <label>Role Weight</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={hybrid.roleWeight}
                onChange={(e) =>
                  setHybrid({ ...hybrid, roleWeight: e.target.value })
                }
              />
            </div>

            <div>
              <label>Device Weight</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={hybrid.deviceWeight}
                onChange={(e) =>
                  setHybrid({ ...hybrid, deviceWeight: e.target.value })
                }
              />
            </div>

            <div>
              <label>Bundle Multiplier</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={hybrid.bundleMultiplier}
                onChange={(e) =>
                  setHybrid({ ...hybrid, bundleMultiplier: e.target.value })
                }
              />
            </div>

            <div>
              <label>Flat Discount (₹)</label>
              <input
                type="number"
                className="form-control"
                value={hybrid.flatDiscount}
                onChange={(e) =>
                  setHybrid({ ...hybrid, flatDiscount: e.target.value })
                }
              />
            </div>

            <div>
              <label>Minimum Price</label>
              <input
                type="number"
                className="form-control"
                value={hybrid.minPrice}
                onChange={(e) =>
                  setHybrid({ ...hybrid, minPrice: e.target.value })
                }
              />
            </div>

            <div>
              <label>Max Discount %</label>
              <input
                type="number"
                className="form-control"
                value={hybrid.maxDiscountPercent}
                onChange={(e) =>
                  setHybrid({ ...hybrid, maxDiscountPercent: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div style={styles.actions}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={saveSettings}>
          Save Settings
        </button>
      </div>

      <BuyFreeLicenseModal
        open={showFreeModal}
        onClose={() => setShowFreeModal(false)}
      />
    </>
  );
}

export default LicensingSettings;
