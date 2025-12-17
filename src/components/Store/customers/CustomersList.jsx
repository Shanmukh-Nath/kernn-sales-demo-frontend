import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../Dashboard/Purchases/Purchases.module.css";
import { FaUserCheck, FaUserClock } from "react-icons/fa";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import storeService from "../../../services/storeService";
import Loading from "@/components/Loading";
import ErrorModal from "@/components/ErrorModal";

export default function CustomersList() {
  const navigate = useNavigate();
  const [pageNo, setPageNo] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get current store ID from localStorage
  const getStoreId = () => {
    try {
      const selectedStore = localStorage.getItem("selectedStore");
      if (selectedStore) {
        const store = JSON.parse(selectedStore);
        return store.id;
      }
      const currentStoreId = localStorage.getItem("currentStoreId");
      return currentStoreId ? parseInt(currentStoreId) : null;
    } catch (e) {
      console.error("Error parsing store data:", e);
      return null;
    }
  };

  // Fetch customers from API
  const fetchCustomers = async () => {
    const storeId = getStoreId();
    if (!storeId) {
      setError("Store not selected. Please select a store first.");
      setIsModalOpen(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = {
        page: pageNo,
        limit: limit,
      };

      const response = await storeService.getStoreCustomers(storeId, params);

      if (response.success && response.data) {
        setCustomers(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotal(response.pagination.total || 0);
        }
      } else {
        setError(response.message || "Failed to fetch customers");
        setIsModalOpen(true);
        setCustomers([]);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError(err.message || "Failed to fetch customers. Please try again.");
      setIsModalOpen(true);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch customers when page or limit changes
  useEffect(() => {
    fetchCustomers();
  }, [pageNo, limit]);

  const closeModal = () => {
    setIsModalOpen(false);
    setError("");
  };

  return (
    <>
      <p className="path">
        <span onClick={() => navigate("/store/customers")}>Customers</span>{" "}
        <i className="bi bi-chevron-right"></i> Customers List
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
                onChange={(e) => setLimit(Number(e.target.value))}
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
                <th>Customer Code</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Total Purchases</th>
                <th>Created By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <Loading />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                    NO DATA FOUND
                  </td>
                </tr>
              ) : (
                customers.map((customer, index) => {
                  const actualIndex = (pageNo - 1) * limit + index + 1;
                  return (
                    <tr
                      key={customer.id}
                      className="animated-row"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <td>{actualIndex}</td>
                      <td>{customer.customerCode || `CUST${customer.id}`}</td>
                      <td>{customer.name}</td>
                      <td>{customer.mobile}</td>
                      <td>₹{customer.totalPurchases?.toLocaleString('en-IN') || '0'}</td>
                      <td>{customer.createdByEmployee?.name || 'N/A'}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/store/customers/${customer.id}`)}
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
          <div className="row m-0 p-0 pt-3 justify-content-between align-items-center">
            <div className={`col-6 m-0 p-0`}>
              <p style={{ margin: 0, fontFamily: 'Poppins', fontSize: '14px', color: '#666' }}>
                Showing {customers.length > 0 ? (pageNo - 1) * limit + 1 : 0} to {Math.min(pageNo * limit, total)} of {total} customers
              </p>
            </div>
            <div className={`col-2 m-0 p-0 ${styles.buttonbox}`}>
              {pageNo > 1 && (
                <button onClick={() => setPageNo(pageNo - 1)} disabled={loading}>
                  <span>
                    <FaArrowLeftLong />
                  </span>{" "}
                  Previous
                </button>
              )}
            </div>
            <div className={`col-2 m-0 p-0 ${styles.buttonbox}`}>
              {pageNo < totalPages && (
                <button onClick={() => setPageNo(pageNo + 1)} disabled={loading}>
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

      {isModalOpen && (
        <ErrorModal
          isOpen={isModalOpen}
          message={error}
          onClose={closeModal}
        />
      )}
    </>
  );
}

