import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Licensing.module.css";

function LicensingHome() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user")) || { roles: [] };
  console.log("User Roles:", user);
  const roles = JSON.stringify(user.roles || []);

  const isAdmin = roles.includes("Admin");
  const isSuperAdmin =
    roles.includes("Super Admin") ||
    roles.includes("super admin") ||
    roles.includes("super_admin");

  return (
    <>
      {/* Breadcrumb */}
      <p className="path">
        <span onClick={() => navigate("/")}>Home</span>{" "}
        <i className="bi bi-chevron-right"></i> Licensing
      </p>

      {/* Action Buttons */}
      <div className="row m-0 p-3">
        <div className="col d-flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <button
                className="homebtn"
                onClick={() => navigate("/licensing/licenses")}
              >
                License Pool
              </button>

              <button
                className="homebtn"
                onClick={() => navigate("/licensing/employees")}
              >
                Employee Licenses
              </button>

              <button
                className="homebtn"
                onClick={() => navigate("/licensing/devices")}
              >
                Devices & Sessions
              </button>

              <button
                className="homebtn"
                onClick={() => navigate("/licensing/usage-history")}
              >
                Usage History
              </button>

              <button
                className="homebtn"
                onClick={() => navigate("/licensing/invoices")}
              >
                License Invoices
              </button>
            </>
          )}

          {/* ⭐ Super Admin Only */}
          {isSuperAdmin && (
            <button
              className={`${styles.superBtn}`}
              onClick={() => navigate("/licensing/settings")}
            >
              License Settings
            </button>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="row m-0 p-3">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className={styles.statCard}>
            <h6>Total Licenses</h6>
            <h3>—</h3>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className={styles.statCard}>
            <h6>Active Licenses</h6>
            <h3>—</h3>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className={styles.statCard}>
            <h6>Free Licenses Used</h6>
            <h3>—</h3>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className={styles.statCard}>
            <h6>Active Sessions</h6>
            <h3>—</h3>
          </div>
        </div>
      </div>

      {/* Analytics / Charts Placeholder */}
      <div className="row m-0 p-3">
        <div className="col-lg-12">
          <div className={styles.chartBox}>
            <p className="text-muted text-center">
              License usage, device activity & revenue analytics will appear
              here
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default LicensingHome;
