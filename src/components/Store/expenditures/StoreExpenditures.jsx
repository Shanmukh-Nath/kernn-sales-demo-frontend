import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorModal from "@/components/ErrorModal";
import SuccessModal from "@/components/SuccessModal";
import Loading from "@/components/Loading";
import storeService from "../../../services/storeService";
import styles from "../../Dashboard/HomePage/HomePage.module.css";

const MONTH_OPTIONS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const LIMIT_OPTIONS = [10, 25, 50];

const now = new Date();
const DEFAULT_FILTERS = {
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  page: 1,
  limit: 10,
};

const getInitialFormState = () => ({
  staffSalary: "",
  rent: "",
  powerBill: "",
  maintenance: "",
  customFields: [],
});

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const monthLabel = (monthNumber) => {
  const option = MONTH_OPTIONS.find((entry) => entry.value === Number(monthNumber));
  return option ? option.label : "Unknown";
};

const convertCustomFieldsToRows = (customFields) => {
  if (!customFields || typeof customFields !== "object") return [];
  return Object.entries(customFields).map(([key, value]) => ({
    key,
    value: value ?? "",
  }));
};

const convertRowsToCustomFields = (rows = []) =>
  rows.reduce((acc, row) => {
    const trimmedKey = row.key?.trim();
    if (!trimmedKey) return acc;

    if (row.value === null || row.value === undefined || row.value === "") {
      acc[trimmedKey] = 0;
      return acc;
    }

    const numericValue = Number(row.value);
    acc[trimmedKey] = Number.isNaN(numericValue) ? row.value : numericValue;
    return acc;
  }, {});

const totalCustomFieldsAmount = (customFields) =>
  Object.values(customFields || {}).reduce((sum, amount) => sum + Number(amount || 0), 0);

const totalRecordExpenditure = (record) =>
  Number(record.staffSalary || 0) +
  Number(record.rent || 0) +
  Number(record.powerBill || 0) +
  Number(record.maintenance || 0) +
  totalCustomFieldsAmount(record.customFields);

const renderCustomFieldList = (customFields) => {
  const entries = Object.entries(customFields || {});
  if (!entries.length) {
    return <span style={{ color: "#9ca3af", fontFamily: "Poppins", fontSize: "13px" }}>—</span>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: "18px" }}>
      {entries.map(([key, value]) => (
        <li key={key} style={{ fontFamily: "Poppins", fontSize: "13px" }}>
          <strong>{key}</strong>: {formatCurrency(value)}
        </li>
      ))}
    </ul>
  );
};

function StoreExpenditures() {
  const navigate = useNavigate();

  const [storeId, setStoreId] = useState(null);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });

  const [expenditures, setExpenditures] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [selectedExpenditureId, setSelectedExpenditureId] = useState(null);
  const [selectedExpenditure, setSelectedExpenditure] = useState(null);
  const [editForm, setEditForm] = useState(getInitialFormState());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    month: DEFAULT_FILTERS.month,
    year: DEFAULT_FILTERS.year,
    staffSalary: "",
    rent: "",
    powerBill: "",
    maintenance: "",
    customFields: [],
  });

  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
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
    if (storeId) return;
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
  }, [showError, storeId]);

  const fetchExpenditures = useCallback(async () => {
    if (!storeId) return;
    setListLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
        month: filters.month,
        year: filters.year
      };
      
      const res = await storeService.getStoreExpenditures(storeId, params);
      const expendituresData = res.data || res.expenditures || res || [];
      const paginationData = res.pagination || {};
      
      // Map backend response to frontend format
      const mappedExpenditures = Array.isArray(expendituresData) ? expendituresData.map(item => ({
        id: item.id,
        expenditureCode: item.expenditureCode || item.code || `EXP-${item.id}`,
        month: item.month || filters.month,
        year: item.year || filters.year,
        staffSalary: parseFloat(item.staffSalary || 0),
        rent: parseFloat(item.rent || 0),
        powerBill: parseFloat(item.powerBill || 0),
        maintenance: parseFloat(item.maintenance || 0),
        customFields: item.customFields || {},
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })) : [];

      setExpenditures(mappedExpenditures);
      setPagination({
        page: paginationData.page || filters.page,
        limit: paginationData.limit || filters.limit,
        total: paginationData.total || mappedExpenditures.length,
        totalPages: paginationData.totalPages || Math.ceil((paginationData.total || mappedExpenditures.length) / filters.limit) || 1,
      });

      if (mappedExpenditures.length === 0) {
        setSelectedExpenditureId(null);
        setSelectedExpenditure(null);
        setEditForm(getInitialFormState());
      } else {
        // Only keep selection if it's still visible, otherwise clear it
        const stillVisible = mappedExpenditures.find((entry) => entry.id === selectedExpenditureId);
        if (!stillVisible) {
          setSelectedExpenditureId(null);
          setSelectedExpenditure(null);
          setEditForm(getInitialFormState());
        }
      }
    } catch (err) {
      console.error("Failed to fetch expenditures", err);
      showError(err.response?.data?.message || err.message || "Failed to fetch expenditures");
    } finally {
      setListLoading(false);
    }
  }, [filters.limit, filters.month, filters.page, filters.year, selectedExpenditureId, showError, storeId]);


  const loadExpenditureDetails = useCallback(
    async (expenditureId, { silent = false } = {}) => {
      if (!storeId || !expenditureId) return;
      if (!silent) {
        setDetailLoading(true);
      }
      try {
        const res = await storeService.getStoreExpenditureById(storeId, expenditureId);
        const data = res.data || res.expenditure || res;
        
        if (data && data.id) {
          const mappedData = {
            id: data.id,
            expenditureCode: data.expenditureCode || data.code || `EXP-${data.id}`,
            month: data.month,
            year: data.year,
            staffSalary: parseFloat(data.staffSalary || 0),
            rent: parseFloat(data.rent || 0),
            powerBill: parseFloat(data.powerBill || 0),
            maintenance: parseFloat(data.maintenance || 0),
            customFields: data.customFields || {},
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
          
          setSelectedExpenditure(mappedData);
          setEditForm({
            staffSalary: mappedData.staffSalary || "",
            rent: mappedData.rent || "",
            powerBill: mappedData.powerBill || "",
            maintenance: mappedData.maintenance || "",
            customFields: convertCustomFieldsToRows(mappedData.customFields),
          });
        } else {
          throw new Error("Expenditure not found.");
        }
      } catch (err) {
        console.error("Failed to load expenditure details", err);
        showError(err.response?.data?.message || err.message || "Failed to load expenditure details");
      } finally {
        if (!silent) {
          setDetailLoading(false);
        }
      }
    },
    [showError, storeId]
  );

  useEffect(() => {
    if (storeId) {
      fetchExpenditures();
    }
  }, [fetchExpenditures, storeId]);

  useEffect(() => {
    if (storeId && selectedExpenditureId) {
      loadExpenditureDetails(selectedExpenditureId);
    }
  }, [loadExpenditureDetails, selectedExpenditureId, storeId]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      ...(field !== "page" ? { page: 1 } : {}),
    }));
  };

  const handlePaginationChange = (direction) => {
    setFilters((prev) => {
      const totalPages = pagination.totalPages || 1;
      const nextPage = direction === "next" ? prev.page + 1 : prev.page - 1;
      if (nextPage < 1 || nextPage > totalPages) {
        return prev;
      }
      return { ...prev, page: nextPage };
    });
  };

  const handleEditInputChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCustomFieldChange = (index, field, value) => {
    setEditForm((prev) => {
      const rows = [...(prev.customFields || [])];
      rows[index] = {
        ...rows[index],
        [field]: value,
      };
      return { ...prev, customFields: rows };
    });
  };

  const handleAddCustomField = () => {
    setEditForm((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), { key: "", value: "" }],
    }));
  };

  const handleRemoveCustomField = (index) => {
    setEditForm((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((_, idx) => idx !== index),
    }));
  };

  const handleUpdateExpenditure = async (event) => {
    event.preventDefault();
    if (!storeId || !selectedExpenditureId) {
      showError("Select an expenditure before updating.");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        staffSalary: Number(editForm.staffSalary || 0),
        rent: Number(editForm.rent || 0),
        powerBill: Number(editForm.powerBill || 0),
        maintenance: Number(editForm.maintenance || 0),
        customFields: convertRowsToCustomFields(editForm.customFields),
      };
      
      const res = await storeService.updateStoreExpenditure(storeId, selectedExpenditureId, payload);
      const updatedData = res.data || res.expenditure || res;
      
      if (updatedData && updatedData.id) {
        const mappedData = {
          id: updatedData.id,
          expenditureCode: updatedData.expenditureCode || updatedData.code || `EXP-${updatedData.id}`,
          month: updatedData.month || selectedExpenditure.month,
          year: updatedData.year || selectedExpenditure.year,
          staffSalary: parseFloat(updatedData.staffSalary || 0),
          rent: parseFloat(updatedData.rent || 0),
          powerBill: parseFloat(updatedData.powerBill || 0),
          maintenance: parseFloat(updatedData.maintenance || 0),
          customFields: updatedData.customFields || {},
          createdAt: updatedData.createdAt,
          updatedAt: updatedData.updatedAt
        };
        
        setSelectedExpenditure(mappedData);
        showSuccess(res.message || "Store expenditure updated successfully.");
        await fetchExpenditures();
      } else {
        showSuccess("Store expenditure updated successfully.");
        await fetchExpenditures();
      }
    } catch (err) {
      console.error("Failed to update expenditure", err);
      showError(err.response?.data?.message || err.message || "Failed to update expenditure");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpenditure = async () => {
    if (!storeId || !selectedExpenditureId) return;
    const confirmed = window.confirm("Delete this expenditure record? This action cannot be undone.");
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await storeService.deleteStoreExpenditure(storeId, selectedExpenditureId);
      
      showSuccess(res.message || "Store expenditure deleted successfully.");
      setSelectedExpenditureId(null);
      setSelectedExpenditure(null);
      setEditForm(getInitialFormState());
      await fetchExpenditures();
    } catch (err) {
      console.error("Failed to delete expenditure", err);
      showError(err.response?.data?.message || err.message || "Failed to delete expenditure");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateInputChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCustomFieldChange = (index, field, value) => {
    setCreateForm((prev) => {
      const rows = [...(prev.customFields || [])];
      rows[index] = {
        ...rows[index],
        [field]: value,
      };
      return { ...prev, customFields: rows };
    });
  };

  const handleAddCreateCustomField = () => {
    setCreateForm((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), { key: "", value: "" }],
    }));
  };

  const handleRemoveCreateCustomField = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((_, idx) => idx !== index),
    }));
  };

  const handleCreateExpenditure = async (event) => {
    event.preventDefault();
    if (!storeId) {
      showError("Store information missing.");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        storeId: storeId,
        month: createForm.month,
        year: createForm.year,
        staffSalary: Number(createForm.staffSalary || 0),
        rent: Number(createForm.rent || 0),
        powerBill: Number(createForm.powerBill || 0),
        maintenance: Number(createForm.maintenance || 0),
        customFields: convertRowsToCustomFields(createForm.customFields),
      };
      
      const res = await storeService.createStoreExpenditure(payload);
      
      showSuccess(res.message || "Store expenditure created successfully.");
      setShowCreateForm(false);
      setCreateForm({
        month: DEFAULT_FILTERS.month,
        year: DEFAULT_FILTERS.year,
        staffSalary: "",
        rent: "",
        powerBill: "",
        maintenance: "",
        customFields: [],
      });
      await fetchExpenditures();
    } catch (err) {
      console.error("Failed to create expenditure", err);
      showError(err.response?.data?.message || err.message || "Failed to create expenditure");
    } finally {
      setActionLoading(false);
    }
  };


  const closeErrorModal = () => setIsErrorModalOpen(false);
  const closeSuccessModal = () => setIsSuccessModalOpen(false);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "24px" }}>
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
          Store Expenditures
        </h2>
        <p className="path">
         Expenditures
        </p>
      </div>

      {!storeId && (
        <div className={styles.orderStatusCard} style={{ marginBottom: "24px" }}>
          <p style={{ margin: 0, fontFamily: "Poppins" }}>Store information missing. Please re-login to continue.</p>
        </div>
      )}

      {storeId && (
        <>
          <div className="row m-0 p-3">
            <div className="col-3 formcontent">
              <label>Month</label>
              <select 
                value={filters.month} 
                onChange={(e) => handleFilterChange("month", Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #000",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: "Poppins",
                  backgroundColor: "#fff",
                  color: "#000",
                  cursor: "pointer",
                }}
              >
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-3 formcontent">
              <label>Year</label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => handleFilterChange("year", Number(e.target.value) || DEFAULT_FILTERS.year)}
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
            <div className="col-3 formcontent">
              <label>Rows per page</label>
              <select 
                value={filters.limit} 
                onChange={(e) => handleFilterChange("limit", Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #000",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: "Poppins",
                  backgroundColor: "#fff",
                  color: "#000",
                  cursor: "pointer",
                }}
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row m-0 p-3">
            <div className="col-12">
              <p style={{ margin: 0, fontFamily: "Poppins", color: "#6b7280" }}>
                Showing page {pagination.page} of {pagination.totalPages || 1}
              </p>
            </div>
          </div>

          <div className={styles.orderStatusCard} style={{ marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontFamily: "Poppins",
                  fontWeight: 600,
                  fontSize: "20px",
                  color: "var(--primary-color)",
                }}
              >
                Expenditure Register
              </h4>
              <button 
                className="homebtn" 
                type="button" 
                onClick={() => setShowCreateForm(!showCreateForm)}
                style={{ background: showCreateForm ? "#f3f4f6" : undefined }}
              >
                {showCreateForm ? "Cancel" : "Create New"}
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table table-bordered borderedtable table-sm" style={{ fontFamily: "Poppins" }}>
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Period</th>
                    <th>Staff Salary</th>
                    <th>Rent</th>
                    <th>Power Bill</th>
                    <th>Maintenance</th>
                    <th>Custom Fields</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {expenditures.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}>
                        {listLoading ? "Loading expenditures..." : "No expenditures found for the selected period."}
                      </td>
                    </tr>
                  )}
                  {expenditures.map((record) => {
                    const isSelected = record.id === selectedExpenditureId;
                    return (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedExpenditureId(record.id)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "rgba(37, 99, 235, 0.08)" : "transparent",
                        }}
                      >
                        <td style={{ fontWeight: 600 }}>{record.expenditureCode || `EXP-${record.id}`}</td>
                        <td>
                          {monthLabel(record.month)} {record.year}
                        </td>
                        <td>{formatCurrency(record.staffSalary)}</td>
                        <td>{formatCurrency(record.rent)}</td>
                        <td>{formatCurrency(record.powerBill)}</td>
                        <td>{formatCurrency(record.maintenance)}</td>
                        <td>{renderCustomFieldList(record.customFields)}</td>
                        <td>{formatCurrency(totalRecordExpenditure(record))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {expenditures.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "16px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <p style={{ margin: 0, fontFamily: "Poppins", color: "#374151" }}>
                  Total records: {pagination.total || expenditures.length}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="homebtn" type="button" onClick={() => handlePaginationChange("prev")} disabled={filters.page === 1}>
                    Previous
                  </button>
                  <button
                    className="homebtn"
                    type="button"
                    onClick={() => handlePaginationChange("next")}
                    disabled={filters.page >= (pagination.totalPages || 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Create Expenditure Form */}
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
                Create New Expenditure
              </h4>
              <form onSubmit={handleCreateExpenditure}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <label>Month</label>
                    <select
                      value={createForm.month}
                      onChange={(e) => handleCreateInputChange("month", Number(e.target.value))}
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
                        cursor: "pointer",
                      }}
                    >
                      {MONTH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Year</label>
                    <input
                      type="number"
                      value={createForm.year}
                      onChange={(e) => handleCreateInputChange("year", Number(e.target.value) || DEFAULT_FILTERS.year)}
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
                    <label>Staff Salary (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.staffSalary}
                      onChange={(e) => handleCreateInputChange("staffSalary", e.target.value)}
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
                    <label>Rent (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.rent}
                      onChange={(e) => handleCreateInputChange("rent", e.target.value)}
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
                    <label>Power Bill (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.powerBill}
                      onChange={(e) => handleCreateInputChange("powerBill", e.target.value)}
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
                    <label>Maintenance (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.maintenance}
                      onChange={(e) => handleCreateInputChange("maintenance", e.target.value)}
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
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label>Notes</label>
                    <textarea
                      rows="2"
                      value={createForm.notes || ""}
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

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h5 style={{ margin: 0, fontFamily: "Poppins", fontWeight: 600 }}>Custom Fields</h5>
                    <button type="button" className="homebtn" onClick={handleAddCreateCustomField}>
                      Add Field
                    </button>
                  </div>
                  {(createForm.customFields || []).length === 0 && (
                    <p style={{ fontFamily: "Poppins", color: "#6b7280", margin: 0 }}>No custom fields added.</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(createForm.customFields || []).map((row, index) => (
                      <div
                        key={`create-${row.key}-${index}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr auto",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Field name"
                          value={row.key}
                          onChange={(e) => handleCreateCustomFieldChange(index, "key", e.target.value)}
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
                        <input
                          type="number"
                          placeholder="Amount"
                          value={row.value}
                          onChange={(e) => handleCreateCustomFieldChange(index, "value", e.target.value)}
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
                        <button
                          type="button"
                          onClick={() => handleRemoveCreateCustomField(index)}
                          style={{
                            border: "1px solid #ef4444",
                            background: "transparent",
                            color: "#ef4444",
                            borderRadius: "6px",
                            padding: "6px 12px",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button className="homebtn" type="submit" disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create Expenditure"}
                  </button>
                  <button
                    className="homebtn"
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm({
                        month: DEFAULT_FILTERS.month,
                        year: DEFAULT_FILTERS.year,
                        staffSalary: "",
                        rent: "",
                        powerBill: "",
                        maintenance: "",
                        customFields: [],
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

          {/* Expenditure Details - Only show when a row is selected */}
          {selectedExpenditure && (
            <div className={styles.orderStatusCard}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontFamily: "Poppins",
                    fontWeight: 600,
                    fontSize: "20px",
                    color: "var(--primary-color)",
                  }}
                >
                  Expenditure #{selectedExpenditure.expenditureCode || selectedExpenditure.id}
                </h4>
                <span style={{ fontFamily: "Poppins", color: "#6b7280" }}>
                  {monthLabel(selectedExpenditure.month)} {selectedExpenditure.year}
                </span>
              </div>

              {detailLoading ? (
                <p style={{ fontFamily: "Poppins", margin: 0 }}>Loading expenditure details...</p>
              ) : (
              <form onSubmit={handleUpdateExpenditure}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <label>Staff Salary (₹)</label>
                    <input
                      type="number"
                      value={editForm.staffSalary}
                      onChange={(e) => handleEditInputChange("staffSalary", e.target.value)}
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
                    <label>Rent (₹)</label>
                    <input 
                      type="number" 
                      value={editForm.rent} 
                      onChange={(e) => handleEditInputChange("rent", e.target.value)}
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
                    <label>Power Bill (₹)</label>
                    <input
                      type="number"
                      value={editForm.powerBill}
                      onChange={(e) => handleEditInputChange("powerBill", e.target.value)}
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
                    <label>Maintenance (₹)</label>
                    <input
                      type="number"
                      value={editForm.maintenance}
                      onChange={(e) => handleEditInputChange("maintenance", e.target.value)}
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
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h5 style={{ margin: 0, fontFamily: "Poppins", fontWeight: 600 }}>Custom Fields</h5>
                    <button type="button" className="homebtn" onClick={handleAddCustomField}>
                      Add Field
                    </button>
                  </div>
                  {(editForm.customFields || []).length === 0 && (
                    <p style={{ fontFamily: "Poppins", color: "#6b7280", margin: 0 }}>No custom fields added.</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(editForm.customFields || []).map((row, index) => (
                      <div
                        key={`${row.key}-${index}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr auto",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Field name"
                          value={row.key}
                          onChange={(e) => handleCustomFieldChange(index, "key", e.target.value)}
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
                        <input
                          type="number"
                          placeholder="Amount"
                          value={row.value}
                          onChange={(e) => handleCustomFieldChange(index, "value", e.target.value)}
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
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(index)}
                          style={{
                            border: "1px solid #ef4444",
                            background: "transparent",
                            color: "#ef4444",
                            borderRadius: "6px",
                            padding: "6px 12px",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button className="homebtn" type="submit" disabled={actionLoading}>
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="homebtn"
                    type="button"
                    onClick={handleDeleteExpenditure}
                    disabled={actionLoading}
                    style={{ background: "#fee2e2", color: "#b91c1c" }}
                  >
                    Delete
                  </button>
                  <button
                    className="homebtn"
                    type="button"
                    onClick={() => {
                      setSelectedExpenditureId(null);
                      setSelectedExpenditure(null);
                      setEditForm(getInitialFormState());
                    }}
                    disabled={actionLoading}
                    style={{ background: "#f3f4f6", color: "#374151" }}
                  >
                    Close
                  </button>
                </div>
              </form>
              )}
            </div>
          )}
        </>
      )}

      {(listLoading && expenditures.length === 0) && <Loading />}

      <ErrorModal isOpen={isErrorModalOpen} message={error} onClose={closeErrorModal} />
      <SuccessModal isOpen={isSuccessModalOpen} message={successMessage} onClose={closeSuccessModal} />
    </div>
  );
}

export default StoreExpenditures;
