import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SearchBar.module.css";
import { IoSearch } from "react-icons/io5";

const options = [
  { name: "Home", path: "/" },
  { name: "Inventory", path: "/inventory" },
  { name: "Inventory - Incoming Stock", path: "/inventory/incoming-stock" },
  { name: "Inventory - Outgoing Stock", path: "/inventory/outgoing-stock" },
  { name: "Inventory - Stock Summary", path: "/inventory/stock-summary" },
  { name: "Purchases", path: "/purchases" },
  { name: "Purchases - New Purchase", path: "/purchases/new-purchase" },
  { name: "Purchases - Purchase Report", path: "/purchases/purchase-report" },
  { name: "Sales", path: "/sales" },
  { name: "Sales - Orders", path: "/sales/orders" },
  { name: "Sales - Dispatches", path: "/sales/dispatches" },
  { name: "Sales - Deliveries", path: "/sales/deliveries" },
  { name: "Sales - Partial Dispatch Requests", path: "/sales/partial-dispatch-requests" },
  { name: "Customers", path: "/customers" },
  { name: "Customers - List", path: "/customers/customer-list" },
  { name: "Customers - KYC Approvals", path: "/customers/kyc-approvals" },
  { name: "Payments", path: "/payments" },
  { name: "Payments - Reports", path: "/payments/payment-reports" },
  { name: "Payments - Approvals", path: "/payments/payment-approvals" },
  { name: "Employees", path: "/employees" },
  { name: "Employees - Create", path: "/employees/create-employee" },
  { name: "Employees - Assign Role", path: "/employees/assign-role" },
  { name: "Employees - Manage", path: "/employees/manage-employees" },
  { name: "Live Locations", path: "/location" },
  { name: "Warehouse", path: "/warehouses" },
  { name: "Warehouse - Ongoing", path: "/warehouses/ongoing" },
  { name: "Products", path: "/products" },
  { name: "Products - Add", path: "/products/add" },
  { name: "Products - Modify", path: "/products/modify" },
  { name: "Targets", path: "/targets" },
  { name: "Targets - Sales", path: "/targets/sales-target" },
  { name: "Targets - Customers", path: "/targets/customer-target" },
];

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);

    if (value.trim() === "") {
      setFilteredOptions([]);
      return;
    }

    const filtered = options.filter((option) =>
      option.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOptions(filtered);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      setActiveIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (event.key === "ArrowUp") {
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      navigate(filteredOptions[activeIndex].path);
      setSearchTerm("");
      setFilteredOptions([]);
    }
  };

  return (
    <div className={styles.searchbar}>
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <span className={styles.searchicon}>
        <IoSearch />
      </span>
      {filteredOptions.length > 0 && (
        <ul className={styles.dropdown}>
          {filteredOptions.map((option, index) => (
            <li
              key={option.name}
              className={
                activeIndex === index ? styles.active : styles.dropdownItem
              }
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                navigate(option.path);
                setSearchTerm("");
                setFilteredOptions([]);
              }}
            >
              {option.name}
              <p>{option.path}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
