import React, { lazy, Suspense } from "react";
import styles from "./Farmer.module.css";
import { Route, Routes, useNavigate } from "react-router-dom";
import PageSkeleton from "@/components/SkeletonLoaders/PageSkeleton";

// Lazy loaded components
const FarmerHome = lazy(() => import("./FarmerHome"));
const FarmerList = lazy(() => import("./FarmerList"));
const CreateFarmer = lazy(() => import("./CreateFarmer"));

function FarmerRoutes() {
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
            <FarmerHome navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
      <Route
        path="/create"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <CreateFarmer navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
      <Route
        path="/farmer-list"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <FarmerList navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />

    </Routes>
  );
}

export default FarmerRoutes;
