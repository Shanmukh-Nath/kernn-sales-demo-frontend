import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth";
import { isStoreEmployee } from "../../../utils/roleUtils";
import ErrorModal from "@/components/ErrorModal";
import SuccessModal from "@/components/SuccessModal";
import Loading from "@/components/Loading";
import storeService from "../../../services/storeService";
import styles from "../../Dashboard/HomePage/HomePage.module.css";

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const initialUpdateForm = {
  assetDate: "",
  itemName: "",
  quantity: "",
  value: "",
  tax: "",
  notes: "",
};

export default function StoreAssets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actualUser = user?.user || user || {};
  const inferredStoreId = actualUser?.storeId || actualUser?.store?.id || null;
  const isEmployee = isStoreEmployee(actualUser);

  const [storeId, setStoreId] = useState(inferredStoreId);
  const [assets, setAssets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [query, setQuery] = useState({ page: 1, limit: 10 });
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [updateForm, setUpdateForm] = useState(initialUpdateForm);
  const [stockInQty, setStockInQty] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    assetDate: new Date().toISOString().slice(0, 10),
    itemName: "",
    quantity: "",
    value: "",
    tax: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const showError = useCallback((message) => {
    setError(message || "Something went wrong. Please try again.");
    setIsErrorModalOpen(true);
  }, []);

  const showSuccess = useCallback((message) => {
    setSuccessMessage(message || "Action completed successfully.");
    setIsSuccessModalOpen(true);
  }, []);

  useEffect(() => {
    if (!storeId) {
      try {
        // Get store ID from user context - try multiple sources
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const user = userData.user || userData;
        let id = user?.storeId || user?.store?.id;
        
        // Fallback to other localStorage keys
        if (!id) {
          const selectedStore = localStorage.getItem("selectedStore");
          if (selectedStore) {
            const store = JSON.parse(selectedStore);
            id = store.id;
          }
        }
        
        if (!id) {
          const currentStoreId = localStorage.getItem("currentStoreId");
          id = currentStoreId ? parseInt(currentStoreId) : null;
        }
        
        if (id) {
          setStoreId(id);
        } else {
          showError("Store information missing. Please re-login to continue.");
        }
      } catch (err) {
        console.error("Unable to parse stored user data", err);
        showError("Unable to determine store information. Please re-login.");
      }
    }
  }, [storeId, showError]);

  const fetchStoreAssets = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const params = {
        page: query.page,
        limit: query.limit
      };
      
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const res = await storeService.getStoreAssets(storeId, params);
      const assetsData = res.data || res.assets || res || [];
      const paginationData = res.pagination || {};
      
      // Map backend response to frontend format
      const mappedAssets = Array.isArray(assetsData) ? assetsData.map(item => ({
        id: item.id,
        assetCode: item.assetCode || item.code || `AST-${item.id}`,
        assetDate: item.assetDate || item.date || item.createdAt,
        itemName: item.itemName || item.name || "-",
        requestedQuantity: parseFloat(item.requestedQuantity || item.quantity || 0),
        quantity: parseFloat(item.quantity || item.requestedQuantity || 0),
        receivedQuantity: parseFloat(item.receivedQuantity || 0),
        value: parseFloat(item.value || 0),
        tax: parseFloat(item.tax || 0),
        total: parseFloat(item.total || (item.value + item.tax) || 0),
        status: item.status || "pending",
        notes: item.notes || "",
        store: item.store || { name: "-" },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })) : [];

      setAssets(mappedAssets);
      setPagination({
        page: paginationData.page || query.page,
        limit: paginationData.limit || query.limit,
        total: paginationData.total || mappedAssets.length,
        totalPages: paginationData.totalPages || Math.ceil((paginationData.total || mappedAssets.length) / query.limit) || 1,
      });
    } catch (err) {
      console.error("Failed to fetch store assets", err);
      showError(err.response?.data?.message || err.message || "Failed to fetch store assets");
    } finally {
      setLoading(false);
    }
  }, [storeId, query.page, query.limit, statusFilter, showError]);

  useEffect(() => {
    if (storeId) {
      fetchStoreAssets();
    }
  }, [storeId, fetchStoreAssets]);

  const loadAssetDetails = useCallback(
    async (assetId, { silent = false } = {}) => {
      if (!storeId || !assetId) return;
      if (!silent) {
        setDetailLoading(true);
      }
      try {
        const res = await storeService.getStoreAssetById(storeId, assetId);
        const data = res.data || res.asset || res;
        
        if (data && data.id) {
          const mappedData = {
            id: data.id,
            assetCode: data.assetCode || data.code || `AST-${data.id}`,
            assetDate: data.assetDate || data.date || data.createdAt,
            itemName: data.itemName || data.name || "-",
            requestedQuantity: parseFloat(data.requestedQuantity || data.quantity || 0),
            quantity: parseFloat(data.quantity || data.requestedQuantity || 0),
            receivedQuantity: parseFloat(data.receivedQuantity || 0),
            value: parseFloat(data.value || 0),
            tax: parseFloat(data.tax || 0),
            total: parseFloat(data.total || (data.value + data.tax) || 0),
            status: data.status || "pending",
            notes: data.notes || "",
            store: data.store || { name: "-" },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
          
          setSelectedAsset(mappedData);
          setUpdateForm({
            assetDate: mappedData.assetDate ? mappedData.assetDate.split("T")[0] : "",
            itemName: mappedData.itemName || "",
            quantity: mappedData.quantity.toString(),
            value: mappedData.value.toString(),
            tax: mappedData.tax.toString(),
            notes: mappedData.notes || "",
          });
          setStockInQty("");
        } else {
          throw new Error("Asset not found.");
        }
      } catch (err) {
        console.error("Failed to load asset details", err);
        showError(err.response?.data?.message || err.message || "Failed to load asset details");
      } finally {
        if (!silent) {
          setDetailLoading(false);
        }
      }
    },
    [storeId, showError]
  );

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    const needle = searchTerm.toLowerCase();
    return assets.filter((asset) => {
      const code = asset.assetCode?.toLowerCase() || "";
      const name = asset.itemName?.toLowerCase() || "";
      return code.includes(needle) || name.includes(needle);
    });
  }, [assets, searchTerm]);

  const totalValue = useMemo(
    () => filteredAssets.reduce((sum, asset) => sum + Number(asset.total ?? asset.value ?? 0), 0),
    [filteredAssets]
  );

  const maxReceivable = useMemo(() => {
    if (!selectedAsset) return 0;
    const requested = Number(selectedAsset.requestedQuantity || selectedAsset.quantity || 0);
    const received = Number(selectedAsset.receivedQuantity || 0);
    return Math.max(requested - received, 0);
  }, [selectedAsset]);

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setQuery((prev) => ({ ...prev, page: 1 }));
  };

  const handleLimitChange = (value) => {
    setQuery((prev) => ({ ...prev, limit: Number(value) || 10, page: 1 }));
  };

  const handlePageChange = (direction) => {
    setQuery((prev) => {
      const totalPages = pagination.totalPages || 1;
      const nextPage = direction === "next" ? prev.page + 1 : prev.page - 1;
      if (nextPage < 1 || nextPage > totalPages) {
        return prev;
      }
      return { ...prev, page: nextPage };
    });
  };

  const handleUpdateInputChange = (field, value) => {
    setUpdateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectAsset = (assetId) => {
    loadAssetDetails(assetId);
  };

  const handleUpdateAsset = async (event) => {
    event.preventDefault();
    if (!selectedAsset || !storeId) return;
    if (selectedAsset.status !== "pending") {
      showError("Only assets in pending status can be updated.");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        assetDate: updateForm.assetDate,
        itemName: updateForm.itemName,
        quantity: Number(updateForm.quantity || 0),
        requestedQuantity: Number(updateForm.quantity || 0),
        value: Number(updateForm.value || 0),
        tax: Number(updateForm.tax || 0),
        notes: updateForm.notes || "",
      };
      
      const res = await storeService.updateStoreAsset(storeId, selectedAsset.id, payload);
      const updatedData = res.data || res.asset || res;
      
      if (updatedData && updatedData.id) {
        const mappedData = {
          id: updatedData.id,
          assetCode: updatedData.assetCode || updatedData.code || `AST-${updatedData.id}`,
          assetDate: updatedData.assetDate || updatedData.date || updatedData.createdAt,
          itemName: updatedData.itemName || updatedData.name || "-",
          requestedQuantity: parseFloat(updatedData.requestedQuantity || updatedData.quantity || 0),
          quantity: parseFloat(updatedData.quantity || updatedData.requestedQuantity || 0),
          receivedQuantity: parseFloat(updatedData.receivedQuantity || 0),
          value: parseFloat(updatedData.value || 0),
          tax: parseFloat(updatedData.tax || 0),
          total: parseFloat(updatedData.total || (updatedData.value + updatedData.tax) || 0),
          status: updatedData.status || "pending",
          notes: updatedData.notes || "",
          store: updatedData.store || { name: "-" },
          createdAt: updatedData.createdAt,
          updatedAt: updatedData.updatedAt
        };
        
        setSelectedAsset(mappedData);
        showSuccess(res.message || "Asset updated successfully.");
        await fetchStoreAssets();
      } else {
        showSuccess("Asset updated successfully.");
        await fetchStoreAssets();
      }
    } catch (err) {
      console.error("Failed to update asset", err);
      showError(err.response?.data?.message || err.message || "Failed to update asset");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStockIn = async (event) => {
    event.preventDefault();
    if (!selectedAsset || !storeId) return;

    const qty = Number(stockInQty || 0);
    if (!qty) {
      showError("Enter the received quantity to continue.");
      return;
    }
    if (qty > maxReceivable) {
      showError(`You can receive a maximum of ${maxReceivable} units.`);
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        receivedQuantity: qty
      };
      
      const res = await storeService.stockInStoreAsset(storeId, selectedAsset.id, payload);
      const updatedData = res.data || res.asset || res;
      
      if (updatedData && updatedData.id) {
        const mappedData = {
          id: updatedData.id,
          assetCode: updatedData.assetCode || updatedData.code || `AST-${updatedData.id}`,
          assetDate: updatedData.assetDate || updatedData.date || updatedData.createdAt,
          itemName: updatedData.itemName || updatedData.name || "-",
          requestedQuantity: parseFloat(updatedData.requestedQuantity || updatedData.quantity || 0),
          quantity: parseFloat(updatedData.quantity || updatedData.requestedQuantity || 0),
          receivedQuantity: parseFloat(updatedData.receivedQuantity || 0),
          value: parseFloat(updatedData.value || 0),
          tax: parseFloat(updatedData.tax || 0),
          total: parseFloat(updatedData.total || (updatedData.value + updatedData.tax) || 0),
          status: updatedData.status || "pending",
          notes: updatedData.notes || "",
          store: updatedData.store || { name: "-" },
          createdAt: updatedData.createdAt,
          updatedAt: updatedData.updatedAt
        };
        
        setSelectedAsset(mappedData);
        showSuccess(res.message || "Stock in processed successfully.");
        setStockInQty("");
        await fetchStoreAssets();
      } else {
        showSuccess("Stock in processed successfully.");
        setStockInQty("");
        await fetchStoreAssets();
      }
    } catch (err) {
      console.error("Failed to process stock in", err);
      showError(err.response?.data?.message || err.message || "Failed to process stock in");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset || !storeId || selectedAsset.status !== "pending") {
      showError("Only pending assets can be deleted.");
      return;
    }
    const confirmDelete = window.confirm(`Delete asset ${selectedAsset.assetCode}? This action cannot be undone.`);
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const res = await storeService.deleteStoreAsset(storeId, selectedAsset.id);
      
      setSelectedAsset(null);
      setUpdateForm(initialUpdateForm);
      setStockInQty("");
      showSuccess(res.message || "Asset deleted successfully.");
      await fetchStoreAssets();
    } catch (err) {
      console.error("Failed to delete asset", err);
      showError(err.response?.data?.message || err.message || "Failed to delete asset");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateInputChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateAsset = async (event) => {
    event.preventDefault();
    if (!storeId) {
      showError("Store information missing.");
      return;
    }

    if (!createForm.itemName || !createForm.quantity || !createForm.value) {
      showError("Please fill in all required fields (Item Name, Quantity, Value).");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        storeId: storeId,
        assetDate: createForm.assetDate,
        itemName: createForm.itemName,
        quantity: Number(createForm.quantity || 0),
        requestedQuantity: Number(createForm.quantity || 0),
        value: Number(createForm.value || 0),
        tax: Number(createForm.tax || 0),
        notes: createForm.notes || "",
      };
      
      const res = await storeService.createStoreAsset(payload);
      
      showSuccess(res.message || "Asset created successfully.");
      setShowCreateForm(false);
      setCreateForm({
        assetDate: new Date().toISOString().slice(0, 10),
        itemName: "",
        quantity: "",
        value: "",
        tax: "",
        notes: "",
      });
      await fetchStoreAssets();
    } catch (err) {
      console.error("Failed to create asset", err);
      showError(err.response?.data?.message || err.message || "Failed to create asset");
    } finally {
      setActionLoading(false);
    }
  };

  const closeErrorModal = () => setIsErrorModalOpen(false);
  const closeSuccessModal = () => setIsSuccessModalOpen(false);

  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
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
            Store Assets
          </h2>
          <p className="path">
          Assets
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {!isEmployee && (
            <>
              <button 
                className="homebtn" 
                onClick={() => setShowCreateForm(!showCreateForm)} 
                style={{ fontFamily: "Poppins", background: showCreateForm ? "#f3f4f6" : undefined }}
              >
                {showCreateForm ? "Cancel" : "Create Asset"}
              </button>
              <button className="homebtn" onClick={() => navigate("/store/assets/transfer")} style={{ fontFamily: "Poppins" }}>
                Asset Transfer
              </button>
            </>
          )}
        </div>
      </div>

      {!storeId && (
        <div className={styles.orderStatusCard} style={{ marginBottom: "24px" }}>
          <p style={{ margin: 0, fontFamily: "Poppins" }}>Store details are missing. Please re-login to continue.</p>
        </div>
      )}

      {storeId && (
        <>
          {/* Create Asset Form */}
          {showCreateForm && (
            <div className={styles.orderStatusCard} style={{ marginBottom: "24px" }}>
              <h4
                style={{
                  margin: 0,
                  marginBottom: "20px",
                  fontFamily: "Poppins",
                  fontWeight: 600,
                  fontSize: "20px",
                  color: "var(--primary-color)",
                }}
              >
                Create New Asset
              </h4>
              <form onSubmit={handleCreateAsset}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <label>Date</label>
                    <input
                      type="date"
                      value={createForm.assetDate}
                      onChange={(e) => handleCreateInputChange("assetDate", e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontFamily: "Poppins",
                        backgroundColor: "#fff",
                        color: "#000",
                      }}
                    />
                  </div>
                  <div>
                    <label>Item Name</label>
                    <input
                      type="text"
                      value={createForm.itemName}
                      onChange={(e) => handleCreateInputChange("itemName", e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontFamily: "Poppins",
                        backgroundColor: "#fff",
                        color: "#000",
                      }}
                    />
                  </div>
                  <div>
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={createForm.quantity}
                      onChange={(e) => handleCreateInputChange("quantity", e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontFamily: "Poppins",
                        backgroundColor: "#fff",
                        color: "#000",
                      }}
                    />
                  </div>
                  <div>
                    <label>Value (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.value}
                      onChange={(e) => handleCreateInputChange("value", e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontFamily: "Poppins",
                        backgroundColor: "#fff",
                        color: "#000",
                      }}
                    />
                  </div>
                  <div>
                    <label>Tax (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.tax}
                      onChange={(e) => handleCreateInputChange("tax", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontFamily: "Poppins",
                        backgroundColor: "#fff",
                        color: "#000",
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label>Notes</label>
                    <textarea
                      rows="2"
                      value={createForm.notes}
                      onChange={(e) => handleCreateInputChange("notes", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontFamily: "Poppins",
                        backgroundColor: "#fff",
                        color: "#000",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button className="homebtn" type="submit" disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create Asset"}
                  </button>
                  <button
                    className="homebtn"
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm({
                        assetDate: new Date().toISOString().slice(0, 10),
                        itemName: "",
                        quantity: "",
                        value: "",
                        tax: "",
                        notes: "",
                      });
                    }}
                    style={{ background: "#f3f4f6", color: "#2563eb" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className={styles.orderStatusCard} style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: "Poppins", fontWeight: 600, fontSize: "20px", color: "var(--primary-color)" }}>
                  Asset Summary
                </h4>
              </div>
              <p style={{ fontFamily: "Poppins", margin: 0, color: "#059669", fontWeight: 600 }}>
                Total Value (page): {formatCurrency(totalValue)}
              </p>
            </div>

            <div className="row m-0 p-3" style={{ marginBottom: "24px" }}>
              <div className={`col-xl-2 col-lg-3 col-md-4 col-sm-6 formcontent`}>
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`col-xl-2 col-lg-3 col-md-4 col-sm-6 formcontent`}>
                <label>Rows per page</label>
                <select value={query.limit} onChange={(e) => handleLimitChange(e.target.value)}>
                  {[10, 25, 50].map((limit) => (
                    <option key={limit} value={limit}>
                      {limit}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`col-xl-2 col-lg-3 col-md-4 col-sm-6 formcontent`}>
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Search by name or code"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-12 mt-3">
                <p style={{ margin: 0, fontFamily: "Poppins", color: "#6b7280" }}>
                  Showing page {pagination.page} of {pagination.totalPages || 1}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.orderStatusCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <h4
                style={{
                  margin: 0,
                  fontFamily: "Poppins",
                  fontWeight: 600,
                  fontSize: "20px",
                  color: "var(--primary-color)",
                }}
              >
                Asset Register ({filteredAssets.length})
              </h4>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button className="cancelbtn" type="button" onClick={() => handlePageChange("prev")} disabled={query.page <= 1}>
                  Prev
                </button>
                <span style={{ fontFamily: "Poppins" }}>
                  Page {pagination.page} / {pagination.totalPages || 1}
                </span>
                <button
                  className="homebtn"
                  type="button"
                  onClick={() => handlePageChange("next")}
                  disabled={pagination.totalPages <= pagination.page}
                >
                  Next
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: "16px" }}>
              <table className="table table-bordered borderedtable table-sm" style={{ fontFamily: "Poppins" }}>
                <thead className="table-light">
                  <tr>
                    <th>S.No</th>
                    <th>Asset Code</th>
                    <th>Date</th>
                    <th>Item Name</th>
                    <th>Requested</th>
                    <th>Received</th>
                    <th>Value (₹)</th>
                    <th>Tax (₹)</th>
                    <th>Total (₹)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: "center", padding: "32px", color: "#666" }}>
                        {loading ? "Loading assets..." : "No assets found"}
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset, index) => (
                      <tr key={asset.id} style={{ background: index % 2 === 0 ? "rgba(59, 130, 246, 0.03)" : "transparent" }}>
                        <td>{index + 1}</td>
                        <td>{asset.assetCode || "-"}</td>
                        <td>{asset.assetDate ? new Date(asset.assetDate).toLocaleDateString("en-IN") : "-"}</td>
                        <td style={{ fontWeight: 600 }}>{asset.itemName || "-"}</td>
                        <td>{asset.requestedQuantity ?? asset.quantity ?? "-"}</td>
                        <td>{asset.receivedQuantity ?? "-"}</td>
                        <td>{formatCurrency(asset.value)}</td>
                        <td>{formatCurrency(asset.tax)}</td>
                        <td>{formatCurrency(asset.total)}</td>
                        <td>
                          <span
                            className={`badge ${
                              asset.status === "completed"
                                ? "bg-success"
                                : asset.status === "pending"
                                ? "bg-warning text-dark"
                                : asset.status === "cancelled"
                                ? "bg-danger"
                                : "bg-secondary"
                            }`}
                          >
                            {asset.status || "-"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <button className="homebtn" style={{ fontSize: "11px" }} type="button" onClick={() => handleSelectAsset(asset.id)}>
                              View Details
                            </button>
                            {!isEmployee && asset.status === "pending" && (
                              <>
                                <button className="homebtn" style={{ fontSize: "11px" }} type="button" onClick={() => handleSelectAsset(asset.id)}>
                                  Edit
                                </button>
                                <button className="cancelbtn" style={{ fontSize: "11px" }} type="button" onClick={() => handleSelectAsset(asset.id)}>
                                  Stock In
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedAsset && (
            <div className={styles.orderStatusCard} style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <h4 style={{ margin: 0, fontFamily: "Poppins", fontWeight: 600, fontSize: "20px", color: "var(--primary-color)" }}>
                    Asset Details
                  </h4>
                  <p style={{ margin: 0, fontFamily: "Poppins", color: "#6b7280" }}>
                    {selectedAsset.assetCode} &middot; Status: {selectedAsset.status}
                  </p>
                </div>
                {!isEmployee && selectedAsset.status === "pending" && (
                  <button className="cancelbtn" type="button" onClick={handleDeleteAsset} disabled={actionLoading}>
                    Delete Asset
                  </button>
                )}
              </div>

              {detailLoading ? (
                <p style={{ marginTop: "16px", fontFamily: "Poppins" }}>Loading details...</p>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "16px" }}>
                    <div>
                      <label>Store</label>
                      <p style={{ fontFamily: "Poppins", fontWeight: 600 }}>{selectedAsset.store?.name || "-"}</p>
                    </div>
                    <div>
                      <label>Requested vs Received</label>
                      <p style={{ fontFamily: "Poppins", fontWeight: 600 }}>
                        {selectedAsset.requestedQuantity ?? selectedAsset.quantity ?? 0} / {selectedAsset.receivedQuantity ?? 0}
                      </p>
                    </div>
                    <div>
                      <label>Total Value</label>
                      <p style={{ fontFamily: "Poppins", fontWeight: 600 }}>{formatCurrency(selectedAsset.total)}</p>
                    </div>
                  </div>

                  {!isEmployee && (
                    <div style={{ marginTop: "24px", display: "grid", gap: "24px" }}>
                      <form onSubmit={handleUpdateAsset}>
                        <h5 style={{ fontFamily: "Poppins", fontWeight: 600 }}>Update Asset</h5>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                          <div>
                            <label>Date</label>
                            <input type="date" value={updateForm.assetDate} onChange={(e) => handleUpdateInputChange("assetDate", e.target.value)} required />
                          </div>
                          <div>
                            <label>Item Name</label>
                            <input type="text" value={updateForm.itemName} onChange={(e) => handleUpdateInputChange("itemName", e.target.value)} required />
                          </div>
                          <div>
                            <label>Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={updateForm.quantity}
                              onChange={(e) => handleUpdateInputChange("quantity", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label>Value (₹)</label>
                            <input type="number" min="0" value={updateForm.value} onChange={(e) => handleUpdateInputChange("value", e.target.value)} required />
                          </div>
                          <div>
                            <label>Tax (₹)</label>
                            <input type="number" min="0" value={updateForm.tax} onChange={(e) => handleUpdateInputChange("tax", e.target.value)} />
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label>Notes</label>
                            <textarea rows="2" value={updateForm.notes} onChange={(e) => handleUpdateInputChange("notes", e.target.value)} />
                          </div>
                        </div>
                        <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
                          <button className="homebtn" type="submit" disabled={actionLoading || selectedAsset.status !== "pending"}>
                            Save Changes
                          </button>
                          <button
                            className="homebtn"
                            type="button"
                            onClick={() => {
                              setSelectedAsset(null);
                              setUpdateForm(initialUpdateForm);
                              setStockInQty("");
                            }}
                            disabled={actionLoading}
                            style={{ background: "#f3f4f6", color: "#374151" }}
                          >
                            Close
                          </button>
                        </div>
                      </form>

                      <form onSubmit={handleStockIn}>
                        <h5 style={{ fontFamily: "Poppins", fontWeight: 600 }}>Process Stock In</h5>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                          <div style={{ flex: "1 1 200px" }}>
                            <label>Received Quantity</label>
                            <input
                              type="number"
                              min="1"
                              max={maxReceivable || undefined}
                              value={stockInQty}
                              onChange={(e) => setStockInQty(e.target.value)}
                              required
                            />
                            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                              Remaining receivable: {maxReceivable} units
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
                            <button className="homebtn" type="submit" disabled={actionLoading || maxReceivable === 0}>
                              Stock In
                            </button>
                            <button
                              className="homebtn"
                              type="button"
                              onClick={() => {
                                setSelectedAsset(null);
                                setUpdateForm(initialUpdateForm);
                                setStockInQty("");
                              }}
                              disabled={actionLoading}
                              style={{ background: "#f3f4f6", color: "#374151" }}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {(loading || detailLoading || actionLoading) && <Loading />}
      <ErrorModal isOpen={isErrorModalOpen} message={error} onClose={closeErrorModal} />
      <SuccessModal isOpen={isSuccessModalOpen} message={successMessage} onClose={closeSuccessModal} />
    </div>
  );
}