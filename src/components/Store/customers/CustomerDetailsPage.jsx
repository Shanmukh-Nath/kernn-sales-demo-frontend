import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerTabSection from "./CustomerTabSection";
import Loading from "@/components/Loading";
import ErrorModal from "@/components/ErrorModal";
import storeService from "../../../services/storeService";

function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
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

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
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

      const response = await storeService.getStoreCustomerById(storeId, id);

      if (response.success && response.data) {
        setCustomer(response.data);
      } else {
        setError(response.message || "Failed to load customer details");
        setIsModalOpen(true);
        setCustomer(null);
      }
    } catch (err) {
      console.error("Error fetching customer:", err);
      setError(err.message || "Failed to load customer details. Please try again.");
      setIsModalOpen(true);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Loading />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4">
        <p>Customer not found</p>
      </div>
    );
  }

  return (
    <>
      <p className="path">
        <span onClick={() => navigate("/store/customers")}>Customers</span>{" "}
        <i className="bi bi-chevron-right"></i>{" "}
        <span onClick={() => navigate("/store/customers/list")}>Customers List</span>{" "}
        <i className="bi bi-chevron-right"></i> Customer Details
      </p>

      <div className="p-4">
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <h4 style={{ fontFamily: 'Poppins', fontWeight: 600, marginBottom: '8px', color: 'var(--primary-color)' }}>
                {customer.name}
              </h4>
              <p style={{ fontFamily: 'Poppins', color: '#666', margin: 0, fontSize: '14px' }}>
                {customer.mobile} {customer.email ? `• ${customer.email}` : ''}
              </p>
            </div>
            {customer.customerCode && (
              <div style={{ 
                background: '#f3f4f6', 
                padding: '8px 12px', 
                borderRadius: '6px',
                fontFamily: 'Poppins',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151'
              }}>
                {customer.customerCode}
              </div>
            )}
          </div>
          {customer.totalPurchases !== undefined && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
              <p style={{ fontFamily: 'Poppins', fontSize: '14px', margin: 0, color: '#666' }}>
                <strong style={{ color: '#374151' }}>Total Purchases:</strong> ₹{customer.totalPurchases?.toLocaleString('en-IN') || '0'}
              </p>
            </div>
          )}
        </div>

        <CustomerTabSection customer={customer} />
      </div>

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

export default CustomerDetailsPage;

