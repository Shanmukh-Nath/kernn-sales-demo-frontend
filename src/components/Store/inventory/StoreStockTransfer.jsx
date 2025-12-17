import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth";
import ErrorModal from "@/components/ErrorModal";
import LoadingAnimation from "@/components/LoadingAnimation";
import inventoryAni from "../../../images/animations/fetchingAnimation.gif";
import styles from "../../Dashboard/HomePage/HomePage.module.css";
import storeService from "../../../services/storeService";

function StoreStockTransfer() {
  const navigate = useNavigate();
  const { axiosAPI } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [storesWarning, setStoresWarning] = useState("");

  // Store data
  const [currentStore, setCurrentStore] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedDestinationStore, setSelectedDestinationStore] = useState("");
  const [currentStock, setCurrentStock] = useState([]);

  // Transfer items
  const [transferItems, setTransferItems] = useState({}); // { productId: { quantity, product } }

  useEffect(() => {
    fetchCurrentStore();
  }, []);

  useEffect(() => {
    if (currentStore?.id) {
      fetchCurrentStock();
      fetchStores();
    }
  }, [currentStore]);

  const fetchCurrentStore = async () => {
    try {
      setLoading(true);
      let storeId = null;
      
      // Try from selectedStore in localStorage
      const selectedStore = localStorage.getItem("selectedStore");
      if (selectedStore) {
        try {
          const store = JSON.parse(selectedStore);
          storeId = store.id;
        } catch (e) {
          console.error("Error parsing selectedStore:", e);
        }
      }
      
      // Fallback to currentStoreId
      if (!storeId) {
        const currentStoreId = localStorage.getItem("currentStoreId");
        storeId = currentStoreId ? parseInt(currentStoreId) : null;
      }
      
      // Fallback to user object
      if (!storeId) {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const user = userData.user || userData;
        storeId = user?.storeId || user?.store?.id;
      }
      
      if (!storeId) {
        throw new Error("Store information missing. Please re-login to continue.");
      }

      // Fetch store details from backend
      const res = await storeService.getStoreById(storeId);
      const store = res.store || res.data || res;
      if (store && store.id) {
        setCurrentStore(store);
      } else {
        throw new Error("Store not found");
      }
    } catch (err) {
      console.error('Error fetching current store:', err);
      setError(err.response?.data?.message || err.message || "Error fetching store information");
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    if (!currentStore?.id) return;
    
    setLoading(true);
    try {
      const response = await storeService.getDestinationStores(currentStore.id);
      const storesData = response.data || response.stores || response || [];
      const mappedStores = Array.isArray(storesData) ? storesData.map(store => ({
        id: store.id,
        name: store.name || store.storeName,
        storeCode: store.storeCode || store.code,
        storeType: store.storeType || store.type || "own",
        type: store.type || store.storeType || "own",
        division: store.division || null
      })) : [];
      
      setStores(mappedStores);
      if (mappedStores.length === 0) {
        setStoresWarning("No destination stores available for transfer.");
      } else {
        setStoresWarning("");
      }
    } catch (err) {
      console.error('Error fetching destination stores:', err);
      setError(err.response?.data?.message || err.message || "Error fetching destination stores");
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentStock = async () => {
    if (!currentStore?.id) return;
    
    setLoading(true);
    try {
      const response = await storeService.getAvailableStockForTransfer(currentStore.id);
      const stockData = response.data || response.stock || response || [];
      
      // Map backend response to frontend format
      const mappedStock = Array.isArray(stockData) ? stockData.map(item => ({
        id: item.productId,
        productId: item.productId,
        productName: item.productName || item.name,
        productCode: item.sku || item.SKU || item.productCode,
        currentStock: item.available || item.quantity || 0,
        available: item.available || item.quantity || 0,
        unit: item.unit || "kg",
        unitPrice: item.customPrice || item.basePrice || 0,
        basePrice: item.basePrice || 0,
        customPrice: item.customPrice || null,
        productType: item.productType || "packed"
      })) : [];
      
      setCurrentStock(mappedStock);
    } catch (err) {
      console.error('Error fetching available stock:', err);
      setError(err.response?.data?.message || err.message || "Error fetching available stock");
      setCurrentStock([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId, quantity) => {
    const product = currentStock.find(p => p.id === productId || p.productId === productId);
    if (!product) return;

    const qty = parseFloat(quantity) || 0;
    if (qty < 0) return;
    const availableStock = product.available || product.currentStock || 0;
    if (qty > availableStock) {
      setError(`Quantity cannot exceed available stock (${availableStock} ${product.unit})`);
      return;
    }

    if (qty === 0) {
      setTransferItems(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } else {
      setTransferItems(prev => ({
        ...prev,
        [productId]: {
          quantity: qty,
          product: product
        }
      }));
    }
  };

  const getDestinationStore = () => {
    return stores.find(s => s.id === parseInt(selectedDestinationStore));
  };

  const getTransferType = () => {
    if (!currentStore || !selectedDestinationStore) return null;
    
    const destinationStore = getDestinationStore();
    if (!destinationStore) return null;

    // Check if both stores are own stores or franchise stores
    const currentStoreType = currentStore.storeType || currentStore.type || "own";
    const destStoreType = destinationStore.storeType || destinationStore.type || "own";

    // If transfer from own store to franchise store, it's a sale
    if (currentStoreType === "own" && destStoreType === "franchise") {
      return "sale";
    }
    
    // If transfer between two own stores, it's a stock transfer
    if (currentStoreType === "own" && destStoreType === "own") {
      return "stock_transfer";
    }

    // Default to stock transfer for other cases
    return "stock_transfer";
  };

  const handleSubmit = async () => {
    if (!selectedDestinationStore) {
      setError("Please select a destination store");
      return;
    }

    const items = Object.values(transferItems);
    if (items.length === 0) {
      setError("Please add at least one product to transfer");
      return;
    }

    // Validate quantities
    for (const item of items) {
      if (item.quantity <= 0) {
        setError(`Invalid quantity for ${item.product.productName}`);
        return;
      }
      const availableStock = item.product.available || item.product.currentStock || 0;
      if (item.quantity > availableStock) {
        setError(`Quantity exceeds available stock for ${item.product.productName}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const transferType = getTransferType();
      const destinationStore = getDestinationStore();

      const payload = {
        fromStoreId: currentStore.id,
        toStoreId: parseInt(selectedDestinationStore),
        items: items.map(item => ({
          productId: item.product.productId || item.product.id,
          quantity: item.quantity
        })),
        notes: `Stock transfer from ${currentStore.name || 'Current Store'} to ${destinationStore?.name || 'Destination Store'}`
      };

      const res = await storeService.createStockTransfer(payload);
      const transferData = res.data || res;
      const transferCode = transferData?.transfer?.transferCode || transferData?.transferCode || res.transferCode || 'N/A';
      
      setSuccessMessage(
        `Stock transfer completed successfully! Transfer Code: ${transferCode}`
      );

      // Clear form
      setTransferItems({});
      setSelectedDestinationStore("");
      
      // Refresh stock
      setTimeout(() => {
        fetchCurrentStock();
        setSuccessMessage("");
      }, 3000);

    } catch (err) {
      console.error('Error submitting stock transfer:', err);
      setError(err?.response?.data?.message || "Failed to submit stock transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const closeErrorModal = () => {
    setError(null);
  };

  const transferItemsList = Object.values(transferItems);
  const totalItems = transferItemsList.reduce((sum, item) => sum + item.quantity, 0);
  const transferType = getTransferType();
  const destinationStore = getDestinationStore();

  return (
    <div style={{ padding: '20px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontFamily: 'Poppins', 
          fontWeight: 700, 
          fontSize: '28px', 
          color: 'var(--primary-color)',
          margin: 0,
          marginBottom: '8px'
        }}>Stock Transfer</h2>
        <p className="path">
          <span onClick={() => navigate("/store/inventory")}>Inventory</span>{" "}
          <i className="bi bi-chevron-right"></i> Stock Transfer
        </p>
      </div>

      {/* Loading Animation */}
      {loading && <LoadingAnimation gif={inventoryAni} msg="Loading stock data..." />}

      {/* Error Modal */}
      {error && <ErrorModal message={error} onClose={closeErrorModal} />}

      {/* Success Message */}
      {successMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #86efac',
          marginBottom: '16px',
          fontFamily: 'Poppins',
          fontWeight: 600
        }}>
          {successMessage}
        </div>
      )}

      {/* Stores Warning */}
      {storesWarning && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fcd34d',
          marginBottom: '16px',
          fontFamily: 'Poppins',
          fontSize: '14px'
        }}>
          <strong>⚠️ Warning:</strong> {storesWarning}
        </div>
      )}

      {!loading && currentStore && (
        <>
          {/* Store Information */}
          <div className={styles.orderStatusCard} style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: 0, marginBottom: '16px', fontFamily: 'Poppins', fontWeight: 600, fontSize: '20px', color: 'var(--primary-color)' }}>
              Transfer Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontFamily: 'Poppins', fontSize: '13px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
                  From Store (Source)
                </label>
                <div style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                  {currentStore.name || 'Current Store'}
                </div>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#6b7280' }}>
                  Type: {(currentStore.storeType || currentStore.type || 'own').toUpperCase()}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'Poppins', fontSize: '13px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
                  To Store (Destination)
                </label>
                <select
                  className="form-control"
                  value={selectedDestinationStore}
                  onChange={(e) => setSelectedDestinationStore(e.target.value)}
                  style={{ fontFamily: 'Poppins', fontSize: '14px' }}
                >
                  <option value="">Select destination store...</option>
                  {stores
                    .filter(store => store.id !== currentStore.id)
                    .map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name} ({(store.storeType || store.type || 'own').toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>
              {destinationStore && (
                <div>
                  <label style={{ fontFamily: 'Poppins', fontSize: '13px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>
                    Transfer Type
                  </label>
                  <div style={{ 
                    fontFamily: 'Poppins', 
                    fontSize: '15px', 
                    fontWeight: 600,
                    color: transferType === 'sale' ? '#dc2626' : '#059669'
                  }}>
                    {transferType === 'sale' ? 'SALE' : 'STOCK TRANSFER'}
                  </div>
                  <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#6b7280' }}>
                    {transferType === 'sale' 
                      ? 'Own store to Franchise store'
                      : 'Own store to Own store'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Available Stock */}
          <div className={styles.orderStatusCard} style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: 0, marginBottom: '16px', fontFamily: 'Poppins', fontWeight: 600, fontSize: '20px', color: 'var(--primary-color)' }}>
              Available Stock
            </h4>
            {currentStock.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p style={{ fontFamily: 'Poppins' }}>No stock available for transfer</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table table-bordered borderedtable table-sm" style={{ fontFamily: 'Poppins' }}>
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Product</th>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Available</th>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Unit</th>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Transfer Qty</th>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStock
                      .filter(product => (product.available || product.currentStock || 0) > 0)
                      .map((product, index) => {
                        const productId = product.id || product.productId;
                        const availableStock = product.available || product.currentStock || 0;
                        const transferItem = transferItems[productId];
                        const transferQty = transferItem?.quantity || 0;
                        return (
                          <tr key={productId} style={{ background: index % 2 === 0 ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
                            <td style={{ fontFamily: 'Poppins', fontSize: '13px' }}>
                              <div style={{ fontWeight: 600 }}>{product.productName}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{product.productCode || product.sku}</div>
                            </td>
                            <td style={{ fontFamily: 'Poppins', fontSize: '13px' }}>
                              {Number(availableStock || 0).toFixed(2)}
                            </td>
                            <td style={{ fontFamily: 'Poppins', fontSize: '13px' }}>{product.unit}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max={availableStock}
                                step="0.01"
                                value={transferQty}
                                onChange={(e) => handleQuantityChange(productId, e.target.value)}
                                style={{
                                  width: '100px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #000',
                                  fontFamily: 'Poppins',
                                  fontSize: '13px',
                                  backgroundColor: '#fff',
                                  color: '#000'
                                }}
                                placeholder="0"
                              />
                            </td>
                            <td>
                              {transferQty > 0 && (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleQuantityChange(productId, 0)}
                                  style={{ fontFamily: 'Poppins', fontSize: '12px' }}
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transfer Summary */}
          {transferItemsList.length > 0 && (
            <div className={styles.orderStatusCard} style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: 0, marginBottom: '16px', fontFamily: 'Poppins', fontWeight: 600, fontSize: '20px', color: 'var(--primary-color)' }}>
                Transfer Summary
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="table table-bordered borderedtable table-sm" style={{ fontFamily: 'Poppins' }}>
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Product</th>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Quantity</th>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Unit</th>
                      <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferItemsList.map((item, index) => (
                      <tr key={item.product.id || item.product.productId} style={{ background: index % 2 === 0 ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
                        <td style={{ fontFamily: 'Poppins', fontSize: '13px' }}>
                          <div style={{ fontWeight: 600 }}>{item.product.productName}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{item.product.productCode || item.product.sku}</div>
                        </td>
                        <td style={{ fontFamily: 'Poppins', fontSize: '13px', fontWeight: 600 }}>
                          {Number(item.quantity || 0).toFixed(2)}
                        </td>
                        <td style={{ fontFamily: 'Poppins', fontSize: '13px' }}>{item.product.unit}</td>
                        <td>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleQuantityChange(item.product.id || item.product.productId, 0)}
                            style={{ fontFamily: 'Poppins', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', fontFamily: 'Poppins' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#475569' }}>Total Items</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{transferItemsList.length} products</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#475569' }}>Total Quantity</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)' }}>{totalItems} units</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              className="btn btn-light"
              onClick={() => navigate('/store/inventory')}
              disabled={submitting}
              style={{ fontFamily: 'Poppins' }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || transferItemsList.length === 0 || !selectedDestinationStore}
              style={{ fontFamily: 'Poppins' }}
            >
              {submitting ? 'Submitting...' : transferType === 'sale' ? 'Record Sale' : 'Transfer Stock'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default StoreStockTransfer;

