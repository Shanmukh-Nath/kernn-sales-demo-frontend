// src/utils/divisionUtils.js

/**
 * Division mapping for consistent ID handling across the application
 */
export const DIVISION_MAPPING = {
  "Maharastra": 2,
  "Telangana": 11,
  "Pune": 12,
  "All Divisions": "all"
};

/**
 * Get division ID from division name
 * @param {string} divisionName - The name of the division
 * @returns {string|number|null} - The division ID or null if not found
 */
export const getDivisionId = (divisionName) => {
  return DIVISION_MAPPING[divisionName] || null;
};

/**
 * Get division name from division ID
 * @param {string|number} divisionId - The division ID
 * @returns {string|null} - The division name or null if not found
 */
export const getDivisionName = (divisionId) => {
  const entries = Object.entries(DIVISION_MAPPING);
  const found = entries.find(([name, id]) => id === divisionId);
  return found ? found[0] : null;
};

/**
 * Check if a division ID represents "All Divisions"
 * @param {string|number} divisionId - The division ID to check
 * @returns {boolean} - True if it's "All Divisions"
 */
export const isAllDivisions = (divisionId) => {
  return divisionId === "all" || divisionId === 1;
};

/**
 * Build API URL with division parameters
 * @param {string} baseUrl - The base API URL
 * @param {string} endpoint - The API endpoint
 * @param {string|number} divisionId - The division ID
 * @returns {string} - The complete URL with division parameters
 */
export const buildDivisionUrl = (baseUrl, endpoint, divisionId) => {
  let url = `${baseUrl}${endpoint}`;
  
  if (isAllDivisions(divisionId)) {
    url += "?showAllDivisions=true";
  } else if (divisionId && divisionId !== "all") {
    url += `?divisionId=${divisionId}`;
  }
  
  return url;
};

/**
 * Get division display name with proper formatting
 * @param {Object} division - The division object
 * @returns {string} - The formatted display name
 */
export const getDivisionDisplayName = (division) => {
  if (!division) return "Select Division";
  
  if (division.isAllDivisions || division.id === "all") {
    return "All Divisions";
  }
  
  return division.name || "Unknown Division";
};

/**
 * Validate division data structure
 * @param {Object} division - The division object to validate
 * @returns {boolean} - True if valid
 */
export const isValidDivision = (division) => {
  if (!division) return false;
  
  // Handle "All Divisions" case
  if (division.isAllDivisions || division.id === "all") {
    return true;
  }
  
  // Handle regular divisions
  return typeof division.id === 'number' && 
         typeof division.name === 'string' &&
         division.id > 0;
};

/**
 * Check if user has admin access to view all divisions
 * @param {Object} user - The user object
 * @returns {boolean} - True if user can access all divisions
 */
export const canAccessAllDivisions = (user) => {
  return user && 
         user.roles && 
         Array.isArray(user.roles) && 
         user.roles.some(role => {
           const roleName = role.name && role.name.toLowerCase();
           return roleName === "admin" || roleName === "super admin" || roleName === "superadmin";
         });
};

/**
 * Get API parameters for division filtering
 * @param {string|number} divisionId - The division ID
 * @returns {Object} - Object with appropriate API parameters
 */
export const getDivisionApiParams = (divisionId) => {
  if (isAllDivisions(divisionId)) {
    return { showAllDivisions: 'true' };
  } else if (divisionId && divisionId !== "all") {
    return { divisionId: divisionId };
  }
  return {};
};

/**
 * Get current division from localStorage
 * @returns {Object|null} - The current division object or null
 */
export const getCurrentDivision = () => {
  try {
    const divisionData = localStorage.getItem("selectedDivision");
    return divisionData ? JSON.parse(divisionData) : null;
  } catch (error) {
    console.error("Error parsing division data:", error);
    return null;
  }
};

/**
 * Check if current division is "All Divisions"
 * @returns {boolean} - True if current division is "All Divisions"
 */
export const isCurrentDivisionAll = () => {
  const currentDivision = getCurrentDivision();
  return currentDivision && isAllDivisions(currentDivision.id);
};
