import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth";
import styles from "../../Dashboard/Purchases/Purchases.module.css";
import { FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import Loading from "@/components/Loading";
import ErrorModal from "@/components/ErrorModal";
import storeService from "../../../services/storeService";

export default function ViewAllIndents() {
  const navigate = useNavigate();
  const { axiosAPI } = useAuth();
  const [storeId, setStoreId] = useState(null);
  const [pageNo, setPageNo] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [indents, setIndents] = useState([]);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Stock In states
  const [showStockIn, setShowStockIn] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [hasDamagedGoods, setHasDamagedGoods] = useState(false);
  const [damagedGoodsRows, setDamagedGoodsRows] = useState([]);
  const [stockInLoading, setStockInLoading] = useState(false);

  // Get store ID from localStorage
  useEffect(() => {
    try {
      // Get store ID from multiple sources
      let id = null;
      
      // Try from selectedStore in localStorage
      const selectedStore = localStorage.getItem("selectedStore");
      if (selectedStore) {
        try {
          const store = JSON.parse(selectedStore);
          id = store.id;
        } catch (e) {
          console.error("Error parsing selectedStore:", e);
        }
      }
      
      // Fallback to currentStoreId
      if (!id) {
        const currentStoreId = localStorage.getItem("currentStoreId");
        id = currentStoreId ? parseInt(currentStoreId) : null;
      }
      
      // Fallback to user object
      if (!id) {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const user = userData.user || userData;
        id = user?.storeId || user?.store?.id;
      }
      
      if (id) {
        setStoreId(id);
      } else {
        setError("Store information missing. Please re-login to continue.");
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Unable to parse stored user data", err);
      setError("Unable to determine store information. Please re-login.");
      setIsModalOpen(true);
    }
  }, []);

  // Fetch indents from backend
  useEffect(() => {
    if (storeId) {
      fetchIndents();
    }
  }, [storeId, pageNo, limit]);

  const fetchIndents = async () => {
    if (!storeId) return;
    
    try {
      setLoading(true);
      const params = {
        page: pageNo,
        limit: limit
      };
      
      const res = await storeService.getStoreIndents(storeId, params);
      
      // Handle different response formats
      const indentsData = res.data?.indents || res.data || res.indents || res || [];
      const total = res.data?.total || res.total || indentsData.length;
      
      // Map backend response to UI format
      const mappedIndents = Array.isArray(indentsData) ? indentsData.map(indent => ({
        id: indent.id,
        code: indent.indentCode || indent.code || `IND${String(indent.id).padStart(6, '0')}`,
        value: indent.totalAmount || indent.value || 0,
        status: mapStatus(indent.status),
        originalStatus: indent.status?.toLowerCase() || indent.status, // Store original backend status
        date: formatDate(indent.createdAt || indent.date),
        itemCount: indent.items?.length || indent.itemCount || 0,
        storeName: indent.store?.name || indent.storeName || "Store",
        notes: indent.notes || "",
        items: indent.items || []
      })) : [];
      
      setIndents(mappedIndents);
      setTotalPages(Math.ceil(total / limit) || 1);
    } catch (err) {
      console.error("Error fetching indents:", err);
      setError(err.response?.data?.message || err.message || "Error fetching indents");
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Map backend status to UI status
  const mapStatus = (status) => {
    const statusMap = {
      "pending": "Awaiting Approval",
      "approved": "Approved",
      "rejected": "Rejected",
      "processing": "Waiting for Stock",
      "completed": "Stocked In",
      "stocked_in": "Stocked In"
    };
    return statusMap[status?.toLowerCase()] || status || "Awaiting Approval";
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "Awaiting Approval": { class: "bg-warning", icon: <FaClock /> },
      "Waiting for Stock": { class: "bg-info", icon: <FaClock /> },
      "Approved": { class: "bg-success", icon: <FaCheckCircle /> },
      "Rejected": { class: "bg-danger", icon: <FaTimesCircle /> }
    };
    return statusMap[status] || { class: "bg-secondary", icon: <FaFileAlt /> };
  };

  const handleViewClick = (indent) => {
    setSelectedIndent(indent);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedIndent(null);
    setShowStockIn(false);
    setReceivedQuantities({});
    setHasDamagedGoods(false);
    setDamagedGoodsRows([]);
  };

  const handleStockIn = () => {
    if (selectedIndent) {
      // Initialize received quantities with requested quantities
      const initialQuantities = {};
      const items = selectedIndent.items || selectedIndent.products || [];
      items.forEach((item, index) => {
        const productId = item.productId || item.id;
        initialQuantities[productId] = item.requestedQuantity || item.quantity || 0;
      });
      setReceivedQuantities(initialQuantities);
      setShowStockIn(true);
    }
  };

  const handleCancelStockIn = () => {
    setShowStockIn(false);
    setReceivedQuantities({});
    setHasDamagedGoods(false);
    setDamagedGoodsRows([]);
  };

  const handleReceivedQuantityChange = (productId, value) => {
    setReceivedQuantities(prev => ({
      ...prev,
      [productId]: parseFloat(value) || 0
    }));
  };

  const handleDamagedGoodsToggle = (checked) => {
    setHasDamagedGoods(checked);
    if (checked) {
      // Initialize damaged goods rows from items
      const items = selectedIndent.items || selectedIndent.products || [];
      const initialRows = items.map((item, index) => ({
        productId: item.productId || item.id,
        productName: item.product?.name || item.productName || `Product ${item.productId || item.id}`,
        orderedQty: item.requestedQuantity || item.quantity || 0,
        damagedQty: 0,
        reason: "",
        image: null,
        imageBase64: null,
        imagePreview: null
      }));
      setDamagedGoodsRows(initialRows);
    } else {
      setDamagedGoodsRows([]);
    }
  };

  const handleDamagedGoodsChange = (index, field, value) => {
    setDamagedGoodsRows(prev => {
      const newRows = [...prev];
      const newValue = field === 'damagedQty' ? Math.min(parseFloat(value) || 0, newRows[index].orderedQty) : value;
      newRows[index] = { ...newRows[index], [field]: newValue };
      return newRows;
    });
  };

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      setIsModalOpen(true);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      setIsModalOpen(true);
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setDamagedGoodsRows(prev => {
          const newRows = [...prev];
          newRows[index] = {
            ...newRows[index],
            image: file,
            imageBase64: base64String,
            imagePreview: base64String
          };
          return newRows;
        });
      };
      reader.onerror = () => {
        setError("Error reading image file");
        setIsModalOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Error processing image");
      setIsModalOpen(true);
    }
  };

  const handleConfirmStockIn = async () => {
    if (!selectedIndent || !storeId) {
      setError("Store information missing");
      setIsModalOpen(true);
      return;
    }

    try {
      setStockInLoading(true);

      // Validate received quantities
      const items = selectedIndent.items || selectedIndent.products || [];
      const invalidItems = items.filter(item => {
        const productId = item.productId || item.id;
        const receivedQty = receivedQuantities[productId] || 0;
        const requestedQty = item.requestedQuantity || item.quantity || 0;
        return receivedQty <= 0 || receivedQty > requestedQty;
      });

      if (invalidItems.length > 0) {
        setError("Please enter valid received quantities (greater than 0 and not exceeding ordered quantity)");
        setIsModalOpen(true);
        setStockInLoading(false);
        return;
      }

      // Validate damaged goods if enabled
      if (hasDamagedGoods) {
        // Note: API doesn't require reason or image, but we'll validate image is optional
        // Reason is kept in UI for user reference but not sent to API
        const damagedWithoutImage = damagedGoodsRows.filter(row => {
          return row.damagedQty > 0 && !row.imageBase64;
        });

        // Image is optional according to API, but we can warn user
        // if (damagedWithoutImage.length > 0) {
        //   setError("Please upload image for all damaged goods");
        //   setIsModalOpen(true);
        //   setStockInLoading(false);
        //   return;
        // }
      }

      // Prepare stock in payload according to backend API format
      const stockInPayload = {
        indentId: selectedIndent.id,
        items: items.map(item => {
          const productId = item.productId || item.id;
          const receivedQty = parseFloat(receivedQuantities[productId] || item.requestedQuantity || item.quantity || 0);
          
          // Find damaged goods for this product if any
          const damagedRow = hasDamagedGoods 
            ? damagedGoodsRows.find(row => {
                const rowProductId = row.productId?.toString() || String(row.productId);
                const itemProductId = productId?.toString() || String(productId);
                return rowProductId === itemProductId;
              })
            : null;
          
          const damagedQty = damagedRow && damagedRow.damagedQty > 0 
            ? parseFloat(damagedRow.damagedQty) 
            : 0;
          
          // Extract base64 data (remove data:image/...;base64, prefix if present)
          const damagedImageBase64 = damagedRow && damagedRow.imageBase64
            ? (damagedRow.imageBase64.includes(',') 
                ? damagedRow.imageBase64.split(',')[1] 
                : damagedRow.imageBase64)
            : undefined;
          
          const itemPayload = {
            productId: parseInt(productId),
            receivedQuantity: receivedQty
          };
          
          // Add damaged goods fields only if damaged quantity > 0
          if (damagedQty > 0) {
            itemPayload.damagedQuantity = damagedQty;
            if (damagedImageBase64) {
              itemPayload.damagedImageBase64 = damagedImageBase64;
            }
          }
          
          return itemPayload;
        })
      };

      console.log("Stock In Payload:", JSON.stringify(stockInPayload, null, 2));
      
      const res = await storeService.processStockIn(stockInPayload);
      
      const successMessage = res.message || res.data?.message || "Stock in processed successfully";
      alert(successMessage);
      
      // Update selected indent status to reflect stock in completion
      if (selectedIndent) {
        setSelectedIndent(prev => ({
          ...prev,
          status: "Stocked In",
          originalStatus: "completed"
        }));
      }
      
      // Reset stock in form but keep modal open to show updated status
      setShowStockIn(false);
      setReceivedQuantities({});
      setHasDamagedGoods(false);
      setDamagedGoodsRows([]);
      
      // Refresh the indents list
      fetchIndents();
    } catch (err) {
      console.error("Error processing stock in:", err);
      console.error("Error details:", err.response?.data || err);
      
      // Extract error message from various possible formats
      let errorMessage = "Failed to process stock in";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsModalOpen(true);
    } finally {
      setStockInLoading(false);
    }
  };

  return (
    <>
      <p className="path">
        <span onClick={() => navigate("/store/indents")}>Indents</span>{" "}
        <i className="bi bi-chevron-right"></i> View Indents
      </p>

      <div className="row m-0 p-3">
        <div className="col-12">
          <div className="row m-0 mb-3 justify-content-end">
            <div className={`${styles.entity}`} style={{ marginRight: 0 }}>
              <label htmlFor="">Entity :</label>
              <select
                name=""
                id=""
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPageNo(1); // Reset to first page when limit changes
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <table className={`table table-bordered borderedtable`}>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Indent Code</th>
                <th>Items</th>
                <th>Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td>
                </tr>
              ) : indents.length === 0 ? (
                <tr>
                  <td colSpan={7}>NO DATA FOUND</td>
                </tr>
              ) : (
                indents.map((indent, index) => {
                  const statusInfo = getStatusBadge(indent.status);
                  const actualIndex = (pageNo - 1) * limit + index + 1;
                  return (
                    <tr
                      key={index}
                      className="animated-row"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <td>{actualIndex}</td>
                      <td>{indent.date}</td>
                      <td>{indent.code}</td>
                      <td>{indent.itemCount || indent.items?.length || 0} items</td>
                      <td>₹{Number(indent.value || 0).toLocaleString()}</td>
                      <td>
                        <span 
                          className={`badge ${statusInfo.class}`}
                          style={{ 
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {statusInfo.icon}
                          {indent.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleViewClick(indent)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="row m-0 p-0 pt-3 justify-content-between">
            <div className={`col-2 m-0 p-0 ${styles.buttonbox}`}>
              {pageNo > 1 && (
                <button onClick={() => setPageNo(pageNo - 1)}>
                  <span>
                    <FaArrowLeftLong />
                  </span>{" "}
                  Previous
                </button>
              )}
            </div>
            <div className={`col-2 m-0 p-0 ${styles.buttonbox}`}>
              {pageNo < totalPages && (
                <button onClick={() => setPageNo(pageNo + 1)}>
                  Next{" "}
                  <span>
                    <FaArrowRightLong />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Indent Details Modal */}
      {showModal && selectedIndent && (
        <div
          className="modal fade show"
          style={{ 
            display: 'block', 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 150000
          }}
          tabIndex="-1"
          role="dialog"
          onClick={handleCloseModal}
          onKeyDown={(e) => { if (e.key === 'Escape') handleCloseModal(); }}
        >
          <div 
            className="modal-dialog modal-lg modal-dialog-centered" 
            role="document" 
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 150001 }}
          >
            <div className="modal-content" style={{ 
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
              zIndex: 150002
            }}>
              <div className="modal-header" style={{ 
                borderBottom: '1px solid #dee2e6',
                backgroundColor: '#f8f9fa',
                borderRadius: '0.5rem 0.5rem 0 0',
                padding: '1rem 1.5rem'
              }}>
                <h5 className="modal-title" style={{ margin: 0, fontWeight: '600', fontFamily: 'Poppins' }}>
                  Indent Details - {selectedIndent.code}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  aria-label="Close" 
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {!showStockIn ? (
                  <>
                    {/* Indent Information */}
                    <div style={{ marginBottom: '2rem' }}>
                      <h6 style={{ fontFamily: 'Poppins', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary-color)' }}>
                        Indent Information
                      </h6>
                  <div className="row" style={{ fontFamily: 'Poppins' }}>
                    <div className="col-6" style={{ marginBottom: '0.75rem' }}>
                      <strong>Indent Code:</strong> {selectedIndent.code}
                    </div>
                    <div className="col-6" style={{ marginBottom: '0.75rem' }}>
                      <strong>Date:</strong> {selectedIndent.date}
                    </div>
                    <div className="col-6" style={{ marginBottom: '0.75rem' }}>
                      <strong>Store:</strong> {selectedIndent.storeName || 'N/A'}
                    </div>
                    <div className="col-6" style={{ marginBottom: '0.75rem' }}>
                      <strong>Status:</strong> 
                      <span className={`badge ${getStatusBadge(selectedIndent.status).class}`} style={{ marginLeft: '8px' }}>
                        {getStatusBadge(selectedIndent.status).icon}
                        {selectedIndent.status}
                      </span>
                    </div>
                    <div className="col-6" style={{ marginBottom: '0.75rem' }}>
                      <strong>Total Value:</strong> ₹{Number(selectedIndent.value || 0).toLocaleString()}
                    </div>
                    {selectedIndent.notes && (
                      <div className="col-12" style={{ marginTop: '0.5rem' }}>
                        <strong>Notes:</strong>
                        <p style={{ marginTop: '0.25rem', color: '#6b7280' }}>{selectedIndent.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h6 style={{ fontFamily: 'Poppins', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary-color)' }}>
                    Items ({selectedIndent.items?.length || selectedIndent.products?.length || selectedIndent.items || 0})
                  </h6>
                  <div style={{ overflowX: 'auto' }}>
                    <table className={`table table-bordered borderedtable`} style={{ fontFamily: 'Poppins' }}>
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Product Name</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedIndent.items && selectedIndent.items.length > 0 ? (
                          selectedIndent.items.map((item, index) => (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{item.product?.name || item.productName || `Product ${item.productId}`}</td>
                              <td>{item.requestedQuantity || item.quantity || 0}</td>
                              <td>{item.unit || "units"}</td>
                              <td>₹{Number(item.unitPrice || item.price || 0).toLocaleString()}</td>
                              <td>₹{Number(item.totalAmount || (item.unitPrice || item.price || 0) * (item.requestedQuantity || item.quantity || 0)).toLocaleString()}</td>
                            </tr>
                          ))
                        ) : selectedIndent.products && selectedIndent.products.length > 0 ? (
                          selectedIndent.products.map((product, index) => (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{product.name}</td>
                              <td>{product.quantity}</td>
                              <td>{product.unit}</td>
                              <td>₹{Number(product.price || 0).toLocaleString()}</td>
                              <td>₹{Number((product.quantity || 0) * (product.price || 0)).toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center' }}>No items found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                  </>
                ) : (
                  <>
                    {/* Stock In Form */}
                    <div style={{ marginBottom: '2rem' }}>
                      <h6 style={{ fontFamily: 'Poppins', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary-color)' }}>
                        Stock In - {selectedIndent.code}
                      </h6>
                      
                      {/* Received Quantities Table */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h6 style={{ fontFamily: 'Poppins', fontWeight: 600, marginBottom: '0.75rem', fontSize: '14px' }}>
                          Received Quantities
                        </h6>
                        <div style={{ overflowX: 'auto' }}>
                          <table className={`table table-bordered borderedtable`} style={{ fontFamily: 'Poppins', fontSize: '13px' }}>
                            <thead>
                              <tr>
                                <th>S.No</th>
                                <th>Product</th>
                                <th>Ordered Qty</th>
                                <th>Received Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedIndent.items || selectedIndent.products || []).map((item, index) => {
                                const productId = item.productId || item.id;
                                const orderedQty = item.requestedQuantity || item.quantity || 0;
                                const receivedQty = receivedQuantities[productId] || orderedQty;
                                return (
                                  <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{item.product?.name || item.productName || `Product ${productId}`}</td>
                                    <td>{orderedQty} {item.unit || "units"}</td>
                                    <td>
                                      <input
                                        type="number"
                                        min="0"
                                        max={orderedQty}
                                        step="0.01"
                                        value={receivedQty}
                                        onChange={(e) => handleReceivedQuantityChange(productId, e.target.value)}
                                        style={{
                                          width: '100px',
                                          padding: '4px 8px',
                                          border: '1px solid #ddd',
                                          borderRadius: '4px',
                                          fontFamily: 'Poppins'
                                        }}
                                      />
                                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                                        {item.unit || "units"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Damaged Goods Checkbox */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={hasDamagedGoods}
                            onChange={(e) => handleDamagedGoodsToggle(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 600 }}>Damaged Goods</span>
                        </label>
                      </div>

                      {/* Damaged Goods Table */}
                      {hasDamagedGoods && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <h6 style={{ fontFamily: 'Poppins', fontWeight: 600, marginBottom: '0.75rem', fontSize: '14px' }}>
                            Damaged Goods Details
                          </h6>
                          <div style={{ overflowX: 'auto' }}>
                            <table className={`table table-bordered borderedtable`} style={{ fontFamily: 'Poppins', fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th>Ordered Qty</th>
                                  <th>Damaged Qty</th>
                                  <th>Reason</th>
                                  <th>Image</th>
                                </tr>
                              </thead>
                              <tbody>
                                {damagedGoodsRows.map((row, index) => {
                                  const orderedQty = row.orderedQty || 0;
                                  return (
                                    <tr key={index}>
                                      <td>{row.productName}</td>
                                      <td>{orderedQty}</td>
                                      <td>
                                        <input
                                          type="number"
                                          min="0"
                                          max={orderedQty}
                                          step="0.01"
                                          value={row.damagedQty}
                                          onChange={(e) => handleDamagedGoodsChange(index, 'damagedQty', parseFloat(e.target.value) || 0)}
                                          style={{
                                            width: '80px',
                                            padding: '4px 8px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontFamily: 'Poppins'
                                          }}
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="text"
                                          value={row.reason}
                                          onChange={(e) => handleDamagedGoodsChange(index, 'reason', e.target.value)}
                                          placeholder="Enter reason"
                                          style={{
                                            width: '100%',
                                            padding: '4px 8px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontFamily: 'Poppins'
                                          }}
                                        />
                                      </td>
                                      <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleImageUpload(index, file);
                                            }}
                                            style={{ fontSize: '11px', fontFamily: 'Poppins' }}
                                          />
                                          {row.imagePreview && (
                                            <img
                                              src={row.imagePreview}
                                              alt="Preview"
                                              style={{
                                                width: '60px',
                                                height: '60px',
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd'
                                              }}
                                            />
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer" style={{ 
                borderTop: '1px solid #dee2e6',
                padding: '1rem 1.5rem',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                {!showStockIn ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseModal}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      Close
                    </button>
                    {selectedIndent?.originalStatus === "approved" && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleStockIn}
                        style={{ fontFamily: 'Poppins' }}
                      >
                        Stock In
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelStockIn}
                      disabled={stockInLoading}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirmStockIn}
                      disabled={stockInLoading}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {stockInLoading ? "Processing..." : "Confirm Stock In"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <Loading />}
      {isModalOpen && (
        <ErrorModal
          isOpen={isModalOpen}
          message={error}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

