import React, { lazy, Suspense } from "react";
import styles from "./Products.module.css";
import { Route, Routes, useNavigate } from "react-router-dom";
import PageSkeleton from "../../SkeletonLoaders/PageSkeleton";

// Lazy-loaded components
const AddProduct = lazy(() => import("./AddProduct"));
const ModifyProduct = lazy(() => import("./ModifyProduct"));
const ProductHome = lazy(() => import("./ProductHome"));
const PricingList = lazy(() => import("./PricingList"));
const Taxes = lazy(() => import("./Taxes"));

function ProductRoutes() {
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
            <ProductHome navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
      <Route
        path="/add"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <AddProduct navigate={navigate} isAdmin={isAdmin}/>
          </Suspense>
        }
      />
      <Route
        path="/modify"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ModifyProduct navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
      <Route
        path="/pricing-list"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <PricingList navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
      <Route
        path="/taxes"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Taxes navigate={navigate} isAdmin={isAdmin} />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default ProductRoutes;
