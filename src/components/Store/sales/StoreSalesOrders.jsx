import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import styles from "./StoreSalesOrders.module.css";
import homeStyles from "../../Dashboard/HomePage/HomePage.module.css";
import salesStyles from "../../Dashboard/Sales/Sales.module.css";
import xls from "../../../images/xls-png.png";
import pdf from "../../../images/pdf-png.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth";
import Loading from "@/components/Loading";
import ErrorModal from "@/components/ErrorModal";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import storeService from "../../../services/storeService";
import { isAdmin } from "../../../utils/roleUtils";

const DEFAULT_FILTERS = {
  from: "",
  to: "",
  customer: "",
  employee: "",
  status: "all",
};

function StoreSalesOrders({ onBack }) {
  const { axiosAPI } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [entityCount, setEntityCount] = useState(10);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef(null);
  const customerSearchTimeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get store ID from multiple sources
    try {
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

  useEffect(() => {
    if (storeId) {
      fetchSales();
    }
  }, [storeId, appliedFilters, page, entityCount]);

  // Debounced customer search
  const searchCustomers = useCallback(async (searchTerm) => {
    if (!storeId || !searchTerm || searchTerm.trim().length < 2) {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    setCustomerSearchLoading(true);
    try {
      const response = await storeService.searchStoreCustomers(storeId, searchTerm.trim());
      const customers = response.data || response.customers || response || [];
      setCustomerSearchResults(Array.isArray(customers) ? customers : []);
      setShowCustomerDropdown(true);
    } catch (err) {
      console.error('Error searching customers:', err);
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, [storeId]);

  // Handle customer search input with debounce
  const handleCustomerSearchChange = (value) => {
    setCustomerSearchTerm(value);
    
    // Clear existing timeout
    if (customerSearchTimeoutRef.current) {
      clearTimeout(customerSearchTimeoutRef.current);
    }
    
    // If value is cleared, reset customer filter
    if (!value || value.trim().length === 0) {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
      handleFilterChange("customer", "");
      return;
    }
    
    // Debounce search
    customerSearchTimeoutRef.current = setTimeout(() => {
      searchCustomers(value);
    }, 300);
  };

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    setCustomerSearchTerm(customer.name || customer.customerCode || "");
    handleFilterChange("customer", customer.name || customer.customerCode || "");
    setShowCustomerDropdown(false);
    setCustomerSearchResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchSales = async () => {
    if (!storeId) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: entityCount
      };
      
      // Add filters (only send backend-supported filters)
      if (appliedFilters.from) params.fromDate = appliedFilters.from;
      if (appliedFilters.to) params.toDate = appliedFilters.to;
      if (appliedFilters.status !== "all") params.status = appliedFilters.status;
      // Note: customer and employee filters are handled client-side since we're using names
      
      // Check if user is admin to use admin endpoint
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const user = userData.user || userData;
      const isAdminUser = isAdmin(user);
      
      const response = isAdminUser 
        ? await storeService.getStoreSalesAdmin(storeId, params)
        : await storeService.getStoreSales(storeId, params);
      
      // Handle backend response format
      const salesData = response.data || response.sales || response || [];
      const paginationData = response.pagination || {};
      
        // Map API response to match component structure
      const mappedOrders = Array.isArray(salesData) ? salesData.map((sale) => ({
          id: sale.saleCode || sale.id,
        saleCode: sale.saleCode || `SALE-${sale.id}`,
          date: sale.createdAt || sale.saleDate || new Date().toISOString().split('T')[0],
          storeName: sale.store?.name || "Store",
        storeEmployee: sale.employee?.name || sale.reportedByEmployee?.name || "Employee",
          customerName: sale.customer?.name || "Customer",
        customerId: sale.customerId || sale.customer?.id,
          quantity: sale.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        status: sale.saleStatus || sale.paymentStatus || "pending",
        paymentStatus: sale.paymentStatus || "pending",
        grandTotal: sale.grandTotal || sale.totalAmount || 0,
        totalAmount: sale.totalAmount || 0,
        paymentMethod: sale.paymentMethod || "N/A",
        items: sale.items || [],
          originalData: sale
      })) : [];
      
        setOrders(mappedOrders);
      setTotal(paginationData.total || mappedOrders.length);
      setTotalPages(paginationData.totalPages || Math.ceil((paginationData.total || mappedOrders.length) / entityCount) || 1);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError(err.response?.data?.message || err.message || "Failed to fetch sales data.");
      setIsModalOpen(true);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const customerOptions = useMemo(() => {
    const uniques = new Set(orders.map((order) => order.customerName).filter(Boolean));
    return Array.from(uniques);
  }, [orders]);

  const employeeOptions = useMemo(() => {
    const uniques = new Set(orders.map((order) => order.storeEmployee).filter(Boolean));
    return Array.from(uniques);
  }, [orders]);

  // Apply client-side filtering for customer and employee (since we're using names)
  const displayOrders = useMemo(() => {
    let filtered = orders;
    
    if (appliedFilters.customer) {
      filtered = filtered.filter(order => 
        order.customerName === appliedFilters.customer || 
        order.customerName?.toLowerCase().includes(appliedFilters.customer.toLowerCase())
      );
    }
    
    if (appliedFilters.employee) {
      filtered = filtered.filter(order => order.storeEmployee === appliedFilters.employee);
    }
    
    return filtered;
  }, [orders, appliedFilters.customer, appliedFilters.employee]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    setAppliedFilters(filters);
    setPage(1); // Reset to first page when filters are applied
    // Keep customer search term if a customer is selected
    if (!filters.customer) {
      setCustomerSearchTerm("");
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
    }
  };

  const handleCancel = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setEntityCount(10);
    setPage(1); // Reset to first page
    setCustomerSearchTerm("");
    setCustomerSearchResults([]);
    setShowCustomerDropdown(false);
  };
  
  const handlePageChange = (direction) => {
    if (direction === "next" && page < totalPages) {
      setPage(prev => prev + 1);
    } else if (direction === "prev" && page > 1) {
      setPage(prev => prev - 1);
    }
  };

  const handleExport = (type) => {
    console.log(`Exporting ${displayOrders.length} orders as ${type}`);
  };

  const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const closeModal = () => setIsModalOpen(false);

  return (
    <div style={{ padding: "20px" }}>
      <div className={styles.pageHeader}>
        <div>
          <h2>Store Sales Orders</h2>
          <p className="path">
            <span onClick={() => navigate("/store/sales")}>Sales</span>{" "}
            <i className="bi bi-chevron-right"></i> Orders
          </p>
        </div>
      </div>

      {loading && <Loading />}

      <div className={`${homeStyles.orderStatusCard} ${styles.cardWrapper}`}>
        

        <div className={`row g-3 ${styles.filtersRow}`}>
          <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6 formcontent">
            <label>From :</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange("from", e.target.value)}
            />
          </div>
          <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6 formcontent">
            <label>To :</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange("to", e.target.value)}
            />
          </div>
          <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6 formcontent" ref={customerSearchRef} style={{ position: 'relative' }}>
            <label>Customers :</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={customerSearchTerm}
                onChange={(e) => handleCustomerSearchChange(e.target.value)}
                onFocus={() => {
                  if (customerSearchResults.length > 0) {
                    setShowCustomerDropdown(true);
                  }
                }}
                placeholder="Search by name or mobile..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'Poppins',
                  fontSize: '14px'
                }}
              />
              {customerSearchLoading && (
                <div style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  Searching...
                </div>
              )}
              {showCustomerDropdown && customerSearchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {customerSearchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        fontFamily: 'Poppins',
                        fontSize: '14px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: 500, color: '#333' }}>
                        {customer.name || customer.customerCode}
                      </div>
                      {customer.mobile && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          {customer.mobile}
                        </div>
                      )}
                      {customer.customerCode && customer.name && (
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                          {customer.customerCode}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showCustomerDropdown && customerSearchResults.length === 0 && customerSearchTerm.length >= 2 && !customerSearchLoading && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  padding: '12px',
                  fontFamily: 'Poppins',
                  fontSize: '14px',
                  color: '#666',
                  marginTop: '4px'
                }}>
                  No customers found
                </div>
              )}
            </div>
          </div>
          <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6 formcontent">
            <label>Store Employee :</label>
            <select value={filters.employee} onChange={(e) => handleFilterChange("employee", e.target.value)}>
              <option value="">Select</option>
              {employeeOptions.map((employee) => (
                <option key={employee} value={employee}>
                  {employee}
                </option>
              ))}
            </select>
          </div>
          <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6 formcontent">
            <label>Status :</label>
            <select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className={styles.buttonsRow}>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <button className="submitbtn" onClick={handleSubmit}>
              Submit
            </button>
            <button className="cancelbtn" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>

        <div className={styles.exportSection}>
          <div className={styles.exportButtons}>
            <button className={salesStyles.xls} onClick={() => handleExport("XLS")}>
              <p>Export to </p>
              <img src={xls} alt="Export to Excel" />
            </button>
            <button className={salesStyles.xls} onClick={() => handleExport("PDF")}>
              <p>Export to </p>
              <img src={pdf} alt="Export to PDF" />
            </button>
          </div>
          <div className={`${salesStyles.entity} ${styles.entityOverride}`}>
            <label>Entity :</label>
            <select 
              value={entityCount} 
              onChange={(e) => {
                setEntityCount(Number(e.target.value));
                setPage(1); // Reset to first page when limit changes
              }}
            >
              {[10, 20, 30, 40, 50].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`${styles.tableContainer} table-responsive`}>
          <table className="table table-hover table-bordered borderedtable">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Sale Code</th>
                <th>Customer Name</th>
                <th>Quantity</th>
                <th>Total Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: '20px' }}>
                    Loading...
                  </td>
                </tr>
              ) : displayOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: '20px' }}>
                    No sales orders found.
                  </td>
                </tr>
              ) : (
                displayOrders.map((order, index) => {
                  const actualIndex = (page - 1) * entityCount + index + 1;
                  return (
                    <tr key={order.id || index}>
                      <td>{actualIndex}</td>
                    <td>{formatDate(order.date)}</td>
                      <td style={{ fontWeight: 600 }}>{order.saleCode || order.id}</td>
                    <td>{order.customerName}</td>
                    <td>{order.quantity}</td>
                      <td>₹{Number(order.grandTotal || order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ textTransform: 'capitalize' }}>{order.paymentMethod || 'N/A'}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                            order.status === "completed" || order.paymentStatus === "completed" 
                              ? styles.completed 
                              : styles.pending
                        }`}
                      >
                          {order.status || order.paymentStatus || 'pending'}
                      </span>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontFamily: 'Poppins', color: '#666', fontSize: '14px' }}>
              Showing {((page - 1) * entityCount) + 1} to {Math.min(page * entityCount, total)} of {total} sales
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

export default StoreSalesOrders;

