import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../Dashboard/HomePage/HomePage.module.css";
import ErrorModal from "@/components/ErrorModal";
import SuccessModal from "@/components/SuccessModal";
import Loading from "@/components/Loading";
import storeService from "../../../services/storeService";

export default function StoreAssetTransfer() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    assetId: "",
    toStoreId: "",
    quantity: "",
    reason: "",
    additionalNotes: "",
    remarks: "",
  });
  const [currentStore, setCurrentStore] = useState(null);
  const [assets, setAssets] = useState([]);
  const [stores, setStores] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [transferResponse, setTransferResponse] = useState(null);

  // Get current store ID
  const getStoreId = () => {
    try {
      const selectedStore = localStorage.getItem("selectedStore");
      if (selectedStore) {
        const store = JSON.parse(selectedStore);
        return store.id;
      }
      const currentStoreId = localStorage.getItem("currentStoreId");
      if (currentStoreId) {
        return parseInt(currentStoreId);
      }
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const user = userData.user || userData;
      return user?.storeId || user?.store?.id || null;
    } catch (e) {
      console.error("Error parsing store data:", e);
      return null;
    }
  };

  // Fetch current store details
  const fetchCurrentStore = async () => {
    const storeId = getStoreId();
    if (!storeId) {
      setError("Store information missing. Please select a store first.");
      setIsErrorModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      const res = await storeService.getStoreById(storeId);
      const store = res.store || res.data || res;
      if (store && store.id) {
        setCurrentStore(store);
      } else {
        throw new Error("Store not found");
      }
    } catch (err) {
      console.error("Error fetching current store:", err);
      setError(err.response?.data?.message || err.message || "Error fetching store information");
      setIsErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available assets from current store
  const fetchAssets = async () => {
    const storeId = getStoreId();
    if (!storeId) return;

    try {
      setLoading(true);
      const res = await storeService.getStoreAssets(storeId, { limit: 1000 }); // Get all assets
      const assetsData = res.data || res.assets || res || [];
      
      // Map assets and calculate available quantity
      const mappedAssets = Array.isArray(assetsData) ? assetsData.map(item => {
        const requestedQty = parseFloat(item.requestedQuantity || item.quantity || 0);
        const receivedQty = parseFloat(item.receivedQuantity || 0);
        const availableQty = Math.max(requestedQty - receivedQty, 0);
        
        return {
          id: item.id,
          assetCode: item.assetCode || item.code || `AST-${item.id}`,
          itemName: item.itemName || item.name || "-",
          availableQuantity: availableQty,
          totalQuantity: requestedQty,
          receivedQuantity: receivedQty,
        };
      }).filter(asset => asset.availableQuantity > 0) : []; // Only show assets with available quantity
      
      setAssets(mappedAssets);
    } catch (err) {
      console.error("Error fetching assets:", err);
      setError(err.response?.data?.message || err.message || "Error fetching assets");
      setIsErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch destination stores
  const fetchStores = async () => {
    const storeId = getStoreId();
    if (!storeId) return;

    try {
      setLoading(true);
      const response = await storeService.getDestinationStores(storeId);
      const storesData = response.data || response.stores || response || [];
      const mappedStores = Array.isArray(storesData) ? storesData.map(store => ({
        id: store.id,
        name: store.name || store.storeName,
        storeCode: store.storeCode || store.code,
      })) : [];
      
      setStores(mappedStores);
      if (mappedStores.length === 0) {
        setError("No destination stores available for transfer.");
        setIsErrorModalOpen(true);
      }
    } catch (err) {
      console.error("Error fetching destination stores:", err);
      setError(err.response?.data?.message || err.message || "Error fetching destination stores");
      setIsErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch asset transfers
  const fetchTransfers = async () => {
    const storeId = getStoreId();
    if (!storeId) return;

    try {
      setTransfersLoading(true);
      const response = await storeService.getAssetTransfers(storeId, { limit: 50 });
      const transfersData = response.data || response.transfers || response || [];
      const mappedTransfers = Array.isArray(transfersData) ? transfersData.map(transfer => ({
        id: transfer.id,
        transferCode: transfer.transferCode || transfer.code || `AST-TRF-${transfer.id}`,
        fromStore: transfer.fromStore || {},
        toStore: transfer.toStore || {},
        asset: transfer.asset || {},
        quantity: transfer.quantity || 0,
        status: transfer.status || "pending",
        reason: transfer.reason || "-",
        transferDate: transfer.transferDate || transfer.createdAt,
        notes: transfer.notes || "",
        totals: transfer.totals || {},
      })) : [];
      setTransfers(mappedTransfers);
    } catch (err) {
      console.error("Error fetching asset transfers:", err);
      // Don't show error modal for transfers, just log it
    } finally {
      setTransfersLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentStore();
  }, []);

  useEffect(() => {
    if (currentStore?.id) {
      fetchAssets();
      fetchStores();
      fetchTransfers();
    }
  }, [currentStore]);

  const closeErrorModal = () => {
    setIsErrorModalOpen(false);
    setError(null);
  };

  const closeSuccessModal = () => {
    setIsSuccessModalOpen(false);
    setSuccessMessage("");
    // Reset form after successful transfer
    setForm({
      assetId: "",
      toStoreId: "",
      quantity: "",
      reason: "",
      additionalNotes: "",
      remarks: "",
    });
    setTransferResponse(null);
    // Refresh assets list
    fetchAssets();
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.assetId || !form.toStoreId || !form.quantity || !form.reason) {
      setError("Please fill all the required fields.");
      setIsErrorModalOpen(true);
      return;
    }

    const selectedAsset = assets.find(a => a.id === Number(form.assetId));
    if (!selectedAsset) {
      setError("Selected asset not found.");
      setIsErrorModalOpen(true);
      return;
    }

    const quantity = parseInt(form.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError("Please enter a valid quantity.");
      setIsErrorModalOpen(true);
      return;
    }

    if (quantity > selectedAsset.availableQuantity) {
      setError(`Available quantity is only ${selectedAsset.availableQuantity}. Please enter a valid quantity.`);
      setIsErrorModalOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const requestBody = {
        assetId: Number(form.assetId),
        toStoreId: Number(form.toStoreId),
        quantity: quantity,
        reason: form.reason,
        additionalNotes: form.additionalNotes || "",
        remarks: form.remarks || "",
      };

      const response = await storeService.createAssetTransfer(requestBody);

      if (response.success) {
        setTransferResponse(response.data);
        setSuccessMessage(response.message || "Assets transferred successfully");
        setIsSuccessModalOpen(true);
        // Refresh transfers list
        fetchTransfers();
        // Refresh assets list
        fetchAssets();
      } else {
        throw new Error(response.message || "Failed to transfer assets");
      }
    } catch (err) {
      console.error("Error transferring assets:", err);
      setError(err.response?.data?.message || err.message || "Failed to transfer assets. Please try again.");
      setIsErrorModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAsset = assets.find(a => a.id === Number(form.assetId));
  const selectedStore = stores.find(s => s.id === Number(form.toStoreId));

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2
            style={{
              fontFamily: "Poppins",
              fontWeight: 700,
              fontSize: "28px",
              color: "var(--primary-color)",
              margin: 0,
              marginBottom: "8px",
            }}
          >
            Asset Transfer
          </h2>
          <p className="path">
            <span onClick={() => navigate("/store/assets")}>Assets</span> <i className="bi bi-chevron-right"></i> Transfer
          </p>
        </div>
        <button className="cancelbtn" onClick={() => navigate("/store/assets")}>
          Back to Assets
        </button>
      </div>

      {loading && !currentStore && (
        <div className={styles.orderStatusCard} style={{ textAlign: "center", padding: "40px" }}>
          <Loading />
        </div>
      )}

      {currentStore && (
        <div className={styles.orderStatusCard}>
          <h4 style={{ margin: 0, marginBottom: "20px", fontFamily: "Poppins", fontWeight: 600, fontSize: "20px", color: "var(--primary-color)" }}>
            Transfer Request
          </h4>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label>Asset *</label>
                <select 
                  value={form.assetId} 
                  onChange={(e) => handleChange("assetId", e.target.value)} 
                  required
                  disabled={submitting || loading}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #000",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "Poppins",
                    backgroundColor: submitting || loading ? "#f3f4f6" : "#fff",
                    color: "#000",
                    cursor: submitting || loading ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">Select Asset</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.itemName} ({asset.assetCode}) - Available: {asset.availableQuantity}
                    </option>
                  ))}
                </select>
                {selectedAsset && (
                  <small style={{ color: "#666", fontFamily: "Poppins", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    Total: {selectedAsset.totalQuantity} | Received: {selectedAsset.receivedQuantity} | Available: {selectedAsset.availableQuantity}
                  </small>
                )}
              </div>
              <div>
                <label>From Store</label>
                <input 
                  type="text" 
                  value={currentStore.name || "Current Store"} 
                  disabled
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #000",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "Poppins",
                    backgroundColor: "#f3f4f6",
                    color: "#000",
                    cursor: "not-allowed",
                  }}
                />
              </div>
              <div>
                <label>To Store *</label>
                <select 
                  value={form.toStoreId} 
                  onChange={(e) => handleChange("toStoreId", e.target.value)} 
                  required
                  disabled={submitting || loading}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #000",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "Poppins",
                    backgroundColor: submitting || loading ? "#f3f4f6" : "#fff",
                    color: "#000",
                    cursor: submitting || loading ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">Select Store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} {store.storeCode ? `(${store.storeCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Quantity *</label>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedAsset?.availableQuantity || ""}
                  value={form.quantity} 
                  onChange={(e) => handleChange("quantity", e.target.value)} 
                  required
                  disabled={submitting || loading}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #000",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "Poppins",
                    backgroundColor: submitting || loading ? "#f3f4f6" : "#fff",
                    color: "#000",
                  }}
                />
                {selectedAsset && (
                  <small style={{ color: "#666", fontFamily: "Poppins", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    Max: {selectedAsset.availableQuantity}
                  </small>
                )}
              </div>
              <div>
                <label>Reason *</label>
                <select 
                  value={form.reason} 
                  onChange={(e) => handleChange("reason", e.target.value)} 
                  required
                  disabled={submitting || loading}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #000",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "Poppins",
                    backgroundColor: submitting || loading ? "#f3f4f6" : "#fff",
                    color: "#000",
                    cursor: submitting || loading ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">Select Reason</option>
                  <option value="Stock Reallocation">Stock Reallocation</option>
                  <option value="New Store Requirement">New Store Requirement</option>
                  <option value="Replacement">Replacement</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Emergency Transfer">Emergency Transfer</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Additional Notes (Optional)</label>
                <textarea 
                  rows="2" 
                  value={form.additionalNotes} 
                  onChange={(e) => handleChange("additionalNotes", e.target.value)} 
                  placeholder="Additional notes about the transfer..."
                  disabled={submitting || loading}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #000",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "Poppins",
                    backgroundColor: submitting || loading ? "#f3f4f6" : "#fff",
                    color: "#000",
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Remarks (Optional)</label>
                <textarea 
                  rows="2" 
                  value={form.remarks} 
                  onChange={(e) => handleChange("remarks", e.target.value)} 
                  placeholder="Additional remarks..."
                  disabled={submitting || loading}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #000",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "Poppins",
                    backgroundColor: submitting || loading ? "#f3f4f6" : "#fff",
                    color: "#000",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button 
                type="submit" 
                className="homebtn"
                disabled={submitting || loading}
              >
                {submitting ? "Submitting..." : "Submit Transfer"}
              </button>
              <button
                type="button"
                className="homebtn"
                onClick={() => {
                  setForm({
                    assetId: "",
                    toStoreId: "",
                    quantity: "",
                    reason: "",
                    additionalNotes: "",
                    remarks: "",
                  });
                }}
                disabled={submitting || loading}
                style={{ background: "#f3f4f6", color: "#2563eb" }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {transferResponse && (
        <div className={styles.orderStatusCard} style={{ marginTop: "24px" }}>
          <h4 style={{ margin: 0, marginBottom: "12px", fontFamily: "Poppins", fontWeight: 600, color: "#059669" }}>
            Transfer Successful
          </h4>
          {transferResponse.transfer && (
            <div style={{ fontFamily: "Poppins", fontSize: "14px" }}>
              <p style={{ margin: "8px 0" }}>
                <strong>Transfer Code:</strong> {transferResponse.transfer.transferCode || "-"}
              </p>
              <p style={{ margin: "8px 0" }}>
                <strong>From Store:</strong> {transferResponse.transfer.fromStore?.name || "-"} ({transferResponse.transfer.fromStore?.storeCode || "-"})
              </p>
              <p style={{ margin: "8px 0" }}>
                <strong>To Store:</strong> {transferResponse.transfer.toStore?.name || "-"} ({transferResponse.transfer.toStore?.storeCode || "-"})
              </p>
              <p style={{ margin: "8px 0" }}>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 500,
                    backgroundColor: transferResponse.transfer.status === "completed" ? "#d1fae5" : "#fef3c7",
                    color: transferResponse.transfer.status === "completed" ? "#065f46" : "#92400e",
                  }}
                >
                  {transferResponse.transfer.status || "pending"}
                </span>
              </p>
              <p style={{ margin: "8px 0" }}>
                <strong>Reason:</strong> {transferResponse.transfer.reason || "-"}
              </p>
              {transferResponse.transfer.notes && (
                <p style={{ margin: "8px 0" }}>
                  <strong>Notes:</strong> {transferResponse.transfer.notes}
                </p>
              )}
              {transferResponse.transfer.transferDate && (
                <p style={{ margin: "8px 0" }}>
                  <strong>Transfer Date:</strong>{" "}
                  {new Date(transferResponse.transfer.transferDate).toLocaleString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {transferResponse.totals && (
                <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "4px" }}>
                  <p style={{ margin: "4px 0", fontWeight: 600 }}>Financial Summary:</p>
                  <p style={{ margin: "4px 0" }}>
                    Total Value: ₹{transferResponse.totals.totalValue?.toLocaleString("en-IN") || "0"}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    Total Tax: ₹{transferResponse.totals.totalTax?.toLocaleString("en-IN") || "0"}
                  </p>
                  <p style={{ margin: "4px 0", fontWeight: 600, color: "var(--primary-color)" }}>
                    Grand Total: ₹{transferResponse.totals.grandTotal?.toLocaleString("en-IN") || "0"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transferred Assets Table */}
      {currentStore && (
        <div className={styles.orderStatusCard} style={{ marginTop: "24px" }}>
          <h4 style={{ margin: 0, marginBottom: "20px", fontFamily: "Poppins", fontWeight: 600, fontSize: "20px", color: "var(--primary-color)" }}>
            Transferred Assets
          </h4>
          {transfersLoading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Loading />
            </div>
          ) : transfers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              <p style={{ fontFamily: "Poppins", margin: 0 }}>No asset transfers found</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table table-bordered borderedtable table-sm" style={{ fontFamily: "Poppins" }}>
                <thead className="table-light">
                  <tr>
                    <th>S.No</th>
                    <th>Transfer Code</th>
                    <th>Asset</th>
                    <th>From Store</th>
                    <th>To Store</th>
                    <th>Quantity</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Transfer Date</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((transfer, index) => (
                    <tr
                      key={transfer.id}
                      style={{
                        background: index % 2 === 0 ? "rgba(59, 130, 246, 0.03)" : "transparent",
                      }}
                    >
                      <td style={{ fontFamily: "Poppins", fontSize: "13px" }}>{index + 1}</td>
                      <td style={{ fontFamily: "Poppins", fontSize: "13px", fontWeight: 600 }}>
                        {transfer.transferCode || `AST-TRF-${transfer.id}`}
                      </td>
                      <td style={{ fontFamily: "Poppins", fontSize: "13px" }}>
                        {transfer.asset?.itemName || transfer.asset?.name || "-"}
                        {transfer.asset?.assetCode && (
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            {transfer.asset.assetCode}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: "Poppins", fontSize: "13px" }}>
                        {transfer.fromStore?.name || "-"}
                        {transfer.fromStore?.storeCode && (
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            ({transfer.fromStore.storeCode})
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: "Poppins", fontSize: "13px" }}>
                        {transfer.toStore?.name || "-"}
                        {transfer.toStore?.storeCode && (
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            ({transfer.toStore.storeCode})
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: "Poppins", fontSize: "13px", fontWeight: 600 }}>
                        {transfer.quantity || 0}
                      </td>
                      <td style={{ fontFamily: "Poppins", fontSize: "13px" }}>
                        {transfer.reason || "-"}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 500,
                            backgroundColor:
                              transfer.status === "completed"
                                ? "#d1fae5"
                                : transfer.status === "pending"
                                ? "#fef3c7"
                                : transfer.status === "cancelled"
                                ? "#fee2e2"
                                : "#e5e7eb",
                            color:
                              transfer.status === "completed"
                                ? "#065f46"
                                : transfer.status === "pending"
                                ? "#92400e"
                                : transfer.status === "cancelled"
                                ? "#991b1b"
                                : "#374151",
                          }}
                        >
                          {transfer.status || "pending"}
                        </span>
                      </td>
                      <td style={{ fontFamily: "Poppins", fontSize: "13px" }}>
                        {transfer.transferDate
                          ? new Date(transfer.transferDate).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </td>
                      <td style={{ fontFamily: "Poppins", fontSize: "13px", fontWeight: 600 }}>
                        {transfer.totals?.grandTotal
                          ? `₹${transfer.totals.grandTotal.toLocaleString("en-IN")}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isErrorModalOpen && (
        <ErrorModal
          isOpen={isErrorModalOpen}
          message={error}
          onClose={closeErrorModal}
        />
      )}

      {isSuccessModalOpen && (
        <SuccessModal
          isOpen={isSuccessModalOpen}
          message={successMessage}
          onClose={closeSuccessModal}
        />
      )}
    </div>
  );
}
