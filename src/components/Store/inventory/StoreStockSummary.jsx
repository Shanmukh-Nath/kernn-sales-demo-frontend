import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth";
import ErrorModal from "@/components/ErrorModal";
import Loading from "@/components/Loading";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import storeService from "../../../services/storeService";
import styles from "../../Dashboard/HomePage/HomePage.module.css";

function StoreStockSummary() {
  const navigate = useNavigate();
  const { axiosAPI } = useAuth();
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("summary"); // "summary", "stats", "audit", "opening-closing"
  const [auditTrail, setAuditTrail] = useState([]);
  const [openingClosing, setOpeningClosing] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    // Get store ID from multiple sources
    try {
      let id = null;
      
      const selectedStore = localStorage.getItem("selectedStore");
      if (selectedStore) {
        try {
          const store = JSON.parse(selectedStore);
          id = store.id;
        } catch (e) {
          console.error("Error parsing selectedStore:", e);
        }
      }
      
      if (!id) {
        const currentStoreId = localStorage.getItem("currentStoreId");
        id = currentStoreId ? parseInt(currentStoreId) : null;
      }
      
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

  const fetchStock = async () => {
    if (!from || !to || !storeId) {
      if (!storeId) {
        setError("Store information missing. Please re-login to continue.");
      } else {
        setError("Please select both From and To dates.");
      }
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = {
        fromDate: from,
        toDate: to,
        storeId: storeId,
        page,
        limit
      };
      
      const res = await storeService.getStoreStockSummary(params);
      const summaryData = res.data || res.summary || res || [];
      const paginationData = res.pagination || {};
      
      // Map API response to match table structure
      const mappedData = Array.isArray(summaryData) ? summaryData.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || item.productName || '-',
        productSKU: item.product?.SKU || item.product?.sku || '-',
        date: item.date,
        stockIn: item.stockIn || item.inwardStock || 0,
        opening: item.openingStock || 0,
        purchases: item.inwardStock || 0,
        closing: item.closingStock || 0,
        sale: item.outwardStock || 0,
        unit: item.unit || item.product?.unit || 'kg',
        productType: item.productType || item.product?.productType || 'packed',
        store: item.store,
        product: item.product,
        division: item.division
      })) : [];
      
      setStockData(mappedData);
      setTotal(paginationData.total || mappedData.length);
      setTotalPages(paginationData.totalPages || Math.ceil((paginationData.total || mappedData.length) / limit) || 1);
    } catch (err) {
      console.error('StoreStockSummary - Error:', err);
      setError(err.response?.data?.message || err.message || "Failed to fetch stock data.");
      setIsModalOpen(true);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!from || !to || !storeId) return;
    
    setLoading(true);
    try {
      const params = {
        fromDate: from,
        toDate: to,
        storeId: storeId
      };
      
      const res = await storeService.getStoreStockSummaryStats(params);
      const statsData = res.data || res;
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.response?.data?.message || err.message || "Failed to fetch statistics.");
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    if (!from || !to || !storeId) return;
    
    setLoading(true);
    try {
      const params = {
        fromDate: from,
        toDate: to,
        storeId: storeId,
        page,
        limit
      };
      
      const res = await storeService.getStoreStockAuditTrail(params);
      const auditData = res.data || res.auditTrail || res || [];
      const paginationData = res.pagination || {};
      
      const mappedAudit = Array.isArray(auditData) ? auditData.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || '-',
        productSKU: item.product?.SKU || item.product?.sku || '-',
        transactionType: item.transactionType,
        quantity: item.quantity || 0,
        unit: item.unit || 'kg',
        productType: item.productType || 'packed',
        recordedAt: item.recordedAt,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        remarks: item.remarks,
        store: item.store,
        product: item.product
      })) : [];
      
      setAuditTrail(mappedAudit);
      setTotal(paginationData.total || mappedAudit.length);
      setTotalPages(paginationData.totalPages || Math.ceil((paginationData.total || mappedAudit.length) / limit) || 1);
    } catch (err) {
      console.error('Error fetching audit trail:', err);
      setError(err.response?.data?.message || err.message || "Failed to fetch audit trail.");
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpeningClosing = async () => {
    if (!selectedDate || !storeId) return;
    
    setLoading(true);
    try {
      const params = {
        date: selectedDate,
        storeId: storeId
      };
      
      const res = await storeService.getStoreStockOpeningClosing(params);
      const data = res.data || res;
      setOpeningClosing(data);
    } catch (err) {
      console.error('Error fetching opening/closing stock:', err);
      setError(err.response?.data?.message || err.message || "Failed to fetch opening/closing stock.");
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId && activeTab === "summary") {
      fetchStock();
    } else if (storeId && activeTab === "stats") {
      fetchStats();
    } else if (storeId && activeTab === "audit") {
      fetchAuditTrail();
    } else if (storeId && activeTab === "opening-closing") {
      fetchOpeningClosing();
    }
  }, [storeId, from, to, page, limit, activeTab, selectedDate]);

  const handlePageChange = (direction) => {
    if (direction === "next" && page < totalPages) {
      setPage(prev => prev + 1);
    } else if (direction === "prev" && page > 1) {
      setPage(prev => prev - 1);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1); // Reset to first page when switching tabs
  };

  const renderSummaryTable = (dataArray) => (
    <div style={{ overflowX: 'auto' }}>
      <table className="table table-bordered borderedtable table-sm mt-2" style={{ fontFamily: 'Poppins' }}>
        <thead className="table-light">
          <tr>
            <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Product</th>
            <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>SKU</th>
            <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Date</th>
            <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Opening Stock</th>
            <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Stock In</th>
            <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Stock Out</th>
            <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Closing Stock</th>
            <th style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '13px' }}>Unit</th>
          </tr>
        </thead>
        <tbody>
          {dataArray.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center" style={{ padding: '20px', fontFamily: 'Poppins' }}>
                No stock data found
              </td>
            </tr>
          ) : (
            dataArray.map((item, index) => {
              const actualIndex = (page - 1) * limit + index + 1;
              return (
                <tr key={item.id || index} style={{ background: index % 2 === 0 ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
                  <td style={{ fontFamily: 'Poppins', fontSize: '13px', fontWeight: 600 }}>{item.productName || '-'}</td>
                  <td style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666' }}>{item.productSKU || '-'}</td>
                  <td style={{ fontFamily: 'Poppins', fontSize: '13px' }}>{item.date || '-'}</td>
                  <td style={{ fontFamily: 'Poppins', fontSize: '13px' }}>
                    {Number(item.opening || 0).toFixed(2)}
                  </td>
                  <td style={{ fontFamily: 'Poppins', fontSize: '13px', color: '#059669' }}>
                    {Number(item.stockIn || 0).toFixed(2)}
                  </td>
                  <td style={{ fontFamily: 'Poppins', fontSize: '13px', color: '#ef4444' }}>
                    {Number(item.sale || 0).toFixed(2)}
                  </td>
                  <td style={{ fontFamily: 'Poppins', fontSize: '13px', fontWeight: 600, color: 'var(--primary-color)' }}>
                    {Number(item.closing || 0).toFixed(2)}
                  </td>
                  <td style={{ fontFamily: 'Poppins', fontSize: '13px' }}>{item.unit || 'kg'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontFamily: 'Poppins', color: '#666', fontSize: '14px' }}>
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} records
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handlePageChange("prev")}
              disabled={page === 1 || loading}
              style={{ fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FaArrowLeftLong />
              Previous
            </button>
            <span style={{ fontFamily: 'Poppins', padding: '0 12px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handlePageChange("next")}
              disabled={page >= totalPages || loading}
              style={{ fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Next
              <FaArrowRightLong />
            </button>
          </div>
        </div>
      )}
    </div>
  );

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
        }}>Stock Summary</h2>
        <p className="path">
          <span onClick={() => navigate("/store/inventory")}>Inventory</span>{" "}
          <i className="bi bi-chevron-right"></i> Stock Summary
        </p>
      </div>

      {/* Tabs */}
      <div className={styles.orderStatusCard} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '20px' }}>
          <button
            onClick={() => handleTabChange("summary")}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === "summary" ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === "summary" ? 'var(--primary-color)' : '#666',
              fontFamily: 'Poppins',
              fontWeight: activeTab === "summary" ? 600 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Stock Summary
          </button>
          <button
            onClick={() => handleTabChange("stats")}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === "stats" ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === "stats" ? 'var(--primary-color)' : '#666',
              fontFamily: 'Poppins',
              fontWeight: activeTab === "stats" ? 600 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Statistics
          </button>
          <button
            onClick={() => handleTabChange("audit")}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === "audit" ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === "audit" ? 'var(--primary-color)' : '#666',
              fontFamily: 'Poppins',
              fontWeight: activeTab === "audit" ? 600 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Audit Trail
          </button>
          <button
            onClick={() => handleTabChange("opening-closing")}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === "opening-closing" ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === "opening-closing" ? 'var(--primary-color)' : '#666',
              fontFamily: 'Poppins',
              fontWeight: activeTab === "opening-closing" ? 600 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Opening/Closing
          </button>
        </div>

        {/* Filters based on active tab */}
        {activeTab !== "opening-closing" ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                From Date
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'Poppins',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                To Date
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'Poppins',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="homebtn"
                onClick={() => {
                  if (activeTab === "summary") fetchStock();
                  else if (activeTab === "stats") fetchStats();
                  else if (activeTab === "audit") fetchAuditTrail();
                }}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', lineHeight: '1', flex: 1 }}
              >
                {loading ? 'Loading...' : 'Submit'}
              </button>
              <button 
                className="homebtn"
                onClick={() => navigate('/store/inventory')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', lineHeight: '1', flex: 1 }}
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'Poppins',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="homebtn"
                onClick={fetchOpeningClosing}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', lineHeight: '1', flex: 1 }}
              >
                {loading ? 'Loading...' : 'Submit'}
              </button>
              <button 
                className="homebtn"
                onClick={() => navigate('/store/inventory')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', lineHeight: '1', flex: 1 }}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && <Loading />}
      
      {/* Stock Summary Tab */}
      {!loading && activeTab === "summary" && (
        <div className={styles.orderStatusCard}>
          <h4 style={{ margin: 0, marginBottom: '20px', fontFamily: 'Poppins', fontWeight: 600, fontSize: '20px', color: 'var(--primary-color)' }}>
            Stock Summary Data
          </h4>
          {renderSummaryTable(stockData)}
        </div>
      )}

      {/* Statistics Tab */}
      {!loading && activeTab === "stats" && stats && (
        <div className={styles.orderStatusCard}>
          <h4 style={{ margin: 0, marginBottom: '20px', fontFamily: 'Poppins', fontWeight: 600, fontSize: '20px', color: 'var(--primary-color)' }}>
            Overall Statistics
          </h4>
          {stats.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Inward Stock</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: '#059669' }}>
                  {Number(stats.summary.totalInwardStock || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Outward Stock</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>
                  {Number(stats.summary.totalOutwardStock || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Closing Stock</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: 'var(--primary-color)' }}>
                  {Number(stats.summary.totalClosingStock || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Products</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: '#92400e' }}>
                  {stats.summary.totalProducts || 0}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#e0e7ff', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Stores</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: '#4338ca' }}>
                  {stats.summary.totalStores || 0}
                </div>
              </div>
            </div>
          )}
          {stats.stockByStore && stats.stockByStore.length > 0 && (
            <div>
              <h5 style={{ fontFamily: 'Poppins', fontWeight: 600, marginBottom: '16px' }}>Stock by Store</h5>
              <div style={{ overflowX: 'auto' }}>
                <table className="table table-bordered borderedtable" style={{ fontFamily: 'Poppins' }}>
                  <thead className="table-light">
                    <tr>
                      <th>Store Name</th>
                      <th>Store Code</th>
                      <th>Inward Stock</th>
                      <th>Outward Stock</th>
                      <th>Closing Stock</th>
                      <th>Products</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.stockByStore.map((store, index) => (
                      <tr key={store.storeId || index}>
                        <td>{store.storeName}</td>
                        <td>{store.storeCode}</td>
                        <td style={{ color: '#059669' }}>{Number(store.inwardStock || 0).toFixed(2)}</td>
                        <td style={{ color: '#ef4444' }}>{Number(store.outwardStock || 0).toFixed(2)}</td>
                        <td style={{ fontWeight: 600 }}>{Number(store.closingStock || 0).toFixed(2)}</td>
                        <td>{store.products || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Trail Tab */}
      {!loading && activeTab === "audit" && (
        <div className={styles.orderStatusCard}>
          <h4 style={{ margin: 0, marginBottom: '20px', fontFamily: 'Poppins', fontWeight: 600, fontSize: '20px', color: 'var(--primary-color)' }}>
            Stock Movement History
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-bordered borderedtable" style={{ fontFamily: 'Poppins' }}>
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Transaction Type</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Recorded At</th>
                  <th>Reference</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {auditTrail.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center" style={{ padding: '20px' }}>
                      No audit trail data found
                    </td>
                  </tr>
                ) : (
                  auditTrail.map((item, index) => {
                    const actualIndex = (page - 1) * limit + index + 1;
                    return (
                      <tr key={item.id || index} style={{ background: index % 2 === 0 ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
                        <td>{item.productName}</td>
                        <td style={{ fontSize: '12px', color: '#666' }}>{item.productSKU}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: item.transactionType === 'inward' ? '#dcfce7' : '#fee2e2',
                            color: item.transactionType === 'inward' ? '#166534' : '#991b1b'
                          }}>
                            {item.transactionType?.toUpperCase() || '-'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{Number(item.quantity || 0).toFixed(2)}</td>
                        <td>{item.unit}</td>
                        <td>{item.recordedAt ? new Date(item.recordedAt).toLocaleString() : '-'}</td>
                        <td>{item.referenceType ? `${item.referenceType}: ${item.referenceId}` : '-'}</td>
                        <td style={{ fontSize: '12px', color: '#666' }}>{item.remarks || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontFamily: 'Poppins', color: '#666', fontSize: '14px' }}>
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} records
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handlePageChange("prev")}
                  disabled={page === 1 || loading}
                  style={{ fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <FaArrowLeftLong />
                  Previous
                </button>
                <span style={{ fontFamily: 'Poppins', padding: '0 12px' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handlePageChange("next")}
                  disabled={page >= totalPages || loading}
                  style={{ fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Next
                  <FaArrowRightLong />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Opening/Closing Tab */}
      {!loading && activeTab === "opening-closing" && openingClosing && (
        <div className={styles.orderStatusCard}>
          <h4 style={{ margin: 0, marginBottom: '20px', fontFamily: 'Poppins', fontWeight: 600, fontSize: '20px', color: 'var(--primary-color)' }}>
            Opening and Closing Stock - {openingClosing.date || selectedDate}
          </h4>
          {openingClosing.totals && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666' }}>Opening Stock</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700 }}>{Number(openingClosing.totals.openingStock || 0).toFixed(2)}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666' }}>Inward Stock</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: '#059669' }}>{Number(openingClosing.totals.inwardStock || 0).toFixed(2)}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666' }}>Outward Stock</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>{Number(openingClosing.totals.outwardStock || 0).toFixed(2)}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                <div style={{ fontFamily: 'Poppins', fontSize: '12px', color: '#666' }}>Closing Stock</div>
                <div style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)' }}>{Number(openingClosing.totals.closingStock || 0).toFixed(2)}</div>
              </div>
            </div>
          )}
          {openingClosing.summaries && openingClosing.summaries.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-bordered borderedtable" style={{ fontFamily: 'Poppins' }}>
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Opening Stock</th>
                    <th>Inward Stock</th>
                    <th>Outward Stock</th>
                    <th>Closing Stock</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {openingClosing.summaries.map((item, index) => (
                    <tr key={item.id || index} style={{ background: index % 2 === 0 ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
                      <td style={{ fontWeight: 600 }}>{item.product?.name || '-'}</td>
                      <td style={{ fontSize: '12px', color: '#666' }}>{item.product?.SKU || item.product?.sku || '-'}</td>
                      <td>{Number(item.openingStock || 0).toFixed(2)}</td>
                      <td style={{ color: '#059669' }}>{Number(item.inwardStock || 0).toFixed(2)}</td>
                      <td style={{ color: '#ef4444' }}>{Number(item.outwardStock || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{Number(item.closingStock || 0).toFixed(2)}</td>
                      <td>{item.product?.unit || item.unit || 'kg'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === "summary" && stockData.length === 0 && from && to && (
        <div className={styles.orderStatusCard}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h4 style={{ fontFamily: 'Poppins', color: '#666', marginBottom: '12px' }}>No stock data found</h4>
            <p style={{ fontFamily: 'Poppins', color: '#999', margin: 0 }}>
              No stock data available for the selected date range.
            </p>
          </div>
        </div>
      )}

      {isModalOpen && (
        <ErrorModal
          isOpen={isModalOpen}
          message={error}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export default StoreStockSummary;

