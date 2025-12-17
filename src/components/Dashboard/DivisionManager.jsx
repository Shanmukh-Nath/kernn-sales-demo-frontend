import React, { useState, useEffect } from "react";
import { useAuth } from "../../Auth";
import Loading from "../Loading";
import ErrorModal from "../ErrorModal";
import zonesService from "../../services/zonesService";
import subZonesService from "../../services/subZonesService";
import styles from "./DivisionManager.module.css";

function DivisionManager() {
  const { axiosAPI } = useAuth();
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDivision, setNewDivision] = useState({
    name: "",
    state: "",
    stateCode: "",
    plot: "",
    street1: "",
    street2: "",
    areaLocality: "",
    cityVillage: "",
    pincode: "",
    district: "",
    gstinNumber: "",
    cinNumber: ""
  });
  const [creating, setCreating] = useState(false);
  
  // Zones state
  const [activeTab, setActiveTab] = useState("divisions");
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [newZone, setNewZone] = useState({
    name: "",
    divisionId: "",
    zoneHeadId: "",
    plot: "",
    street1: "",
    street2: "",
    areaLocality: "",
    cityVillage: "",
    pincode: "",
    district: "",
    state: "",
    country: "India",
    stateCode: "",
    countryCode: "IN"
  });

  // Sub Zones state
  const [subZones, setSubZones] = useState([]);
  const [subZonesLoading, setSubZonesLoading] = useState(false);
  const [showSubZoneForm, setShowSubZoneForm] = useState(false);
  const [editingSubZone, setEditingSubZone] = useState(null);
  const [selectedZoneForSubZone, setSelectedZoneForSubZone] = useState("");
  const [newSubZone, setNewSubZone] = useState({
    name: "",
    subZoneHeadId: "",
    plot: "",
    street1: "",
    street2: "",
    areaLocality: "",
    cityVillage: "",
    pincode: "",
    district: "",
    state: "",
    country: "India",
    stateCode: "",
    countryCode: "IN",
  });

  // Stores state
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeManagers, setStoreManagers] = useState([]);
  const [storeEmployees, setStoreEmployees] = useState([]);
  const [storeDropdownLoading, setStoreDropdownLoading] = useState(false);
  const [newStore, setNewStore] = useState({
    name: "",
    street1: "",
    street2: "",
    area: "",
    district: "",
    state: "",
    divisionId: "",
    zoneId: "",
    storeType: "own",
    staffManagerId: "",
    employeeIds: []
  });
  const [storesPagination, setStoresPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchDivisions();
    fetchEmployees();
    
    // Pre-populate division when opening store form if in a specific division context
    const currentDivisionId = localStorage.getItem('currentDivisionId');
    if (currentDivisionId && currentDivisionId !== '1' && currentDivisionId !== 'all') {
      setNewStore(prev => ({
        ...prev,
        divisionId: currentDivisionId,
        employeeIds: prev.employeeIds || []
      }));
    }
  }, []);

  useEffect(() => {
    if (activeTab === "stores") {
      fetchStoreDropdowns();
    }
  }, [activeTab]);

  const fetchDivisions = async () => {
    try {
      setLoading(true);
      console.log("Fetching divisions...");
      
      // Try different endpoints as per the backend routes
      let response;
      try {
        // First try the main divisions endpoint
        response = await axiosAPI.get("/divisions");
        console.log("Divisions response (main):", response);
      } catch (mainError) {
        console.log("Main endpoint failed, trying /divisions/all");
        // If main endpoint fails, try the alternative
        response = await axiosAPI.get("/divisions/all");
        console.log("Divisions response (all):", response);
      }
      
      if (response.status === 200) {
        // Handle different possible response structures
        const divisionsData = response.data.divisions || response.data.data || response.data || [];
        console.log("Divisions data:", divisionsData);
        
        let processedDivisions = [];
        if (Array.isArray(divisionsData)) {
          processedDivisions = divisionsData;
        } else if (typeof divisionsData === 'object' && divisionsData !== null) {
          // If it's an object, try to extract divisions from it
          const extractedDivisions = Object.values(divisionsData).find(item => Array.isArray(item)) || [];
          processedDivisions = extractedDivisions;
        } else {
          processedDivisions = [];
        }

        console.log("Processed divisions:", processedDivisions);

        // Try to fetch statistics for each division, but don't fail if the endpoint doesn't exist
        const divisionsWithStats = await Promise.all(
          processedDivisions.map(async (division) => {
            console.log(`Fetching statistics for division ${division.id} (${division.name})`);
            try {
              // Try to fetch statistics for this division
              const statsResponse = await axiosAPI.get(`/divisions/${division.id}/statistics`);
              console.log(`Statistics response for division ${division.id}:`, statsResponse.data);
              
              // Handle the exact backend response structure
              const statsData = statsResponse.data?.data?.statistics || statsResponse.data?.statistics || {};
              console.log(`Extracted stats data for division ${division.id}:`, statsData);
              
              const divisionWithStats = {
                ...division,
                userCount: statsData.employees || statsData.users || statsData.userCount || 0,
                warehouseCount: statsData.warehouses || statsData.warehouseCount || 0,
                customerCount: statsData.customers || 0,
                productCount: statsData.products || 0,
                salesOrderCount: statsData.salesOrders || 0,
                purchaseOrderCount: statsData.purchaseOrders || 0,
              };
              
              console.log(`Final division with stats for ${division.id}:`, divisionWithStats);
              return divisionWithStats;
            } catch (statsError) {
              console.log(`No statistics available for division ${division.id}:`, statsError.message);
              console.log(`Stats error details:`, statsError.response?.data || statsError);
              
              // If statistics endpoint doesn't exist or fails, try to get counts from the division object itself
              const divisionWithFallbackStats = {
                ...division,
                userCount: division.userCount || division.usersCount || division.totalUsers || division.users || division.employees || division._count?.users || 0,
                warehouseCount: division.warehouseCount || division.warehousesCount || division.totalWarehouses || division.warehouses || division._count?.warehouses || 0,
                customerCount: division.customerCount || division.customers || 0,
                productCount: division.productCount || division.products || 0,
                salesOrderCount: division.salesOrderCount || division.salesOrders || 0,
                purchaseOrderCount: division.purchaseOrderCount || division.purchaseOrders || 0,
              };
              
              console.log(`Division with fallback stats for ${division.id}:`, divisionWithFallbackStats);
              return divisionWithFallbackStats;
            }
          })
        );

        console.log("Final divisions with stats:", divisionsWithStats);
        setDivisions(divisionsWithStats);
      }
    } catch (error) {
      console.error("Error fetching divisions:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch divisions";
      setError(errorMessage);
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh statistics
  const refreshStatistics = async () => {
    if (divisions.length === 0) return;
    
    try {
      setLoading(true);
      console.log("Refreshing statistics...");
      
      const divisionsWithRefreshedStats = await Promise.all(
        divisions.map(async (division) => {
          console.log(`Refreshing statistics for division ${division.id} (${division.name})`);
          try {
            // Try to fetch statistics for this division
            const statsResponse = await axiosAPI.get(`/divisions/${division.id}/statistics`);
            console.log(`Refreshed statistics response for division ${division.id}:`, statsResponse.data);
            
            // Handle the exact backend response structure
            const statsData = statsResponse.data?.data?.statistics || statsResponse.data?.statistics || {};
            console.log(`Extracted refreshed stats data for division ${division.id}:`, statsData);
            
            const divisionWithStats = {
              ...division,
              userCount: statsData.employees || statsData.users || statsData.userCount || 0,
              warehouseCount: statsData.warehouses || statsData.warehouseCount || 0,
              customerCount: statsData.customers || 0,
              productCount: statsData.products || 0,
              salesOrderCount: statsData.salesOrders || 0,
              purchaseOrderCount: statsData.purchaseOrders || 0,
            };
            
            console.log(`Final refreshed division with stats for ${division.id}:`, divisionWithStats);
            return divisionWithStats;
          } catch (statsError) {
            console.log(`Failed to refresh statistics for division ${division.id}:`, statsError.message);
            return division; // Return the division as is if refresh fails
          }
        })
      );

      console.log("Final divisions with refreshed stats:", divisionsWithRefreshedStats);
      setDivisions(divisionsWithRefreshedStats);
    } catch (error) {
      console.error("Error refreshing statistics:", error);
      setError("Failed to refresh statistics");
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get user count from division object
  const getUserCount = (division) => {
    // Check for different possible field names for user count
    return division.userCount || 
           division.usersCount || 
           division.totalUsers || 
           division.users || 
           division.employees ||
           division._count?.users ||
           division.statistics?.users ||
           0;
  };

  // Helper function to get warehouse count from division object
  const getWarehouseCount = (division) => {
    // Check for different possible field names for warehouse count
    return division.warehouseCount || 
           division.warehousesCount || 
           division.totalWarehouses || 
           division.warehouses || 
           division._count?.warehouses ||
           division.statistics?.warehouses ||
           0;
  };

  // Helper function to get customer count from division object
  const getCustomerCount = (division) => {
    return division.customerCount || division.customers || 0;
  };

  // Helper function to get product count from division object
  const getProductCount = (division) => {
    return division.productCount || division.products || 0;
  };

  // Helper function to get sales order count from division object
  const getSalesOrderCount = (division) => {
    return division.salesOrderCount || division.salesOrders || 0;
  };

  // Helper function to get purchase order count from division object
  const getPurchaseOrderCount = (division) => {
    return division.purchaseOrderCount || division.purchaseOrders || 0;
  };

  const handleCreateDivision = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['name', 'state', 'plot', 'street1', 'areaLocality', 'cityVillage', 'pincode', 'district'];
    const missingFields = requiredFields.filter(field => !newDivision[field] || newDivision[field].trim() === '');
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setIsModalOpen(true);
      return;
    }

    try {
      setCreating(true);
      console.log("Creating division:", newDivision);
      
      // Prepare the request body according to the new API format
      const divisionData = {
        name: newDivision.name,
        state: newDivision.state,
        stateCode: newDivision.stateCode || "",
        plot: newDivision.plot,
        street1: newDivision.street1,
        street2: newDivision.street2 || "",
        areaLocality: newDivision.areaLocality,
        cityVillage: newDivision.cityVillage,
        pincode: newDivision.pincode,
        district: newDivision.district,
        gstinNumber: newDivision.gstinNumber || "",
        cinNumber: newDivision.cinNumber || ""
      };
      
      console.log("Sending division data:", divisionData);
      
      // Use the correct divisions endpoint
      const response = await axiosAPI.post("/divisions", divisionData);
      console.log("Create division response:", response);
      
      if (response.status === 201 || response.status === 200) {
        // Reset form to initial state
        setNewDivision({
          name: "",
          state: "",
          stateCode: "",
          plot: "",
          street1: "",
          street2: "",
          areaLocality: "",
          cityVillage: "",
          pincode: "",
          district: "",
          gstinNumber: "",
          cinNumber: ""
        });
        setShowCreateForm(false);
        // Show success message
        setError("Division created successfully with detailed address information!");
        setIsModalOpen(true);
        fetchDivisions(); // Refresh the list
      }
    } catch (error) {
      console.error("Error creating division:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create division";
      setError(errorMessage);
      setIsModalOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDivision = async (divisionId) => {
    if (!window.confirm("Are you sure you want to delete this division?")) {
      return;
    }

    try {
      const response = await axiosAPI.delete(`/divisions/${divisionId}`);
      if (response.status === 200) {
        setError("Division deleted successfully!");
        setIsModalOpen(true);
        fetchDivisions(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting division:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete division";
      setError(errorMessage);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(""); // Clear error when modal is closed
  };

  // Zones functions
  const fetchEmployees = async () => {
    try {
      const response = await axiosAPI.get("/employees");
      const employeesData = response.data.employees || response.data.data || response.data || [];
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  };

  const fetchStoreDropdowns = async () => {
    try {
      setStoreDropdownLoading(true);
      const [managersResponse, employeesResponse] = await Promise.all([
        axiosAPI.get("/stores/dropdowns/managers"),
        axiosAPI.get("/stores/dropdowns/employees")
      ]);

      const extractList = (payload, fallbackKey) => {
        const data = payload?.data ?? payload ?? [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.[fallbackKey])) return data[fallbackKey];
        return [];
      };

      setStoreManagers(extractList(managersResponse, "managers"));
      setStoreEmployees(extractList(employeesResponse, "employees"));
    } catch (error) {
      console.error("Error fetching store dropdowns:", error);
      setStoreManagers([]);
      setStoreEmployees([]);
    } finally {
      setStoreDropdownLoading(false);
    }
  };

  const ensureStoreDropdowns = () => {
    if (storeManagers.length === 0 || storeEmployees.length === 0) {
      fetchStoreDropdowns();
    }
  };

  const fetchZones = async () => {
    try {
      setZonesLoading(true);
      const currentDivisionId = localStorage.getItem('currentDivisionId');
      const showAllDivisions = currentDivisionId === '1';
      
      const response = await zonesService.getZones({
        divisionId: currentDivisionId,
        isActive: true
      }, currentDivisionId, showAllDivisions);

      const data = response?.data || response || {};
      const zonesList = data.zones || data.data || data || [];
      setZones(Array.isArray(zonesList) ? zonesList : []);
    } catch (error) {
      console.error("Error fetching zones:", error);
      setZones([]);
    } finally {
      setZonesLoading(false);
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    
    if (!newZone.name || !newZone.divisionId) {
      setError("Please fill in zone name and division");
      setIsModalOpen(true);
      return;
    }

    try {
      setCreating(true);
      console.log("Creating zone:", newZone);
      
      const response = await zonesService.createZone(newZone);
      console.log("Create zone response:", response);
      
      if (response.success || response.zone || response.id) {
        // Reset form
        setNewZone({
          name: "",
          divisionId: "",
          zoneHeadId: "",
          plot: "",
          street1: "",
          street2: "",
          areaLocality: "",
          cityVillage: "",
          pincode: "",
          district: "",
          state: "",
          country: "India",
          stateCode: "",
          countryCode: "IN"
        });
        setShowZoneForm(false);
        setEditingZone(null);
        setError("Zone created successfully!");
        setIsModalOpen(true);
        fetchZones(); // Refresh the list
      }
    } catch (error) {
      console.error("Error creating zone:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create zone";
      setError(errorMessage);
      setIsModalOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateZone = async (e) => {
    e.preventDefault();
    
    if (!newZone.name || !newZone.divisionId) {
      setError("Please fill in zone name and division");
      setIsModalOpen(true);
      return;
    }

    try {
      setCreating(true);
      console.log("Updating zone:", editingZone.id, newZone);
      
      const response = await zonesService.updateZone(editingZone.id, newZone);
      console.log("Update zone response:", response);
      
      if (response.success || response.zone || response.id) {
        setShowZoneForm(false);
        setEditingZone(null);
        setError("Zone updated successfully!");
        setIsModalOpen(true);
        fetchZones(); // Refresh the list
      }
    } catch (error) {
      console.error("Error updating zone:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update zone";
      setError(errorMessage);
      setIsModalOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm("Are you sure you want to delete this zone?")) {
      return;
    }

    try {
      const response = await zonesService.deleteZone(zoneId);
      if (response.success || response.status === 200) {
        setError("Zone deleted successfully!");
        setIsModalOpen(true);
        fetchZones(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting zone:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete zone";
      setError(errorMessage);
      setIsModalOpen(true);
    }
  };

  const handleEditZone = (zone) => {
    setEditingZone(zone);
    setNewZone({
      name: zone.name || "",
      divisionId: zone.divisionId || "",
      zoneHeadId: zone.zoneHeadId || "",
      plot: zone.plot || "",
      street1: zone.street1 || "",
      street2: zone.street2 || "",
      areaLocality: zone.areaLocality || "",
      cityVillage: zone.cityVillage || "",
      pincode: zone.pincode || "",
      district: zone.district || "",
      state: zone.state || "",
      country: zone.country || "India",
      stateCode: zone.stateCode || "",
      countryCode: zone.countryCode || "IN"
    });
    setShowZoneForm(true);
  };

  const handleCancelZoneForm = () => {
    setShowZoneForm(false);
    setEditingZone(null);
    setNewZone({
      name: "",
      divisionId: "",
      zoneHeadId: "",
      plot: "",
      street1: "",
      street2: "",
      areaLocality: "",
      cityVillage: "",
      pincode: "",
      district: "",
      state: "",
      country: "India",
      stateCode: "",
      countryCode: "IN"
    });
  };

  // Sub Zones functions
  const fetchSubZones = async (zoneId) => {
    try {
      setSubZonesLoading(true);
      const response = await subZonesService.getSubZonesByZone(zoneId, true);
      const data = response?.data || response || {};
      const subZonesList = data.subZones || data.data || data || [];
      setSubZones(Array.isArray(subZonesList) ? subZonesList : []);
    } catch (error) {
      console.error("Error fetching sub zones:", error);
      setSubZones([]);
    } finally {
      setSubZonesLoading(false);
    }
  };

  const handleCreateSubZone = async (e) => {
    e.preventDefault();
    
    if (!newSubZone.name || !selectedZoneForSubZone) {
      setError("Please fill in sub zone name and select a zone");
      setIsModalOpen(true);
      return;
    }

    // Check for duplicate subzone name in the selected zone
    // Fetch current subzones for the selected zone to check duplicates
    try {
      const currentSubZonesResponse = await subZonesService.getSubZonesByZone(selectedZoneForSubZone, true);
      const currentSubZonesData = currentSubZonesResponse?.data || currentSubZonesResponse || {};
      const currentSubZonesList = Array.isArray(currentSubZonesData.subZones) 
        ? currentSubZonesData.subZones 
        : Array.isArray(currentSubZonesData.data) 
        ? currentSubZonesData.data 
        : Array.isArray(currentSubZonesData) 
        ? currentSubZonesData 
        : [];
      
      // Check if a subzone with the same name already exists in this zone
      const duplicateSubZone = currentSubZonesList.find(
        (sz) => sz.name?.toLowerCase().trim() === newSubZone.name.toLowerCase().trim()
      );
      
      if (duplicateSubZone) {
        setError(`A subzone with the name "${newSubZone.name}" already exists in the selected zone. Duplicate subzones are not allowed.`);
        setIsModalOpen(true);
        return;
      }
    } catch (fetchError) {
      console.error("Error fetching subzones for duplicate check:", fetchError);
      // Continue with creation if fetch fails - backend will handle duplicate check
    }

    try {
      setCreating(true);
      console.log("Creating sub zone:", newSubZone);
      
      const response = await subZonesService.createSubZone(selectedZoneForSubZone, newSubZone);
      console.log("Create sub zone response:", response);
      
      if (response.success || response.subZone || response.id) {
        // Reset form
        setNewSubZone({
          name: "",
          subZoneHeadId: "",
          plot: "",
          street1: "",
          street2: "",
          areaLocality: "",
          cityVillage: "",
          pincode: "",
          district: "",
          state: "",
          country: "India",
          stateCode: "",
          countryCode: "IN",
        });
        setSelectedZoneForSubZone("");
        setShowSubZoneForm(false);
        
        // Refresh sub zones list
        if (selectedZoneForSubZone) {
          await fetchSubZones(selectedZoneForSubZone);
        }
        
        setError("Sub zone created successfully!");
        setIsModalOpen(true);
      } else {
        setError(response.message || "Failed to create sub zone");
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error creating sub zone:", error);
      setError(error.message || "Failed to create sub zone");
      setIsModalOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSubZone = async (e) => {
    e.preventDefault();
    
    if (!newSubZone.name) {
      setError("Please fill in sub zone name");
      setIsModalOpen(true);
      return;
    }

    try {
      setCreating(true);
      console.log("Updating sub zone:", editingSubZone.id, newSubZone);
      
      const response = await subZonesService.updateSubZone(editingSubZone.id, newSubZone);
      console.log("Update sub zone response:", response);
      
      if (response.success || response.subZone || response.id) {
        // Reset form
        setNewSubZone({
          name: "",
          subZoneHeadId: "",
          plot: "",
          street1: "",
          street2: "",
          areaLocality: "",
          cityVillage: "",
          pincode: "",
          district: "",
          state: "",
          country: "India",
          stateCode: "",
          countryCode: "IN",
        });
        setSelectedZoneForSubZone("");
        setShowSubZoneForm(false);
        setEditingSubZone(null);
        
        // Refresh sub zones list
        if (selectedZoneForSubZone) {
          await fetchSubZones(selectedZoneForSubZone);
        }
        
        setError("Sub zone updated successfully!");
        setIsModalOpen(true);
      } else {
        setError(response.message || "Failed to update sub zone");
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error updating sub zone:", error);
      setError(error.message || "Failed to update sub zone");
      setIsModalOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSubZone = async (subZoneId) => {
    if (!window.confirm("Are you sure you want to delete this sub zone?")) {
      return;
    }

    try {
      const response = await subZonesService.deleteSubZone(subZoneId);
      console.log("Delete sub zone response:", response);
      
      if (response.success || response.message) {
        // Refresh sub zones list
        if (selectedZoneForSubZone) {
          await fetchSubZones(selectedZoneForSubZone);
        }
        
        setError("Sub zone deleted successfully!");
        setIsModalOpen(true);
      } else {
        setError(response.message || "Failed to delete sub zone");
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error deleting sub zone:", error);
      setError(error.message || "Failed to delete sub zone");
      setIsModalOpen(true);
    }
  };

  const handleEditSubZone = (subZone) => {
    setEditingSubZone(subZone);
    setSelectedZoneForSubZone(subZone.zoneId);
    setNewSubZone({
      name: subZone.name || "",
      subZoneHeadId: subZone.subZoneHeadId || "",
      plot: subZone.plot || "",
      street1: subZone.street1 || "",
      street2: subZone.street2 || "",
      areaLocality: subZone.areaLocality || "",
      cityVillage: subZone.cityVillage || "",
      pincode: subZone.pincode || "",
      district: subZone.district || "",
      state: subZone.state || "",
      country: subZone.country || "India",
      stateCode: subZone.stateCode || "",
      countryCode: subZone.countryCode || "IN",
    });
    setShowSubZoneForm(true);
  };

  const handleCancelSubZoneForm = () => {
    setShowSubZoneForm(false);
    setEditingSubZone(null);
    setSelectedZoneForSubZone("");
    setNewSubZone({
      name: "",
      subZoneHeadId: "",
      plot: "",
      street1: "",
      street2: "",
      areaLocality: "",
      cityVillage: "",
      pincode: "",
      district: "",
      state: "",
      country: "India",
      stateCode: "",
      countryCode: "IN",
    });
  };

  const assignStoreStaff = async (storeId, staffManagerId, employeeIds = []) => {
    if (!storeId || (!staffManagerId && (!employeeIds || employeeIds.length === 0))) {
      return [];
    }

    const parsedStoreId = parseInt(storeId);
    const errors = [];

    // Helper to check if error is "already assigned" (not a real error)
    const isAlreadyAssignedError = (errorMessage) => {
      if (!errorMessage) return false;
      const message = errorMessage.toLowerCase();
      return (
        message.includes("already assigned") ||
        message.includes("already exists") ||
        message.includes("is already") ||
        message.includes("duplicate")
      );
    };

    if (staffManagerId) {
      try {
        await axiosAPI.post("/store-employees/assign-manager", {
          storeId: parsedStoreId,
          staffManagerId: parseInt(staffManagerId),
        });
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to assign manager";
        // Only treat as error if it's not an "already assigned" case
        if (!isAlreadyAssignedError(errorMessage)) {
          console.error("Error assigning store manager:", error);
          errors.push(`Manager assignment failed: ${errorMessage}`);
        } else {
          // Already assigned is not an error, just log for debugging
          console.log(`Manager ${staffManagerId} already assigned to store ${parsedStoreId}, skipping`);
        }
      }
    }

    const uniqueEmployeeIds = Array.from(new Set((employeeIds || []).filter(Boolean)));
    for (const employeeId of uniqueEmployeeIds) {
      try {
        await axiosAPI.post("/store-employees/assign-employee", {
          storeId: parsedStoreId,
          employeeId: parseInt(employeeId),
        });
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          `Failed to assign employee ${employeeId}`;
        // Only treat as error if it's not an "already assigned" case
        if (!isAlreadyAssignedError(errorMessage)) {
          console.error(`Error assigning employee ${employeeId}:`, error);
          errors.push(`Employee ${employeeId} assignment failed: ${errorMessage}`);
        } else {
          // Already assigned is not an error, just log for debugging
          console.log(`Employee ${employeeId} already assigned to store ${parsedStoreId}, skipping`);
        }
      }
    }

    return errors;
  };

  // Stores functions
  const fetchStores = async (page = 1, limit = 10, search = "", storeType = "") => {
    try {
      setStoresLoading(true);
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search) params.append('search', search);
      if (storeType) params.append('storeType', storeType);
      
      const response = await axiosAPI.get(`/stores?${params.toString()}`);
      console.log("Stores response:", response);
      
      // Handle different possible response structures
      const responseData = response.data || {};
      let storesData = responseData.data || responseData.stores || responseData || [];
      
      // Ensure storesData is an array
      if (!Array.isArray(storesData)) {
        storesData = [];
      }
      
      // Fetch full details for stores that don't have manager/employees data
      // This ensures we always have the complete information
      const storesWithDetails = await Promise.all(
        storesData.map(async (store) => {
          // Check if store has manager object (not just ID) and employees array
          const hasManagerObject = store.staffManager || store.manager || store.storeManager;
          const hasEmployeesArray = store.employees && Array.isArray(store.employees) && store.employees.length > 0;
          const hasManagerId = store.staffManagerId;
          
          // If we have manager object AND employees array, return as is
          // Otherwise, fetch details (especially if we have managerId but no manager object)
          if (hasManagerObject && hasEmployeesArray) {
            return store;
          }
          
          // Fetch full details to get manager and employees
          try {
            const detailResponse = await axiosAPI.get(`/stores/${store.id}`);
            const detailData = detailResponse.data?.data || detailResponse.data || store;
            console.log(`Fetched details for store ${store.id}:`, {
              staffManagerId: detailData.staffManagerId,
              staffManager: detailData.staffManager,
              manager: detailData.manager,
              employees: detailData.employees?.length || 0
            });
            
            // If we have staffManagerId but no manager object, try to fetch store staff
            let managerData =
              detailData.staffManager ||
              detailData.manager ||
              detailData.storeManager ||
              store.staffManager ||
              store.manager ||
              store.storeManager;
            if (detailData.staffManagerId && !managerData) {
              try {
                const staffResponse = await axiosAPI.get(`/store-employees/store/${store.id}`);
                const staffData = staffResponse.data?.data || staffResponse.data || {};
                if (staffData.manager || staffData.staffManager) {
                  managerData = staffData.manager || staffData.staffManager;
                }
              } catch (staffError) {
                console.log(`Could not fetch staff for store ${store.id}:`, staffError);
              }
            }
            
            // Merge the detail data with the original store data
            return {
              ...store,
              ...detailData,
              staffManager: managerData,
              staffManagerId:
                detailData.staffManagerId ||
                detailData.storeManagerId ||
                managerData?.id ||
                store.staffManagerId,
              employees: detailData.employees || store.employees || [],
              employeeIds: detailData.employeeIds || store.employeeIds || [],
              division: detailData.division || store.division,
              zone: detailData.zone || store.zone
            };
          } catch (error) {
            console.error(`Error fetching details for store ${store.id}:`, error);
            return store;
          }
        })
      );
      
      const pagination = responseData.pagination || { 
        page, 
        limit, 
        total: storesWithDetails.length, 
        totalPages: 1 
      };
      
      console.log("Stores with details:", storesWithDetails);
      setStores(storesWithDetails);
      setStoresPagination(pagination);
    } catch (error) {
      console.error("Error fetching stores:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch stores";
      setError(errorMessage);
      setIsModalOpen(true);
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    
    if (!newStore.name || !newStore.divisionId || !newStore.zoneId) {
      setError("Please fill in store name, division, and zone");
      setIsModalOpen(true);
      return;
    }

    try {
      setCreating(true);
      console.log("Creating store:", newStore);
      
      const storeData = {
        name: newStore.name,
        street1: newStore.street1 || "",
        street2: newStore.street2 || "",
        area: newStore.area || "",
        district: newStore.district || "",
        state: newStore.state || "",
        divisionId: parseInt(newStore.divisionId),
        zoneId: newStore.zoneId ? parseInt(newStore.zoneId) : undefined,
        storeType: newStore.storeType || "own",
        staffManagerId: newStore.staffManagerId ? parseInt(newStore.staffManagerId) : undefined,
        employeeIds: newStore.employeeIds && newStore.employeeIds.length > 0 
          ? newStore.employeeIds.map(id => parseInt(id)) 
          : undefined
      };
      
      const response = await axiosAPI.post("/stores", storeData);
      console.log("Create store response:", response);
      
      if (response.status === 201 || response.status === 200 || response.data?.success || response.data?.data || response.data?.id) {
        // Get the created store ID
        const createdStoreId = response.data?.data?.id || response.data?.id || response.data?.data?.store?.id;
        
        // Assign staff first
        const assignmentErrors = await assignStoreStaff(
          createdStoreId,
          newStore.staffManagerId,
          newStore.employeeIds
        );

        // Small delay to ensure backend has processed the assignment
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch full store details AFTER assignment to get updated manager and employees
        if (createdStoreId) {
          try {
            const detailResponse = await axiosAPI.get(`/stores/${createdStoreId}`);
            let fullStoreData = detailResponse.data?.data || detailResponse.data;
            console.log("Fetched store details after assignment:", fullStoreData);
            
            // If we have staffManagerId but no manager object, fetch from store-employees endpoint
            if (fullStoreData?.staffManagerId && !fullStoreData?.staffManager && !fullStoreData?.manager) {
              try {
                const staffResponse = await axiosAPI.get(`/store-employees/store/${createdStoreId}`);
                const staffData = staffResponse.data?.data || staffResponse.data || {};
                console.log("Fetched store staff data:", staffData);
                if (staffData.manager || staffData.staffManager) {
                  fullStoreData = {
                    ...fullStoreData,
                    staffManager: staffData.manager || staffData.staffManager,
                    employees: staffData.employees || fullStoreData.employees || []
                  };
                }
              } catch (staffError) {
                console.error("Error fetching store staff:", staffError);
              }
            }
            
            // Update the store in the list with full details including manager/employees
            if (fullStoreData) {
              setStores(prevStores => {
                const existingIndex = prevStores.findIndex(s => s.id === createdStoreId);
                if (existingIndex >= 0) {
                  // Update existing store
                  const updated = [...prevStores];
                  updated[existingIndex] = fullStoreData;
                  return updated;
                } else {
                  // Add new store
                  return [fullStoreData, ...prevStores];
                }
              });
            }
          } catch (error) {
            console.error("Error fetching created store details:", error);
          }
        }

        // Reset form
        const currentDivisionId = localStorage.getItem('currentDivisionId');
        setNewStore({
          name: "",
          street1: "",
          street2: "",
          area: "",
          district: "",
          state: "",
          divisionId: currentDivisionId && currentDivisionId !== '1' && currentDivisionId !== 'all' ? currentDivisionId : "",
          zoneId: "",
          storeType: "own",
          staffManagerId: "",
          employeeIds: []
        });
        setShowStoreForm(false);
        setEditingStore(null);

        const feedbackMessage =
          assignmentErrors.length > 0
            ? `Store created successfully but some staff assignments failed: ${assignmentErrors.join(", ")}`
            : "Store created successfully!";
        setError(feedbackMessage);
        setIsModalOpen(true);
        
        // Force a full refresh of the stores list to ensure all data is up to date
        // This ensures manager/employee data is properly loaded
        await fetchStores(1, storesPagination.limit);
      }
    } catch (error) {
      console.error("Error creating store:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create store";
      setError(errorMessage);
      setIsModalOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStore = async (e) => {
    e.preventDefault();
    
    if (!newStore.name || !newStore.divisionId || !newStore.zoneId) {
      setError("Please fill in store name, division, and zone");
      setIsModalOpen(true);
      return;
    }

    try {
      setCreating(true);
      console.log("Updating store:", editingStore.id, newStore);
      
      const storeData = {
        name: newStore.name,
        street1: newStore.street1 || "",
        street2: newStore.street2 || "",
        area: newStore.area || "",
        district: newStore.district || "",
        state: newStore.state || "",
        divisionId: parseInt(newStore.divisionId),
        zoneId: newStore.zoneId ? parseInt(newStore.zoneId) : undefined,
        storeType: newStore.storeType || "own",
        staffManagerId: newStore.staffManagerId ? parseInt(newStore.staffManagerId) : undefined,
        employeeIds: newStore.employeeIds && newStore.employeeIds.length > 0 
          ? newStore.employeeIds.map(id => parseInt(id)) 
          : undefined
      };
      
      const response = await axiosAPI.put(`/stores/${editingStore.id}`, storeData);
      console.log("Update store response:", response);
      
      if (response.status === 200 || response.data?.success || response.data?.data || response.data?.id) {
        const assignmentErrors = await assignStoreStaff(
          editingStore.id,
          newStore.staffManagerId,
          newStore.employeeIds
        );
        
        // Small delay to ensure backend has processed the assignment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch full store details including manager and employees after update
        try {
          const detailResponse = await axiosAPI.get(`/stores/${editingStore.id}`);
          let fullStoreData = detailResponse.data?.data || detailResponse.data;
          console.log("Fetched store details after update:", fullStoreData);
          
          // If we have staffManagerId but no manager object, fetch from store-employees endpoint
          if (fullStoreData?.staffManagerId && !fullStoreData?.staffManager && !fullStoreData?.manager) {
            try {
              const staffResponse = await axiosAPI.get(`/store-employees/store/${editingStore.id}`);
              const staffData = staffResponse.data?.data || staffResponse.data || {};
              console.log("Fetched store staff data after update:", staffData);
              if (staffData.manager || staffData.staffManager) {
                fullStoreData = {
                  ...fullStoreData,
                  staffManager: staffData.manager || staffData.staffManager,
                  employees: staffData.employees || fullStoreData.employees || []
                };
              }
            } catch (staffError) {
              console.error("Error fetching store staff:", staffError);
            }
          }
          
          // Update the store in the list with full details
          if (fullStoreData) {
            setStores(prevStores => 
              prevStores.map(store => 
                store.id === editingStore.id ? fullStoreData : store
              )
            );
          }
        } catch (error) {
          console.error("Error fetching updated store details:", error);
          // Still refresh the list even if detail fetch fails
          await fetchStores(storesPagination.page, storesPagination.limit);
        }
        
        setShowStoreForm(false);
        setEditingStore(null);
        const feedbackMessage =
          assignmentErrors.length > 0
            ? `Store updated but some staff assignments failed: ${assignmentErrors.join(", ")}`
            : "Store updated successfully!";
        setError(feedbackMessage);
        setIsModalOpen(true);
        
        // Force a full refresh of the stores list to ensure all data is up to date
        // This ensures manager/employee data is properly loaded
        await fetchStores(storesPagination.page, storesPagination.limit);
      }
    } catch (error) {
      console.error("Error updating store:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update store";
      setError(errorMessage);
      setIsModalOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (!window.confirm("Are you sure you want to delete this store?")) {
      return;
    }

    try {
      const response = await axiosAPI.delete(`/stores/${storeId}`);
      if (response.status === 200 || response.data?.success || response.data?.message) {
        setError("Store deleted successfully!");
        setIsModalOpen(true);
        fetchStores(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting store:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete store";
      setError(errorMessage);
      setIsModalOpen(true);
    }
  };

  const handleEditStore = async (store) => {
    ensureStoreDropdowns();
    setEditingStore(store);
    
    let storeDetails = store;
    try {
      const response = await axiosAPI.get(`/stores/${store.id}`);
      const data = response.data?.data || response.data || store;
      if (data) {
        storeDetails = data;
      }
    } catch (error) {
      console.error("Error fetching store details:", error);
    }

    const employeeIds = storeDetails.employees 
      ? storeDetails.employees.map(emp => emp.id || emp.employeeId).filter(Boolean)
      : storeDetails.employeeIds || store.employeeIds || [];

    const staffManagerId =
      storeDetails.staffManagerId ||
      storeDetails.staffManager?.id ||
      storeDetails.managerId ||
      storeDetails.manager?.id ||
      store.staffManagerId ||
      "";
    
    setNewStore({
      name: storeDetails.name || store.name || "",
      street1: storeDetails.street1 || store.street1 || "",
      street2: storeDetails.street2 || store.street2 || "",
      area: storeDetails.area || store.area || "",
      district: storeDetails.district || store.district || "",
      state: storeDetails.state || store.state || "",
      divisionId: storeDetails.divisionId || storeDetails.division?.id || store.divisionId || store.division?.id || "",
      zoneId: storeDetails.zoneId || storeDetails.zone?.id || store.zoneId || store.zone?.id || "",
      storeType: storeDetails.storeType || store.storeType || "own",
      staffManagerId: staffManagerId ? String(staffManagerId) : "",
      employeeIds: Array.isArray(employeeIds) ? employeeIds.map(String) : []
    });
    setShowStoreForm(true);
  };

  const handleCancelStoreForm = () => {
    setShowStoreForm(false);
    setEditingStore(null);
    const currentDivisionId = localStorage.getItem('currentDivisionId');
    setNewStore({
      name: "",
      street1: "",
      street2: "",
      area: "",
      district: "",
      state: "",
      divisionId: currentDivisionId && currentDivisionId !== '1' && currentDivisionId !== 'all' ? currentDivisionId : "",
      zoneId: "",
      storeType: "own",
      staffManagerId: "",
      employeeIds: []
    });
  };

  const handleAddEmployee = (employeeId) => {
    if (!employeeId) return;
    setNewStore((prev) => {
      if (prev.employeeIds.includes(employeeId)) {
        return prev;
      }
      return {
        ...prev,
        employeeIds: [...prev.employeeIds, employeeId]
      };
    });
  };

  const handleRemoveEmployee = (employeeId) => {
    setNewStore((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.filter(id => id !== employeeId)
    }));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Loading />
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Division & Zone Management</h1>
          <div className={styles.headerActions}>
            <button
              className="homebtn"
              onClick={activeTab === "divisions" ? refreshStatistics : activeTab === "zones" ? fetchZones : activeTab === "stores" ? () => fetchStores() : () => selectedZoneForSubZone && fetchSubZones(selectedZoneForSubZone)}
              disabled={loading || zonesLoading || subZonesLoading || storesLoading}
            >
              {loading || zonesLoading || subZonesLoading || storesLoading ? "Refreshing..." : "Refresh"}
            </button>
            {activeTab === "divisions" && (
          <button
                className="homebtn"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Cancel" : "Create New Division"}
          </button>
            )}
            {activeTab === "zones" && (
              <button
                className="homebtn"
                onClick={() => setShowZoneForm(!showZoneForm)}
              >
                {showZoneForm ? "Cancel" : "Create New Zone"}
              </button>
            )}
            {activeTab === "subzones" && (
              <button
                className="homebtn"
                onClick={() => setShowSubZoneForm(!showSubZoneForm)}
              >
                {showSubZoneForm ? "Cancel" : "Create New Sub Zone"}
              </button>
            )}
            {activeTab === "stores" && (
              <button
                className="homebtn"
                onClick={() => {
                  if (!showStoreForm) {
                    ensureStoreDropdowns();
                    // When opening the form, pre-populate division if in a specific division context
                    const currentDivisionId = localStorage.getItem('currentDivisionId');
                    if (currentDivisionId && currentDivisionId !== '1' && currentDivisionId !== 'all') {
                      setNewStore(prev => ({
                        ...prev,
                        divisionId: currentDivisionId,
                        employeeIds: prev.employeeIds || []
                      }));
                      // Fetch zones for the selected division
                      fetchZones();
                    }
                  }
                  setShowStoreForm(!showStoreForm);
                }}
              >
                {showStoreForm ? "Cancel" : "Create New Store"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabButton} ${activeTab === "divisions" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("divisions")}
          >
            Divisions
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "zones" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("zones");
              if (zones.length === 0) {
                fetchZones();
              }
            }}
          >
            Zones
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "subzones" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("subzones");
              if (zones.length === 0) {
                fetchZones();
              }
            }}
          >
            Sub Zones
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "stores" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("stores");
              if (stores.length === 0) {
                fetchStores();
              }
              if (zones.length === 0) {
                fetchZones();
              }
            }}
          >
            Stores
          </button>
        </div>

        {/* Divisions Tab Content */}
        {activeTab === "divisions" && (
          <>
        {showCreateForm && (
          <div className={styles.createForm}>
            <h3>Create New Division</h3>
            <form onSubmit={handleCreateDivision}>
              
              {/* Basic Information Section */}
              <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Basic Information</h4>
                <div className={styles.formRow}>
              <div className={styles.formGroup}>
                    <label htmlFor="name">Division Name *</label>
                <input
                  type="text"
                  id="name"
                  value={newDivision.name}
                  onChange={(e) =>
                    setNewDivision({ ...newDivision, name: e.target.value })
                  }
                  placeholder="Enter division name"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                    <label htmlFor="state">State *</label>
                <input
                  type="text"
                  id="state"
                  value={newDivision.state}
                  onChange={(e) =>
                    setNewDivision({ ...newDivision, state: e.target.value })
                  }
                      placeholder="Enter state name"
                      required
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="stateCode">State Code</label>
                    <input
                      type="text"
                      id="stateCode"
                      value={newDivision.stateCode}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, stateCode: e.target.value })
                      }
                      placeholder="e.g., MH, KA, TN"
                      maxLength="2"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="country">Country</label>
                    <input
                      type="text"
                      id="country"
                      value="India"
                      readOnly
                      className={styles.readOnlyField}
                    />
                  </div>
                </div>
              </div>

              {/* Address Details Section */}
              <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Address Details</h4>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="plot">Plot Number *</label>
                    <input
                      type="text"
                      id="plot"
                      value={newDivision.plot}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, plot: e.target.value })
                      }
                      placeholder="Plot No. 123"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="street1">Street 1 *</label>
                    <input
                      type="text"
                      id="street1"
                      value={newDivision.street1}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, street1: e.target.value })
                      }
                      placeholder="Main Street"
                      required
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="street2">Street 2</label>
                    <input
                      type="text"
                      id="street2"
                      value={newDivision.street2}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, street2: e.target.value })
                      }
                      placeholder="Near Market (optional)"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="areaLocality">Area/Locality *</label>
                    <input
                      type="text"
                      id="areaLocality"
                      value={newDivision.areaLocality}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, areaLocality: e.target.value })
                      }
                      placeholder="Commercial Area"
                      required
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="cityVillage">City/Village *</label>
                    <input
                      type="text"
                      id="cityVillage"
                      value={newDivision.cityVillage}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, cityVillage: e.target.value })
                      }
                      placeholder="City Name"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="district">District *</label>
                    <input
                      type="text"
                      id="district"
                      value={newDivision.district}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, district: e.target.value })
                      }
                      placeholder="District Name"
                      required
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="pincode">Pincode *</label>
                    <input
                      type="text"
                      id="pincode"
                      value={newDivision.pincode}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, pincode: e.target.value })
                      }
                      placeholder="560001"
                      pattern="[0-9]{6}"
                      maxLength="6"
                  required
                />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="countryCode">Country Code</label>
                    <input
                      type="text"
                      id="countryCode"
                      value="IN"
                      readOnly
                      className={styles.readOnlyField}
                    />
                  </div>
                </div>
              </div>

              {/* Company Details Section */}
              <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Company Details</h4>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="gstinNumber">GSTIN Number</label>
                    <input
                      type="text"
                      id="gstinNumber"
                      value={newDivision.gstinNumber}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, gstinNumber: e.target.value })
                      }
                      placeholder="eg: 29ABCDE1234F1Z5"
                      pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                      maxLength="15"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="cinNumber">CIN Number</label>
                    <input
                      type="text"
                      id="cinNumber"
                      value={newDivision.cinNumber}
                      onChange={(e) =>
                        setNewDivision({ ...newDivision, cinNumber: e.target.value })
                      }
                      placeholder="eg: U12345KA2020PTC123456"
                      maxLength="21"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className="homebtn"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Division"}
                </button>
                <button
                  type="button"
                  className="homebtn"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={styles.divisionsList}>
          <h3>Existing Divisions</h3>
          {divisions.length === 0 ? (
            <p className={styles.noDivisions}>No divisions found.</p>
          ) : (
            <div className={styles.divisionsGrid}>
              {divisions.map((division) => (
                <div key={division.id} className={styles.divisionCard}>
                  <div className={styles.divisionInfo}>
                    <h4>{division.name}</h4>
                    <p>{division.state}</p>
                    <div className={styles.stats}>
                      <p><strong>Employees:</strong> {getUserCount(division)}</p>
                      <p><strong>Customers:</strong> {getCustomerCount(division)}</p>
                      <p><strong>Products:</strong> {getProductCount(division)}</p>
                      <p><strong>Warehouses:</strong> {getWarehouseCount(division)}</p>
                      <p><strong>Sales Orders:</strong> {getSalesOrderCount(division)}</p>
                      <p><strong>Purchase Orders:</strong> {getPurchaseOrderCount(division)}</p>
                    </div>
                  </div>
                  <div className={styles.divisionActions}>
                    <button
                          className="homebtn"
                      onClick={() => handleDeleteDivision(division.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {/* Zones Tab Content */}
        {activeTab === "zones" && (
          <>
            {showZoneForm && (
              <div className={styles.createForm}>
                <h3>{editingZone ? "Edit Zone" : "Create New Zone"}</h3>
                <form onSubmit={editingZone ? handleUpdateZone : handleCreateZone}>
                  
                  {/* Basic Information Section */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>Basic Information</h4>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneName">Zone Name *</label>
                        <input
                          type="text"
                          id="zoneName"
                          value={newZone.name}
                          onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                          placeholder="Enter zone name"
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneDivision">Division *</label>
                        <select
                          id="zoneDivision"
                          value={newZone.divisionId}
                          onChange={(e) => setNewZone({ ...newZone, divisionId: e.target.value })}
                          required
                        >
                          <option value="">Select division</option>
                          {divisions.map(division => (
                            <option key={division.id} value={division.id}>{division.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneHead">Zone Head</label>
                        <select
                          id="zoneHead"
                          value={newZone.zoneHeadId}
                          onChange={(e) => setNewZone({ ...newZone, zoneHeadId: e.target.value })}
                        >
                          <option value="">Select head (optional)</option>
                          {employees.map(employee => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name || employee.employeeName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address Details Section */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>Address Details</h4>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zonePlot">Plot Number</label>
                        <input
                          type="text"
                          id="zonePlot"
                          value={newZone.plot}
                          onChange={(e) => setNewZone({ ...newZone, plot: e.target.value })}
                          placeholder="Plot No. 45"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneStreet1">Street 1</label>
                        <input
                          type="text"
                          id="zoneStreet1"
                          value={newZone.street1}
                          onChange={(e) => setNewZone({ ...newZone, street1: e.target.value })}
                          placeholder="Zone Main Road"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneStreet2">Street 2</label>
                        <input
                          type="text"
                          id="zoneStreet2"
                          value={newZone.street2}
                          onChange={(e) => setNewZone({ ...newZone, street2: e.target.value })}
                          placeholder="Near Zone Center"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneArea">Area/Locality</label>
                        <input
                          type="text"
                          id="zoneArea"
                          value={newZone.areaLocality}
                          onChange={(e) => setNewZone({ ...newZone, areaLocality: e.target.value })}
                          placeholder="Zone Area"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneCity">City/Village</label>
                        <input
                          type="text"
                          id="zoneCity"
                          value={newZone.cityVillage}
                          onChange={(e) => setNewZone({ ...newZone, cityVillage: e.target.value })}
                          placeholder="Mumbai"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneDistrict">District</label>
                        <input
                          type="text"
                          id="zoneDistrict"
                          value={newZone.district}
                          onChange={(e) => setNewZone({ ...newZone, district: e.target.value })}
                          placeholder="Mumbai"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zonePincode">Pincode</label>
                        <input
                          type="text"
                          id="zonePincode"
                          value={newZone.pincode}
                          onChange={(e) => setNewZone({ ...newZone, pincode: e.target.value })}
                          placeholder="400001"
                          maxLength="6"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneState">State</label>
                        <input
                          type="text"
                          id="zoneState"
                          value={newZone.state}
                          onChange={(e) => setNewZone({ ...newZone, state: e.target.value })}
                          placeholder="Maharashtra"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneCountry">Country</label>
                        <input
                          type="text"
                          id="zoneCountry"
                          value={newZone.country}
                          onChange={(e) => setNewZone({ ...newZone, country: e.target.value })}
                          placeholder="India"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneStateCode">State Code</label>
                        <input
                          type="text"
                          id="zoneStateCode"
                          value={newZone.stateCode}
                          onChange={(e) => setNewZone({ ...newZone, stateCode: e.target.value })}
                          placeholder="MH"
                          maxLength="2"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="zoneCountryCode">Country Code</label>
                        <input
                          type="text"
                          id="zoneCountryCode"
                          value={newZone.countryCode}
                          onChange={(e) => setNewZone({ ...newZone, countryCode: e.target.value })}
                          placeholder="IN"
                          maxLength="2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className="homebtn"
                      disabled={creating}
                    >
                      {creating ? "Saving..." : (editingZone ? "Update Zone" : "Create Zone")}
                    </button>
                    <button
                      type="button"
                      className="homebtn"
                      onClick={handleCancelZoneForm}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className={styles.divisionsList}>
              <h3>Existing Zones</h3>
              {zonesLoading ? (
                <p>Loading zones...</p>
              ) : zones.length === 0 ? (
                <p className={styles.noDivisions}>No zones found.</p>
              ) : (
                <div className={styles.divisionsGrid}>
                  {zones.map((zone) => (
                    <div key={zone.id} className={styles.divisionCard}>
                      <div className={styles.divisionInfo}>
                        <h4>{zone.name}</h4>
                        <p><strong>Division:</strong> {zone.division?.name || zone.divisionId}</p>
                        <p><strong>Head:</strong> {zone.zoneHead?.name || zone.zoneHeadId || 'Not assigned'}</p>
                        <p><strong>City:</strong> {zone.cityVillage || 'Not specified'}</p>
                        <p><strong>Pincode:</strong> {zone.pincode || 'Not specified'}</p>
                        {zone.plot && <p><strong>Address:</strong> {zone.plot}, {zone.street1}</p>}
                      </div>
                      <div className={styles.divisionActions}>
                        <button
                          className="homebtn"
                          onClick={() => handleEditZone(zone)}
                        >
                          Edit
                        </button>
                        <button
                          className="homebtn"
                          onClick={() => handleDeleteZone(zone.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Sub Zones Tab Content */}
        {activeTab === "subzones" && (
          <>
            {showSubZoneForm && (
              <div className={styles.createForm}>
                <h3>{editingSubZone ? "Edit Sub Zone" : "Create New Sub Zone"}</h3>
                <form onSubmit={editingSubZone ? handleUpdateSubZone : handleCreateSubZone}>
                  
                  {/* Basic Information Section */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>Basic Information</h4>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneName">Sub Zone Name *</label>
                        <input
                          type="text"
                          id="subZoneName"
                          value={newSubZone.name}
                          onChange={(e) => setNewSubZone({ ...newSubZone, name: e.target.value })}
                          required
                          placeholder="Enter sub zone name"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneZone">Zone *</label>
                        <select
                          id="subZoneZone"
                          value={selectedZoneForSubZone}
                          onChange={(e) => setSelectedZoneForSubZone(e.target.value)}
                          required
                        >
                          <option value="">Select Zone</option>
                          {zones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name} ({zone.division?.name || zone.divisionName})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneHead">Sub Zone Head</label>
                        <select
                          id="subZoneHead"
                          value={newSubZone.subZoneHeadId}
                          onChange={(e) => setNewSubZone({ ...newSubZone, subZoneHeadId: e.target.value })}
                        >
                          <option value="">Select Sub Zone Head</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address Details Section */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>Address Details</h4>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZonePlot">Plot</label>
                        <input
                          type="text"
                          id="subZonePlot"
                          value={newSubZone.plot}
                          onChange={(e) => setNewSubZone({ ...newSubZone, plot: e.target.value })}
                          placeholder="Enter plot number"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneStreet1">Street 1</label>
                        <input
                          type="text"
                          id="subZoneStreet1"
                          value={newSubZone.street1}
                          onChange={(e) => setNewSubZone({ ...newSubZone, street1: e.target.value })}
                          placeholder="Enter street address"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneStreet2">Street 2</label>
                        <input
                          type="text"
                          id="subZoneStreet2"
                          value={newSubZone.street2}
                          onChange={(e) => setNewSubZone({ ...newSubZone, street2: e.target.value })}
                          placeholder="Enter additional address"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneArea">Area/Locality</label>
                        <input
                          type="text"
                          id="subZoneArea"
                          value={newSubZone.areaLocality}
                          onChange={(e) => setNewSubZone({ ...newSubZone, areaLocality: e.target.value })}
                          placeholder="Enter area or locality"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneCity">City/Village</label>
                        <input
                          type="text"
                          id="subZoneCity"
                          value={newSubZone.cityVillage}
                          onChange={(e) => setNewSubZone({ ...newSubZone, cityVillage: e.target.value })}
                          placeholder="Enter city or village"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZonePincode">Pincode</label>
                        <input
                          type="text"
                          id="subZonePincode"
                          value={newSubZone.pincode}
                          onChange={(e) => setNewSubZone({ ...newSubZone, pincode: e.target.value })}
                          placeholder="Enter pincode"
                          pattern="[0-9]{6}"
                          title="Pincode must be 6 digits"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneDistrict">District</label>
                        <input
                          type="text"
                          id="subZoneDistrict"
                          value={newSubZone.district}
                          onChange={(e) => setNewSubZone({ ...newSubZone, district: e.target.value })}
                          placeholder="Enter district"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneState">State</label>
                        <input
                          type="text"
                          id="subZoneState"
                          value={newSubZone.state}
                          onChange={(e) => setNewSubZone({ ...newSubZone, state: e.target.value })}
                          placeholder="Enter state"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneCountry">Country</label>
                        <input
                          type="text"
                          id="subZoneCountry"
                          value={newSubZone.country}
                          onChange={(e) => setNewSubZone({ ...newSubZone, country: e.target.value })}
                          placeholder="Enter country"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneStateCode">State Code</label>
                        <input
                          type="text"
                          id="subZoneStateCode"
                          value={newSubZone.stateCode}
                          onChange={(e) => setNewSubZone({ ...newSubZone, stateCode: e.target.value })}
                          placeholder="Enter state code"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="subZoneCountryCode">Country Code</label>
                        <input
                          type="text"
                          id="subZoneCountryCode"
                          value={newSubZone.countryCode}
                          onChange={(e) => setNewSubZone({ ...newSubZone, countryCode: e.target.value })}
                          placeholder="Enter country code"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className="homebtn"
                      disabled={creating}
                    >
                      {creating ? "Saving..." : (editingSubZone ? "Update Sub Zone" : "Create Sub Zone")}
                    </button>
                    <button
                      type="button"
                      className="homebtn"
                      onClick={handleCancelSubZoneForm}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Zone Selector for Sub Zones */}
            <div className={styles.zoneSelector}>
              <label htmlFor="subZoneZoneSelector">Select Zone to View Sub Zones:</label>
              <select
                id="subZoneZoneSelector"
                value={selectedZoneForSubZone}
                onChange={(e) => {
                  setSelectedZoneForSubZone(e.target.value);
                  if (e.target.value) {
                    fetchSubZones(e.target.value);
                  } else {
                    setSubZones([]);
                  }
                }}
              >
                <option value="">Select a Zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} ({zone.division?.name || zone.divisionName})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.divisionsList}>
              {subZonesLoading ? (
                <div className={styles.loadingContainer}>
                  <Loading />
                </div>
              ) : !selectedZoneForSubZone ? (
                <div className={styles.noData}>
                  <p>Please select a zone to view its sub zones.</p>
                </div>
              ) : subZones.length === 0 ? (
                <div className={styles.noData}>
                  <p>No sub zones found for the selected zone. Create a new sub zone to get started.</p>
                </div>
              ) : (
                <div className={styles.divisionsGrid}>
                  {subZones.map((subZone) => (
                    <div key={subZone.id} className={styles.divisionCard}>
                      <div className={styles.divisionInfo}>
                        <h3>{subZone.name}</h3>
                        <div className={styles.divisionDetails}>
                          <p><strong>Zone:</strong> {subZone.zone?.name || 'Unknown'}</p>
                          <p><strong>Division:</strong> {subZone.divisionName || subZone.zone?.division?.name || 'Unknown'}</p>
                          <p><strong>Head:</strong> {subZone.subZoneHead?.name || subZone.subZoneHeadId || 'Not assigned'}</p>
                          <p><strong>City:</strong> {subZone.cityVillage || 'Not specified'}</p>
                          <p><strong>Pincode:</strong> {subZone.pincode || 'Not specified'}</p>
                          {subZone.plot && <p><strong>Address:</strong> {subZone.plot}, {subZone.street1}</p>}
                        </div>
                      </div>
                      <div className={styles.divisionActions}>
                        <button
                          className="homebtn"
                          onClick={() => handleEditSubZone(subZone)}
                        >
                          Edit
                        </button>
                        <button
                          className="homebtn"
                          onClick={() => handleDeleteSubZone(subZone.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Stores Tab Content */}
        {activeTab === "stores" && (
          <>
            {showStoreForm && (() => {
              const currentDivisionId = localStorage.getItem('currentDivisionId');
              const isDivisionLocked = currentDivisionId && currentDivisionId !== '1' && currentDivisionId !== 'all' && !editingStore;
              
              return (
              <div className={styles.createForm}>
                <h3>{editingStore ? "Edit Store" : "Create New Store"}</h3>
                <form onSubmit={editingStore ? handleUpdateStore : handleCreateStore}>
                  
                  {/* Basic Information Section */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>Basic Information</h4>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeName">Store Name *</label>
                        <input
                          type="text"
                          id="storeName"
                          value={newStore.name}
                          onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                          placeholder="Enter store name"
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeDivision">Division *</label>
                        <select
                          id="storeDivision"
                          value={newStore.divisionId}
                          onChange={(e) => {
                            setNewStore({ ...newStore, divisionId: e.target.value, zoneId: "" });
                            // Fetch zones for the selected division
                            if (e.target.value) {
                              fetchZones();
                            }
                          }}
                          required
                          disabled={isDivisionLocked}
                          className={isDivisionLocked ? styles.readOnlyField : ""}
                        >
                          <option value="">Select division</option>
                          {divisions.map(division => (
                            <option key={division.id} value={division.id}>{division.name}</option>
                          ))}
                        </select>
                        {isDivisionLocked && (
                          <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            Division is set based on your current context
                          </small>
                        )}
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeZone">Zone *</label>
                        <select
                          id="storeZone"
                          value={newStore.zoneId}
                          onChange={(e) => setNewStore({ ...newStore, zoneId: e.target.value })}
                          required
                          disabled={!newStore.divisionId}
                        >
                          <option value="">Select zone</option>
                          {zones
                            .filter(zone => {
                              if (!newStore.divisionId) return false;
                              return zone.divisionId === parseInt(newStore.divisionId) || 
                                     zone.division?.id === parseInt(newStore.divisionId);
                            })
                            .map(zone => (
                              <option key={zone.id} value={zone.id}>
                                {zone.name}
                              </option>
                            ))}
                        </select>
                        {newStore.divisionId && zones.filter(zone => 
                          zone.divisionId === parseInt(newStore.divisionId) || 
                          zone.division?.id === parseInt(newStore.divisionId)
                        ).length === 0 && (
                          <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            No zones available for this division. Please create a zone first.
                          </small>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeType">Store Type *</label>
                        <select
                          id="storeType"
                          value={newStore.storeType}
                          onChange={(e) => setNewStore({ ...newStore, storeType: e.target.value })}
                          required
                        >
                          <option value="own">Own</option>
                          <option value="franchise">Franchise</option>
                        </select>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeManager">Staff Manager</label>
                        {editingStore && newStore.staffManagerId && (
                          <small style={{ 
                            color: '#1976d2', 
                            fontSize: '12px', 
                            marginBottom: '4px', 
                            display: 'block',
                            fontWeight: '500'
                          }}>
                            Current Manager: {storeManagers.find(m => String(m.id) === String(newStore.staffManagerId))?.name || storeManagers.find(m => String(m.id) === String(newStore.staffManagerId))?.fullName || storeManagers.find(m => String(m.id) === String(newStore.staffManagerId))?.employeeName || 'Loading...'}
                          </small>
                        )}
                        <select
                          id="storeManager"
                          value={newStore.staffManagerId}
                          onChange={(e) => setNewStore({ ...newStore, staffManagerId: e.target.value })}
                          disabled={storeDropdownLoading}
                        >
                          <option value="">
                            {storeDropdownLoading ? "Loading..." : "Select manager (optional)"}
                          </option>
                          {storeManagers.map(manager => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name || manager.fullName || manager.employeeName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="storeEmployees">Employees (optional)</label>
                        {editingStore && newStore.employeeIds.length > 0 && (
                          <small style={{ 
                            color: '#1976d2', 
                            fontSize: '12px', 
                            marginBottom: '4px', 
                            display: 'block',
                            fontWeight: '500'
                          }}>
                            Currently assigned employees ({newStore.employeeIds.length}):
                          </small>
                        )}
                        <select
                          id="storeEmployees"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddEmployee(e.target.value);
                              e.target.value = ""; // Reset select
                            }
                          }}
                          disabled={storeDropdownLoading || !storeEmployees.length}
                        >
                          <option value="">
                            {storeDropdownLoading ? "Loading employees..." : "Select employee to add"}
                          </option>
                          {storeEmployees
                            .filter(employee => !newStore.employeeIds.includes(String(employee.id)))
                            .map(employee => (
                              <option key={employee.id} value={employee.id}>
                                {employee.name || employee.employeeName}
                              </option>
                            ))}
                        </select>
                        {newStore.employeeIds.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ 
                              display: 'flex', 
                              flexWrap: 'wrap', 
                              gap: '8px',
                              marginTop: '8px'
                            }}>
                              {newStore.employeeIds.map(empId => {
                                const employee =
                                  storeEmployees.find(emp => String(emp.id) === String(empId)) ||
                                  employees.find(emp => String(emp.id) === String(empId));
                                return employee ? (
                                  <span
                                    key={empId}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 12px',
                                      backgroundColor: '#e3f2fd',
                                      border: '1px solid #90caf9',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      color: '#1976d2'
                                    }}
                                  >
                                    {employee.name || employee.employeeName}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEmployee(empId)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#1976d2',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        padding: '0 4px',
                                        lineHeight: '1'
                                      }}
                                      title="Remove employee"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Details Section */}
                  <div className={styles.formSection}>
                    <h4 className={styles.sectionTitle}>Address Details</h4>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeStreet1">Street 1</label>
                        <input
                          type="text"
                          id="storeStreet1"
                          value={newStore.street1}
                          onChange={(e) => setNewStore({ ...newStore, street1: e.target.value })}
                          placeholder="Street 1"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeStreet2">Street 2</label>
                        <input
                          type="text"
                          id="storeStreet2"
                          value={newStore.street2}
                          onChange={(e) => setNewStore({ ...newStore, street2: e.target.value })}
                          placeholder="Street 2"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeArea">Area</label>
                        <input
                          type="text"
                          id="storeArea"
                          value={newStore.area}
                          onChange={(e) => setNewStore({ ...newStore, area: e.target.value })}
                          placeholder="Area"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeDistrict">District</label>
                        <input
                          type="text"
                          id="storeDistrict"
                          value={newStore.district}
                          onChange={(e) => setNewStore({ ...newStore, district: e.target.value })}
                          placeholder="District"
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="storeState">State</label>
                        <input
                          type="text"
                          id="storeState"
                          value={newStore.state}
                          onChange={(e) => setNewStore({ ...newStore, state: e.target.value })}
                          placeholder="State"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className="homebtn"
                      disabled={creating}
                    >
                      {creating ? "Saving..." : (editingStore ? "Update Store" : "Create Store")}
                    </button>
                    <button
                      type="button"
                      className="homebtn"
                      onClick={handleCancelStoreForm}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
              );
            })()}

            <div className={styles.divisionsList}>
              <h3>Existing Stores</h3>
              {storesLoading ? (
                <p>Loading stores...</p>
              ) : stores.length === 0 ? (
                <p className={styles.noDivisions}>No stores found.</p>
              ) : (
                <>
                  <div className={styles.divisionsGrid}>
                    {stores.map((store) => {
                      // Extract manager information - check multiple possible structures
                      const manager = store.staffManager || store.manager || store.storeManager;
                      let managerName = 'Not assigned';
                      if (manager) {
                        managerName = manager.name || manager.employeeName || manager.fullName || 'Unknown';
                      } else if (store.staffManagerId) {
                        // If we have manager ID but not the full object, try to find it in storeManagers
                        const managerObj = storeManagers.find(m => String(m.id) === String(store.staffManagerId));
                        managerName = managerObj ? (managerObj.name || managerObj.fullName || managerObj.employeeName || 'Unknown') : 'Loading...';
                      }
                      
                      // Extract employees information - check multiple possible structures
                      const storeEmployees = store.employees || [];
                      let employeeNames = 'No employees assigned';
                      if (storeEmployees.length > 0) {
                        employeeNames = storeEmployees
                          .map(emp => emp.name || emp.employeeName || emp.fullName || 'Unknown')
                          .join(', ');
                      } else if (store.employeeIds && store.employeeIds.length > 0) {
                        // If we have employee IDs but not the full objects, try to find them
                        const employeeList = store.employeeIds
                          .map(id => {
                            const emp = storeEmployees.find(e => String(e.id) === String(id)) ||
                                      employees.find(e => String(e.id) === String(id));
                            return emp ? (emp.name || emp.employeeName || emp.fullName || 'Unknown') : null;
                          })
                          .filter(Boolean);
                        employeeNames = employeeList.length > 0 
                          ? employeeList.join(', ') 
                          : `${store.employeeIds.length} employee(s) assigned`;
                      }
                      
                      return (
                        <div key={store.id} className={styles.divisionCard}>
                          <div className={styles.divisionInfo}>
                            <h4>{store.name}</h4>
                            <p><strong>Store Code:</strong> {store.storeCode || 'N/A'}</p>
                            <p><strong>Division:</strong> {store.division?.name || store.divisionId || 'Not assigned'}</p>
                            <p><strong>Zone:</strong> {store.zone?.name || store.zoneId || 'Not assigned'}</p>
                            <p><strong>Type:</strong> {store.storeType || 'N/A'}</p>
                            <p><strong>Manager:</strong> <span style={{ color: managerName === 'Not assigned' ? '#999' : '#333' }}>{managerName}</span></p>
                            <p><strong>Employees:</strong> <span style={{ color: employeeNames === 'No employees assigned' ? '#999' : '#333' }}>{employeeNames}</span></p>
                            <p><strong>District:</strong> {store.district || 'Not specified'}</p>
                            <p><strong>State:</strong> {store.state || 'Not specified'}</p>
                            <p><strong>Status:</strong> {store.isActive ? 'Active' : 'Inactive'}</p>
                            {store.createdByEmployee && (
                              <p><strong>Created By:</strong> {store.createdByEmployee.name || 'N/A'}</p>
                            )}
                          </div>
                          <div className={styles.divisionActions}>
                            <button
                              className="homebtn"
                              onClick={() => handleEditStore(store)}
                            >
                              Edit
                            </button>
                            <button
                              className="homebtn"
                              onClick={() => handleDeleteStore(store.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {storesPagination.totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className="homebtn"
                        onClick={() => fetchStores(storesPagination.page - 1, storesPagination.limit)}
                        disabled={storesPagination.page === 1}
                      >
                        Previous
                      </button>
                      <span>
                        Page {storesPagination.page} of {storesPagination.totalPages} (Total: {storesPagination.total})
                      </span>
                      <button
                        className="homebtn"
                        onClick={() => fetchStores(storesPagination.page + 1, storesPagination.limit)}
                        disabled={storesPagination.page >= storesPagination.totalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
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

export default DivisionManager; 