import React, { lazy, Suspense } from "react";
import styles from "./Employees.module.css";
import { Route, Routes, useNavigate } from "react-router-dom";
import PageSkeleton from "../../SkeletonLoaders/PageSkeleton";

// Lazy-loaded components
const CreateEmployee = lazy(() => import("./CreateEmployee"));
const EmployeeHome = lazy(() => import("./EmployeeHome"));
const AssignRole = lazy(() => import("./AssignRole"));
const ManageEmployees = lazy(() => import("./ManageEmployees"));
const TeamTransfer = lazy(() => import("./TeamTransfer"));

function EmployeeRoutes() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const roles = JSON.stringify(user.roles);

  const isAdmin = roles.includes("Admin");

  return (
    <Routes>
      <Route
        index
        element={
          <Suspense fallback={<PageSkeleton />}>
            <EmployeeHome navigate={navigate} isAdmin={isAdmin}/>
          </Suspense>
        }
      />
      <Route
        path="/create-employee"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <CreateEmployee navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
      <Route
        path="/assign-role"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <AssignRole navigate={navigate} />
          </Suspense>
        }
      />
      <Route
        path="/manage-employees"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ManageEmployees navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
      <Route
        path="/team-transfer"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <TeamTransfer navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default EmployeeRoutes;
