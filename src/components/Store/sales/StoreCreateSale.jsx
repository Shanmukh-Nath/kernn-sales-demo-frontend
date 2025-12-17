import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../../../services/apiService";
import { QRCodeSVG } from "qrcode.react";
import storeService from "../../../services/storeService";
import Loading from "../../Loading";
import ErrorModal from "../../ErrorModal";
import SuccessModal from "../../SuccessModal";

const styles = {
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '5px',
    border: '1px solid #d9d9d9',
    boxShadow: '1px 1px 3px #333',
    gap: '12px',
    flexWrap: 'wrap'
  },
  stepIndicatorMobile: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '5px',
    border: '1px solid #d9d9d9',
    boxShadow: '1px 1px 3px #333',
    gap: '8px',
    flexWrap: 'wrap'
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  stepItemActive: {
    backgroundColor: 'var(--primary-color)',
    color: 'white'
  },
  stepItemCompleted: {
    backgroundColor: '#28a745',
    color: 'white'
  },
  stepItemPending: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    border: '1px solid #dee2e6'
  },
  stepNumber: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
    width: '100%'
  },
  productGridMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    width: '100%'
  },
  productCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '16px',
    backgroundColor: '#fff',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
    transition: 'all 0.2s ease'
  },
  productTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '12px'
  },
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
    color: '#475569'
  },
  productActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '12px'
  },
  productLoadingSpinner: {
    border: '2px solid #e2e8f0',
    borderTop: '2px solid var(--primary-color)',
    borderRadius: '50%',
    width: '14px',
    height: '14px',
    animation: 'spin 1s linear infinite'
  }
};

function StepIndicator({ step, steps, isMobile }) {
  const meta = steps.map((title, idx) => ({
    number: idx + 1,
    title,
    description:
      title === 'Products' ? 'Add products to cart' :
      title === 'Overview' ? 'Review order details' :
      'Payment information'
  }));

  return (
    <div style={isMobile ? { ...styles.stepIndicator, ...styles.stepIndicatorMobile } : styles.stepIndicator}>
      {meta.map((item, index) => {
        let stepStyle = { ...styles.stepItem };
        if (index < step) stepStyle = { ...stepStyle, ...styles.stepItemCompleted };
        else if (index === step) stepStyle = { ...stepStyle, ...styles.stepItemActive };
        else stepStyle = { ...stepStyle, ...styles.stepItemPending };

        return (
          <div key={item.title} style={stepStyle}>
            <div style={styles.stepNumber}>{index < step ? '✓' : index + 1}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '12px' }}>{item.title}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>{item.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StoreCreateSale() {
  const [step, setStep] = useState(0);

  // Step 1: mobile number
  const [mobile, setMobile] = useState("");
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [checking, setChecking] = useState(false);

  // Steps: Products, Overview, Payment
  const steps = useMemo(() => ['Products', 'Overview', 'Payment'], []);

  // Step 2: customer form (only if not exists)
  const [customerForm, setCustomerForm] = useState({
    name: "",
    mobile: "",
    email: "",
    area: "",
    city: "",
    pincode: "",
  });
  const [readonlyExisting, setReadonlyExisting] = useState(true);
  const [customerChecked, setCustomerChecked] = useState(false);

  // Step 2: products & cart
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const [selectedProductForQty, setSelectedProductForQty] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [inputQuantity, setInputQuantity] = useState('');
  const [loadingProductIds, setLoadingProductIds] = useState(new Set());

  // Step 2: Payment
  const [mobileNumber, setMobileNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [generatedOrderId] = useState(() => `STORE-${Date.now().toString().slice(-6)}`);
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [payments, setPayments] = useState([{
    transactionDate: getTodayDate(),
    paymentMethod: "cash", // "cash" or "bank"
    paymentMode: "", // "UPI", "Card", or "Bank Transfer" (only when paymentMethod is "bank")
    amount: "",
    reference: "",
    remark: "",
    utrNumber: "", // UTR number for bank payments
    proofFile: null,
    proofPreviewUrl: null,
  }]);
  const [activePaymentTab, setActivePaymentTab] = useState(0);
  const [qrCodeData, setQrCodeData] = useState({}); // Store QR code data for each payment: { paymentIndex: { upiId, amount, showQR } }
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [calculatedTotal, setCalculatedTotal] = useState(null); // { subtotal, tax, total }
  const [calculatingTotal, setCalculatingTotal] = useState(false);
  const navigate = useNavigate();

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

  const sanitizeMobile = (value = "") => String(value || "").replace(/[^0-9]/g, "").slice(-10);

  const handleCheckMobile = async (mobileNumber = mobile) => {
    const cleanedMobile = sanitizeMobile(mobileNumber);
    console.log('handleCheckMobile called with mobileNumber:', mobileNumber, 'cleaned:', cleanedMobile, 'length:', cleanedMobile.length);
    if (cleanedMobile.length !== 10) {
      console.log('Mobile length is not 10, returning');
      return;
    }
    try {
      console.log('Setting checking to true');
      setChecking(true);
      setCustomerChecked(false);
      console.log('Checking customer for mobile:', mobileNumber);
      const matchCustomersByMobile = (list = []) => {
        const matched = list.filter((c) => sanitizeMobile(c.mobile) === cleanedMobile);
        console.log(`Matched ${matched.length} customers out of`, list.length);
        return matched;
      };
      
      // Make actual API call
      const resp = await ApiService.get(`/customers?mobile=${cleanedMobile}`);
      let customers = [];
      if (resp && typeof resp.json === 'function') {
        const data = await resp.json();
        console.log('API response:', data);
        const apiCustomers = Array.isArray(data?.customers) ? data.customers : [];
        customers = matchCustomersByMobile(apiCustomers);
      }
      
      // Fallback: fetch all and match by mobile
      if (!customers.length) {
        console.log('Falling back to /customers list fetch');
        const allResp = await ApiService.get(`/customers`);
        if (allResp && typeof allResp.json === 'function') {
          const allData = await allResp.json();
          const all = Array.isArray(allData?.customers) ? allData.customers : [];
          customers = matchCustomersByMobile(all);
        }
      }
      
      if (customers.length > 0) {
        const customer = customers[0];
        console.log('Customer found:', customer);
        setExistingCustomer(customer);
        setCustomerForm({
          name: customer.name || "",
          mobile: customer.mobile || cleanedMobile,
          email: customer.email || "",
          area: customer.area || "",
          city: customer.city || "",
          pincode: customer.pincode || "",
        });
        setReadonlyExisting(true);
      } else {
        console.log('No customer found');
        setExistingCustomer(null);
        setCustomerForm((f) => ({ ...f, mobile: cleanedMobile }));
      }
      setCustomerChecked(true);
    } catch (error) {
      console.error('Error checking customer:', error);
      setExistingCustomer(null);
      setCustomerForm((f) => ({ ...f, mobile: cleanedMobile }));
      setCustomerChecked(true);
    } finally {
      setChecking(false);
    }
  };

  // Fetch real products from store products API
  useEffect(() => {
    const fetchProducts = async () => {
      const storeId = getStoreId();
      if (!storeId) {
        console.warn("Store ID not found, cannot fetch products");
        console.warn("Available localStorage keys:", {
          selectedStore: localStorage.getItem("selectedStore"),
          currentStoreId: localStorage.getItem("currentStoreId"),
          user: localStorage.getItem("user")
        });
        setProductsLoading(false);
        return;
      }

      try {
        setProductsLoading(true);
        console.log("Fetching products for store:", storeId);
        
        // Use the for-sale endpoint specifically for sale creation
        const response = await storeService.getStoreProductsForSale(storeId);
        
        console.log("Store products for-sale response:", response);
        
        if (response.success && Array.isArray(response.data)) {
          // Map API response - /stores/:storeId/products/for-sale returns simplified structure
          const mappedProducts = response.data.map((item) => ({
            id: item.id, // Store product ID (this is what we need for the sale)
            storeProductId: item.id, // Store product ID
            productId: item.productId, // Original product ID
            name: item.productName || '-',
            sku: item.sku || '-',
            quantity: item.stock || 0, // Available stock
            unit: item.unit || 'kg',
            basePrice: item.basePrice || 0,
            price: item.price || item.basePrice || 0, // Current price
            isOutOfStock: item.isOutOfStock || false,
          }));
          console.log("Mapped products for sale:", mappedProducts);
          setProducts(mappedProducts);
        } else {
          const errorMsg = response.message || "Failed to load products";
          console.error("Failed to fetch products:", errorMsg, response);
          setProducts([]);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        console.error("Error details:", err.response?.data || err.message);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const cartItemsList = useMemo(() => Object.values(cartItems), [cartItems]);
  const cartItemsCount = cartItemsList.length;
  const totalCartValue = cartItemsList.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  // Calculate total with tax from backend when cart changes
  useEffect(() => {
    const calculateTotal = async () => {
      if (cartItemsCount === 0) {
        setCalculatedTotal(null);
        return;
      }

      const storeId = getStoreId();
      if (!storeId) {
        return;
      }

      try {
        setCalculatingTotal(true);
        
        // Prepare items for calculation
        const items = cartItemsList
          .filter((item) => item.productId)
          .map((item) => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity) || 0,
          }));

        if (items.length === 0) {
          setCalculatedTotal(null);
          return;
        }

        // Calculate subtotal from cart
        const subtotal = totalCartValue;

        // Try to calculate total using backend
        // First, try the calculate endpoint
        const calculateData = {
          storeId: storeId,
          items: items,
        };

        try {
          const response = await storeService.calculateSaleTotal(calculateData);
          
          if (response && response.success && response.data) {
            // Backend returned calculated total
            setCalculatedTotal({
              subtotal: response.data.subtotal || subtotal,
              tax: response.data.tax || response.data.taxAmount || 0,
              total: response.data.total || response.data.grandTotal || (subtotal + (response.data.tax || response.data.taxAmount || 0)),
            });
          } else {
            // Calculate endpoint not available, use fallback
            // Use 5% tax as default (backend will validate)
            const tax = Math.round(subtotal * 0.05);
            const total = subtotal + tax;
            setCalculatedTotal({ subtotal, tax, total });
          }
        } catch (calcErr) {
          // Calculate endpoint not available, use fallback
          console.log("Calculate endpoint not available, using estimated tax (5%)");
          const tax = Math.round(subtotal * 0.05);
          const total = subtotal + tax;
          setCalculatedTotal({ subtotal, tax, total });
        }
      } catch (err) {
        console.error("Error calculating total:", err);
        // Fallback to estimated tax
        const subtotal = totalCartValue;
        const tax = Math.round(subtotal * 0.05);
        const total = subtotal + tax;
        setCalculatedTotal({ subtotal, tax, total });
      } finally {
        setCalculatingTotal(false);
      }
    };

    // Debounce calculation to avoid too many API calls
    const timeoutId = setTimeout(() => {
      calculateTotal();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [cartItemsList, cartItemsCount, totalCartValue]);

  const reviewData = useMemo(() => {
    if (!cartItemsCount) return null;

    const customerInfo = existingCustomer
      ? {
          name: existingCustomer.name || customerForm.name,
          mobile: existingCustomer.mobile || customerForm.mobile,
          email: existingCustomer.email || customerForm.email,
          address:
            existingCustomer.address ||
            [existingCustomer.area, existingCustomer.city, existingCustomer.pincode].filter(Boolean).join(", "),
        }
      : {
          name: customerForm.name,
          mobile: customerForm.mobile,
          email: customerForm.email,
          address: [customerForm.area, customerForm.city, customerForm.pincode].filter(Boolean).join(", "),
        };

    const items = cartItemsList.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      total: item.totalPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    // Use calculated total from backend if available, otherwise use subtotal
    const tax = calculatedTotal?.tax || 0;
    const total = calculatedTotal?.total || calculatedTotal?.subtotal || subtotal;

    return {
      orderId: generatedOrderId,
      customer: customerInfo,
      items,
      totals: { subtotal, tax, total },
      upiId: "kernnfeeds@upi",
      bankDetails: {
        accountNumber: "1234567890",
        ifsc: "KERNN0001",
        bankName: "Kernn Bank",
      },
    };
  }, [cartItemsCount, cartItemsList, customerForm, existingCustomer, generatedOrderId, calculatedTotal]);

  const canGoNext = () => {
    if (step === 0) return cartItemsCount > 0; // Products step - need at least one item
    if (step === 1) return reviewData !== null; // Overview step
    if (step === 2) return true; // Payment step
    return false;
  };

  const setProductLoadingState = (productId, enable) => {
    setLoadingProductIds((prev) => {
      const next = new Set(prev);
      if (enable) next.add(productId);
      else next.delete(productId);
      return next;
    });
  };

  const showQuantityModalForProduct = (product) => {
    setSelectedProductForQty(product);
    setInputQuantity('');
    setShowQuantityModal(true);
  };

  const handleQuantityConfirm = () => {
    if (!selectedProductForQty) return;
    const quantity = parseInt(inputQuantity, 10);
    if (!quantity || quantity <= 0) return;

    // Use storeProductId (which is the id from store products API) as the key
    // The id field from store products API is the store product ID we need for the sale
    const productId = selectedProductForQty.storeProductId || selectedProductForQty.id;
    if (!productId) {
      console.error("Product missing ID:", selectedProductForQty);
      return;
    }

    setProductLoadingState(productId, true);

    setCartItems((prev) => {
      const existing = prev[productId] || {};
      const newQuantity = (existing.quantity || 0) + quantity;
      const unitPrice = selectedProductForQty.basePrice || selectedProductForQty.price || 0;
      const totalPrice = unitPrice * newQuantity;

      return {
        ...prev,
        [productId]: {
          ...selectedProductForQty,
          id: productId, // Ensure id is set to store product ID
          storeProductId: productId, // Ensure storeProductId is set
          quantity: newQuantity,
          unit: selectedProductForQty.productType === "packed" ? "packs" : (selectedProductForQty.unit || "units"),
          price: unitPrice,
          totalPrice
        }
      };
    });

    setProductLoadingState(productId, false);
    setShowQuantityModal(false);
    setSelectedProductForQty(null);
    setInputQuantity('');
    setProductLoadingState(productId, false);
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const addPayment = () => {
    setPayments((prev) => [
      ...prev,
      {
        transactionDate: getTodayDate(),
        paymentMethod: "cash",
        paymentMode: "",
        amount: "",
        reference: "",
        remark: "",
        utrNumber: "",
        proofFile: null,
        proofPreviewUrl: null,
      },
    ]);
  };

  const removePayment = (idx) => {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePaymentField = (idx, field, value) => {
    setPayments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    
    // If amount changes and QR is shown, hide it to force regeneration
    if (field === "amount" && qrCodeData[idx]?.showQR) {
      setQrCodeData(prev => ({
        ...prev,
        [idx]: { ...prev[idx], showQR: false }
      }));
    }
  };

  const handlePaymentProof = (idx, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPayments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], proofFile: file, proofPreviewUrl: previewUrl };
      return next;
    });
  };

  const handleSubmitPayment = async (e) => {
    // Prevent any default form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("Submit Payment button clicked");
    console.log("Current state:", { reviewData, cartItemsCount, customerForm, payments });
    
    // Validate required data
    if (!reviewData || cartItemsCount === 0) {
      setError("Please add products to cart before submitting");
      setIsErrorModalOpen(true);
      return;
    }

    // Mobile number is optional, but if provided, it must be valid (10 digits)
    if (customerForm.mobile && customerForm.mobile.trim() !== "" && customerForm.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number or leave it empty");
      setIsErrorModalOpen(true);
      return;
    }

    // Customer details are optional - no validation needed

    // Validate payments
    const totalPaymentAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (totalPaymentAmount <= 0) {
      setError("Please enter payment amounts");
      setIsErrorModalOpen(true);
      return;
    }

    // Validate payment amount matches calculated total (with tolerance for rounding)
    const expectedTotal = calculatedTotal?.total || reviewData?.totals?.total || totalCartValue;
    const paymentDifference = Math.abs(totalPaymentAmount - expectedTotal);
    if (paymentDifference > 1) { // Allow 1 rupee difference for rounding
      setError(`Payment amount (₹${totalPaymentAmount.toLocaleString('en-IN')}) does not match order total (₹${expectedTotal.toLocaleString('en-IN')}). Please enter the correct amount.`);
      setIsErrorModalOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const storeId = getStoreId();

      if (!storeId) {
        setError("Store not selected. Please select a store first.");
        setIsErrorModalOpen(true);
        setSubmitting(false);
        return;
      }

      // Step 1: Prepare customer object for sale API
      // The sale API expects customer object with name and mobile, not customerId
      // Customer details are optional
      const customer = {};
      
      // Add name if provided
      if (customerForm.name && customerForm.name.trim()) {
        customer.name = customerForm.name.trim();
      }
      
      // Add mobile if provided
      if (customerForm.mobile && customerForm.mobile.trim()) {
        const customerMobile = sanitizeMobile(customerForm.mobile);
        if (customerMobile && customerMobile.length === 10) {
          customer.mobile = customerMobile;
        }
      }
      
      // Add optional fields if provided
      if (customerForm.email && customerForm.email.trim()) {
        customer.email = customerForm.email.trim();
      }
      
      // Only include customer object if it has at least one field
      // If customer object is empty, backend should handle it or we can send null/undefined

      // Step 2: Format items for API (productId and quantity required)
      // Note: productId should be the actual product ID (not store product ID)
      const items = cartItemsList
        .filter((item) => {
          // Filter out items without valid productId
          const productId = item.productId; // Actual product ID from for-sale endpoint
          if (!productId) {
            console.warn("Cart item missing productId:", item);
            return false;
          }
          return true;
        })
        .map((item) => {
          // Use actual product ID (productId from the for-sale endpoint response)
          return {
            productId: item.productId, // Actual product ID (e.g., 16), not store product ID
            quantity: parseFloat(item.quantity) || 0,
          };
        });

      if (items.length === 0) {
        setError("No valid products in cart. Please add products to cart.");
        setIsErrorModalOpen(true);
        setSubmitting(false);
        return;
      }

      console.log("Formatted items for API:", items);

      // Step 3: Format payments for API (paymentMethod and amount required)
      // Payment proof is handled separately via UTR endpoint if needed
      const formattedPayments = payments
        .filter((payment) => payment.amount && parseFloat(payment.amount) > 0)
        .map((payment) => ({
          paymentMethod: payment.paymentMethod || "cash",
          amount: parseFloat(payment.amount) || 0,
        }));

      if (formattedPayments.length === 0) {
        setError("Please enter at least one payment with a valid amount");
        setIsErrorModalOpen(true);
        setSubmitting(false);
        return;
      }

      // Step 4: Prepare sale request body according to backend API
      // API expects: { storeId, customer: { name?, mobile? } (optional), items: [{ productId, quantity }], payments: [{ paymentMethod, amount }], notes? }
      const saleData = {
        storeId: storeId,
        items: items, // Array of { productId, quantity }
        payments: formattedPayments, // Array of { paymentMethod, amount }
        ...(notes && notes.trim() && { notes: notes.trim() }), // Optional notes field
      };
      
      // Only include customer if it has at least one field
      if (Object.keys(customer).length > 0) {
        saleData.customer = customer;
      }

      console.log("Creating sale with data:", saleData);
      console.log("Sale data JSON:", JSON.stringify(saleData, null, 2));

      // Step 5: Create sale
      let saleResponse;
      try {
        saleResponse = await storeService.createSale(saleData);
        console.log("Sale creation response:", saleResponse);
      } catch (apiErr) {
        // If the API service throws an error, it might be in a different format
        console.error("API Service error:", apiErr);
        throw apiErr; // Re-throw to be caught by outer catch
      }

      if (saleResponse.success || saleResponse.data) {
        setSuccessMessage("✅ Sale created successfully!");
        setIsSuccessModalOpen(true);
      } else {
        // Check if error is about payment amount mismatch
        const errorMessage = saleResponse.message || "";
        if (errorMessage.includes("Payment amount") && errorMessage.includes("does not match sale total")) {
          // Extract the expected total from error message if possible
          const totalMatch = errorMessage.match(/sale total \(([\d,]+)\)/);
          if (totalMatch) {
            const expectedTotal = totalMatch[1].replace(/,/g, '');
            setError(`Payment amount mismatch. Backend calculated total (with tax): ₹${parseInt(expectedTotal).toLocaleString('en-IN')}. Please enter this amount as payment.`);
          } else {
            setError(errorMessage + " Please check the payment amount matches the backend calculated total (subtotal + tax).");
          }
        } else {
          setError(errorMessage || "Failed to create sale");
        }
        setIsErrorModalOpen(true);
      }
    } catch (err) {
      console.error("Error creating sale:", err);
      console.error("Error response:", err.response);
      console.error("Error data:", err.response?.data);
      
      // Get detailed error message from backend
      let errorMessage = "Failed to create sale. Please try again.";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        // Try to get the most detailed error message
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map(e => e.message || e).join(', ');
        } else if (errorData.errors && typeof errorData.errors === 'object') {
          errorMessage = Object.values(errorData.errors).flat().join(', ');
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Check if error is about payment amount mismatch
      if (errorMessage.includes("Payment amount") && errorMessage.includes("does not match sale total")) {
        // Extract the expected total from error message if possible
        const totalMatch = errorMessage.match(/sale total \(([\d,]+)\)/);
        if (totalMatch) {
          const expectedTotal = totalMatch[1].replace(/,/g, '');
          setError(`Payment amount mismatch. Backend calculated total (with tax): ₹${parseInt(expectedTotal).toLocaleString('en-IN')}. Please enter this amount as payment.`);
        } else {
          setError(errorMessage + " Please check the payment amount matches the backend calculated total (subtotal + tax).");
        }
      } else {
        setError(errorMessage);
      }
      setIsErrorModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuantityModal = () => {
    if (!showQuantityModal || !selectedProductForQty) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowQuantityModal(false);
            setSelectedProductForQty(null);
            setInputQuantity('');
          }
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: isMobile ? '16px' : '24px',
            width: isMobile ? '95vw' : '400px',
            maxWidth: '95vw',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
            Add to Cart
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <strong>Product:</strong>
            <div>{selectedProductForQty.name}</div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <strong>Available Stock:</strong>
            <div>
              {selectedProductForQty.quantity || 0} {selectedProductForQty.productType === "packed" ? "packs" : selectedProductForQty.unit || "units"}
              {selectedProductForQty.isOutOfStock && (
                <span style={{ color: '#dc2626', marginLeft: '8px', fontSize: '12px' }}>(Out of Stock)</span>
              )}
              {selectedProductForQty.isLowStock && !selectedProductForQty.isOutOfStock && (
                <span style={{ color: '#f97316', marginLeft: '8px', fontSize: '12px' }}>(Low Stock)</span>
              )}
            </div>
          </div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Quantity</label>
          <input
            type="number"
            min="1"
            value={inputQuantity}
            onChange={(e) => setInputQuantity(e.target.value)}
            placeholder="Enter quantity"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #dbeafe'
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn btn-light" onClick={() => { setShowQuantityModal(false); setSelectedProductForQty(null); }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!inputQuantity || parseInt(inputQuantity, 10) <= 0}
              onClick={handleQuantityConfirm}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };
  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ padding: isMobile ? 8 : 12, maxWidth: '100%', overflowX: 'hidden' }}>
      <p className="path">
        <span onClick={() => navigate("/store/sales")}>Sales</span>{" "}
        <i className="bi bi-chevron-right"></i> Create Sale
      </p>
      <h4 style={{ marginBottom: isMobile ? 12 : 8, fontSize: isMobile ? '18px' : '20px' }}>Create Sale</h4>
      <StepIndicator step={step} steps={steps} isMobile={isMobile} />

      {steps[step] === 'Products' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: 4 }}>Add Products</div>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Select products and build the cart just like the sales order experience.</p>

          {cartItemsCount > 0 && (
            <div style={{ border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, backgroundColor: '#eff6ff', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Cart Summary</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{cartItemsCount} item{cartItemsCount !== 1 ? 's' : ''} selected</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>₹{totalCartValue.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Total Value</div>
                </div>
              </div>
            </div>
          )}

          {productsLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#475569' }}>Loading products...</div>
          ) : (
            <div style={isMobile ? { ...styles.productGrid, ...styles.productGridMobile } : styles.productGrid}>
              {products.map((product) => {
                const inCart = cartItems[product.id]?.quantity || 0;
                const isLoading = loadingProductIds.has(product.id);

                return (
                  <div
                    key={product.id}
                    style={{
                      ...styles.productCard,
                      borderColor: inCart ? '#22c55e' : '#e2e8f0',
                      backgroundColor: inCart ? 'rgba(34, 197, 94, 0.08)' : '#fff'
                    }}
                  >
                    <div style={styles.productTitle}>{product.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div style={styles.productInfo}>
                        <span style={{ fontWeight: 600 }}>SKU</span>
                        <span>{product.sku || 'N/A'}</span>
                      </div>
                      <div style={styles.productInfo}>
                        <span style={{ fontWeight: 600 }}>Stock</span>
                        <span style={{ 
                          color: product.isOutOfStock ? '#dc2626' : product.isLowStock ? '#f97316' : '#16a34a'
                        }}>
                          {product.isOutOfStock ? 'Out of Stock' : `${product.quantity || 0}${product.isLowStock ? ' (Low)' : ''}`}
                        </span>
                      </div>
                      <div style={styles.productInfo}>
                        <span style={{ fontWeight: 600 }}>Unit</span>
                        <span>{product.productType === "packed" ? "packs" : (product.unit === "packet" ? "packs" : product.unit || 'unit')}</span>
                      </div>
                      <div style={styles.productInfo}>
                        <span style={{ fontWeight: 600 }}>Price</span>
                        <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>₹{(product.basePrice || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div style={{ ...styles.productActions, flexDirection: isMobile ? 'column' : 'row' }}>
                      <button
                        className={`btn ${inCart ? 'btn-success' : 'btn-primary'}`}
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 8,
                          minHeight: isMobile ? '44px' : 'auto',
                          fontSize: isMobile ? '14px' : '16px'
                        }}
                        disabled={isLoading}
                        onClick={() => showQuantityModalForProduct(product)}
                      >
                        {isLoading && <div style={styles.productLoadingSpinner}></div>}
                        {isLoading ? 'Adding...' : (inCart ? 'Add More' : 'Add to Cart')}
                      </button>
                      {inCart > 0 && (
                        <button
                          className="btn btn-outline-danger"
                          style={{ 
                            minWidth: isMobile ? '100%' : 90,
                            minHeight: isMobile ? '44px' : 'auto',
                            fontSize: isMobile ? '14px' : '16px'
                          }}
                          onClick={() => removeFromCart(product.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {inCart > 0 && (
                      <div style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: '#dcfce7', border: '1px solid #86efac' }}>
                        <div style={{ fontSize: 12, color: '#166534', marginBottom: 6, fontWeight: 600 }}>In Cart</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>Quantity</span>
                          <strong>{cartItems[product.id].quantity} {cartItems[product.id].unit}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>Line Total</span>
                          <strong>₹{(cartItems[product.id].totalPrice || 0).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
            <button className="btn btn-secondary" onClick={next} disabled={cartItemsCount === 0} style={{ minHeight: isMobile ? '44px' : 'auto', width: isMobile ? '100%' : 'auto' }}>Continue to Overview</button>
          </div>
        </div>
      )}

      {steps[step] === 'Overview' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Review Order</div>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Confirm customer & cart details before payment</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#0f172a', fontWeight: 700 }}>Order ID</div>
              <div style={{ fontSize: 14, color: '#475569' }}>{reviewData?.orderId || "N/A"}</div>
            </div>
          </div>

          {!reviewData ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
              Add at least one product to review the order.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, backgroundColor: '#f8fafc' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Customer</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>
                    <div><strong>Name:</strong> {reviewData.customer.name || "-"}</div>
                    <div><strong>Phone:</strong> {reviewData.customer.mobile || "-"}</div>
                    {reviewData.customer.address && <div><strong>Address:</strong> {reviewData.customer.address}</div>}
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, backgroundColor: '#f8fafc' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Totals</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>
                    <div><strong>Items:</strong> {reviewData.items.length}</div>
                    <div><strong>Subtotal:</strong> ₹{reviewData.totals.subtotal.toLocaleString('en-IN')}</div>
                    <div><strong>Tax:</strong> ₹{reviewData.totals.tax.toLocaleString('en-IN')}</div>
                    <div><strong>Total:</strong> ₹{reviewData.totals.total.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: 12, fontWeight: 600, color: '#1e293b' }}>Products</div>
                {reviewData.items.map((item) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr', padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: isMobile ? 12 : 13, color: '#475569', gap: isMobile ? '8px' : '0' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.sku || 'SKU NA'}</div>
                    </div>
                    <div>Qty: {item.quantity} {item.unit}</div>
                    <div>Price: ₹{(item.price || 0).toLocaleString('en-IN')}</div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>₹{(item.total || 0).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, backgroundColor: '#f8fafc', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span>Subtotal</span>
                  <strong>₹{reviewData.totals.subtotal.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span>Tax {calculatingTotal && <span style={{ fontSize: '11px', color: '#6b7280' }}>(calculating...)</span>}</span>
                  <strong>₹{reviewData.totals.tax.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 600 }}>Grand Total</span>
                  <strong style={{ fontSize: 18, color: '#0f172a' }}>₹{reviewData.totals.total.toLocaleString('en-IN')}</strong>
          </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
                <button className="btn btn-light" onClick={prev} style={{ minHeight: isMobile ? '44px' : 'auto', width: isMobile ? '100%' : 'auto' }}>Back to Products</button>
                <button className="btn btn-secondary" onClick={next} disabled={!reviewData} style={{ minHeight: isMobile ? '44px' : 'auto', width: isMobile ? '100%' : 'auto' }}>Continue to Payment</button>
              </div>
            </>
          )}
        </div>
      )}

      {steps[step] === 'Payment' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Payment Details</div>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Complete payment information to finalize the order</p>

          {!reviewData ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
              Complete the overview step to proceed with payment.
            </div>
          ) : (
            <>
              {/* Mobile Number (Optional) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, backgroundColor: '#f8fafc', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Mobile Number</div>
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>Optional - Enter mobile number for payment notifications</p>
                <input
                  type="tel"
                  placeholder="Enter mobile number (optional)"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  style={{ 
                    width: '100%', 
                    maxWidth: '400px',
                    padding: '10px 12px', 
                    borderRadius: 8, 
                    border: '1px solid #e5e7eb',
                    fontSize: '14px' 
                  }}
                />
              </div>

              {/* Order Summary */}
              <div style={{ border: '1px solid #c7d2fe', borderRadius: 12, padding: 16, backgroundColor: '#eef2ff', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#312e81' }}>Order Total</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1e1b4b' }}>₹{reviewData.totals.total.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 12, color: '#4338ca', marginTop: '4px' }}>
                      Subtotal: ₹{reviewData.totals.subtotal.toLocaleString('en-IN')} + Tax: ₹{reviewData.totals.tax.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 12, color: '#4338ca' }}>Order ID: {reviewData.orderId}</div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, backgroundColor: '#f8fafc', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Payment Info</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Payment Records</div>
                  <button className="btn btn-success" type="button" onClick={addPayment}>Add Payment</button>
                </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {payments.map((payment, idx) => (
                  <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Payment #{idx + 1}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Enter transaction details</div>
                      </div>
                      {payments.length > 1 && (
                        <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => removePayment(idx)}>
                          Remove
                        </button>
                      )}
                    </div>
                    {/* Payment Method Buttons - First */}
                    <div style={{ marginBottom: '16px', gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Payment Method</label>
                        <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                        <button
                          type="button"
                          onClick={() => updatePaymentField(idx, "paymentMethod", "cash")}
                          style={{
                            padding: isMobile ? '12px 20px' : '10px 24px',
                            borderRadius: '8px',
                            border: '2px solid',
                            borderColor: (payment.paymentMethod || "cash") === "cash" ? 'var(--primary-color)' : '#e2e8f0',
                            backgroundColor: (payment.paymentMethod || "cash") === "cash" ? 'var(--primary-color)' : '#fff',
                            color: (payment.paymentMethod || "cash") === "cash" ? '#fff' : '#4a5568',
                            fontWeight: '600',
                            fontSize: isMobile ? '14px' : '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            minHeight: isMobile ? '44px' : 'auto',
                            flex: isMobile ? '1' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if ((payment.paymentMethod || "cash") !== "cash") {
                              e.target.style.borderColor = 'var(--primary-color)';
                              e.target.style.backgroundColor = '#f0f4ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if ((payment.paymentMethod || "cash") !== "cash") {
                              e.target.style.borderColor = '#e2e8f0';
                              e.target.style.backgroundColor = '#fff';
                            }
                          }}
                        >
                          Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePaymentField(idx, "paymentMethod", "bank")}
                          style={{
                            padding: isMobile ? '12px 20px' : '10px 24px',
                            borderRadius: '8px',
                            border: '2px solid',
                            borderColor: payment.paymentMethod === "bank" ? 'var(--primary-color)' : '#e2e8f0',
                            backgroundColor: payment.paymentMethod === "bank" ? 'var(--primary-color)' : '#fff',
                            color: payment.paymentMethod === "bank" ? '#fff' : '#4a5568',
                            fontWeight: '600',
                            fontSize: isMobile ? '14px' : '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            minHeight: isMobile ? '44px' : 'auto',
                            flex: isMobile ? '1' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (payment.paymentMethod !== "bank") {
                              e.target.style.borderColor = 'var(--primary-color)';
                              e.target.style.backgroundColor = '#f0f4ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (payment.paymentMethod !== "bank") {
                              e.target.style.borderColor = '#e2e8f0';
                              e.target.style.backgroundColor = '#fff';
                            }
                          }}
                        >
                          Bank
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <div>
                        <label className="form-label">Transaction Date</label>
                        <input type="date" className="form-control"
                          value={payment.transactionDate || getTodayDate()}
                          onChange={(e) => updatePaymentField(idx, "transactionDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Amount (₹)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          min="0" 
                          value={payment.amount}
                          onChange={(e) => updatePaymentField(idx, "amount", e.target.value)}
                          placeholder={idx === 0 && reviewData ? `Enter ${reviewData.totals.total.toLocaleString('en-IN')} (Total with tax)` : "Enter amount"}
                        />
                        {idx === 0 && reviewData && !payment.amount && (
                          <small className="text-muted" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                            Total to pay: ₹{reviewData.totals.total.toLocaleString('en-IN')}
                          </small>
                        )}
                      </div>
                      {payment.paymentMethod === "bank" && (
                        <div>
                          <label className="form-label">UTR Number (Optional)</label>
                          <input type="text" className="form-control" placeholder="Enter UTR number"
                            value={payment.utrNumber || ''}
                            onChange={(e) => updatePaymentField(idx, "utrNumber", e.target.value)}
                          />
                        </div>
                      )}
                      <div>
                        <label className="form-label">Remark</label>
                        <input type="text" className="form-control" value={payment.remark}
                          onChange={(e) => updatePaymentField(idx, "remark", e.target.value)}
                        />
                      </div>
                      {payment.paymentMethod === "cash" && (
                        <div>
                          <label className="form-label">Proof (Optional)</label>
                          <input type="file" className="form-control" accept="image/*,application/pdf"
                            onChange={(e) => handlePaymentProof(idx, e.target.files?.[0])}
                          />
                          {payment.proofPreviewUrl && (
                            <a href={payment.proofPreviewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginTop: 4, display: 'inline-block' }}>
                              View proof
                            </a>
                          )}
                        </div>
                      )}
                      {payment.paymentMethod === "bank" && (
                        <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const amount = parseFloat(payment.amount) || 0;
                              if (amount <= 0) {
                                setSuccessMessage("Please enter a valid amount first");
                                setTimeout(() => setSuccessMessage(""), 3000);
                                return;
                              }
                              
                              const upiId = reviewData?.upiId || "kernnfeeds@upi";
                              const upiUrl = `upi://pay?pa=${upiId}&pn=Kernn Automations Private Limited&am=${amount.toFixed(2)}&cu=INR`;
                              
                              setQrCodeData(prev => ({
                                ...prev,
                                [idx]: {
                                  upiId: upiId,
                                  amount: amount,
                                  upiUrl: upiUrl,
                                  showQR: !prev[idx]?.showQR
                                }
                              }));
                            }}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '8px',
                              border: '2px solid var(--primary-color)',
                              backgroundColor: qrCodeData[idx]?.showQR ? 'var(--primary-color)' : '#fff',
                              color: qrCodeData[idx]?.showQR ? '#fff' : 'var(--primary-color)',
                              fontWeight: '600',
                              fontSize: '14px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                              if (!qrCodeData[idx]?.showQR) {
                                e.target.style.backgroundColor = 'var(--primary-color)';
                                e.target.style.color = '#fff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!qrCodeData[idx]?.showQR) {
                                e.target.style.backgroundColor = '#fff';
                                e.target.style.color = 'var(--primary-color)';
                              }
                            }}
                          >
                            {qrCodeData[idx]?.showQR ? 'Hide QR' : 'Generate QR'}
                          </button>
                          
                          {qrCodeData[idx]?.showQR && (
                            <div style={{
                              marginTop: '20px',
                              padding: '20px',
                              backgroundColor: '#fff',
                              borderRadius: '12px',
                              border: '2px solid #e5e7eb',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '16px'
                            }}>
                              <div style={{
                                padding: '20px',
                                backgroundColor: '#fff',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minWidth: '250px',
                                minHeight: '250px'
                              }}>
                                <QRCodeSVG
                                  value={qrCodeData[idx].upiUrl}
                                  size={250}
                                  level="H"
                                  includeMargin={true}
                                />
                              </div>
                              
                              <div style={{
                                textAlign: 'center',
                                width: '100%'
                              }}>
                                <div style={{
                                  fontFamily: 'Poppins',
                                  fontSize: '16px',
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  marginBottom: '8px'
                                }}>
                                  UPI ID: {qrCodeData[idx].upiId}
                                </div>
                                <div style={{
                                  fontFamily: 'Poppins',
                                  fontSize: '18px',
                                  fontWeight: 700,
                                  color: 'var(--primary-color)',
                                  marginTop: '4px'
                                }}>
                                  Amount: ₹{qrCodeData[idx].amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div style={{
                                  fontFamily: 'Poppins',
                                  fontSize: '12px',
                                  color: '#6b7280',
                                  marginTop: '8px'
                                }}>
                                  Scan with any UPI app to pay
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
          </div>
        </div>
                ))}
              </div>
              </div>

              {/* Notes field (optional) */}
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: 8 }}>Notes (Optional)</label>
                <textarea
                  className="form-control"
                  placeholder="Enter any additional notes about this sale..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
                <button 
                  className="btn btn-light" 
                  type="button"
                  onClick={prev} 
                  style={{ minHeight: isMobile ? '44px' : 'auto', width: isMobile ? '100%' : 'auto' }}
                >
                  Back to Overview
                </button>
                <button 
                  className="btn btn-primary" 
                  type="button" 
                  onClick={(e) => {
                    console.log("Button clicked, calling handleSubmitPayment");
                    handleSubmitPayment(e);
                  }}
                  disabled={submitting || !reviewData}
                  style={{ 
                    minHeight: isMobile ? '44px' : 'auto', 
                    width: isMobile ? '100%' : 'auto',
                    cursor: (submitting || !reviewData) ? 'not-allowed' : 'pointer',
                    opacity: (submitting || !reviewData) ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
              {successMessage && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac', textAlign: 'center', fontWeight: 600 }}>
                  {successMessage}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {renderQuantityModal()}
      
      {/* Loading overlay */}
      {submitting && <Loading />}
      
      {/* Error Modal */}
      {isErrorModalOpen && (
        <ErrorModal
          isOpen={isErrorModalOpen}
          message={error}
          onClose={() => {
            setIsErrorModalOpen(false);
            setError("");
          }}
        />
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <SuccessModal
          isOpen={isSuccessModalOpen}
          message={successMessage || "Sale created successfully!"}
          onClose={() => {
            setIsSuccessModalOpen(false);
            setSuccessMessage("");
            // Navigate back to sales page after closing modal
            navigate("/store/sales");
          }}
        />
      )}
    </div>
  );
}


