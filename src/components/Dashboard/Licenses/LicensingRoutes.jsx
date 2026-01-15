import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import RouteSkeleton from "@/components/SkeletonLoaders/RouteSkeleton";

const LicensingHome = React.lazy(() => import("./LicensingHome"));
const LicensePool = React.lazy(() => import("./LicensePool"));
const AddLicense = React.lazy(() => import("./AddLicense"));
const EmployeeLicenses = React.lazy(() => import("./EmployeeLicenses"));
// const PricingPlans = React.lazy(() => import("./PricingPlans"));
const LicenseInvoices = React.lazy(() => import("./LicenseInvoices"));
const LicensingSettings = React.lazy(() => import("./LicensingSettings"));
const DeviceSessions = React.lazy(() => import("./DeviceSessions"));
const UsageHistory = React.lazy(() => import("./UsageHistory"));
import SuperAdminRoute from "@/SuperAdminRoute";

function LicensingRoutes() {
  return (
    <Routes>
      <Route
        index
        element={
          <Suspense fallback={<RouteSkeleton />}>
            <LicensingHome />
          </Suspense>
        }
      />
      <Route
        path="licenses"
        element={
          <Suspense fallback={<RouteSkeleton />}>
            <LicensePool />
          </Suspense>
        }
      />
      <Route
        path="add"
        element={
          <Suspense fallback={<RouteSkeleton />}>
            <AddLicense />
          </Suspense>
        }
      />
      <Route
        path="employees"
        element={
          <Suspense fallback={<RouteSkeleton />}>
            <EmployeeLicenses />
          </Suspense>
        }
      />
      <Route
        path="devices"
        element={
          <Suspense fallback={<RouteSkeleton />}>
            <DeviceSessions />
          </Suspense>
        }
      />
      <Route
        path="usage-history"
        element={
          <Suspense fallback={<RouteSkeleton />}>
            <UsageHistory />
          </Suspense>
        }
      />
      <Route
        path="invoices"
        element={
          <Suspense fallback={<RouteSkeleton />}>
            <LicenseInvoices />
          </Suspense>
        }
      />
      <Route element={<SuperAdminRoute />}>
        <Route
          path="settings"
          element={
            <Suspense fallback={<RouteSkeleton />}>
              <LicensingSettings />
            </Suspense>
          }
        />
      </Route>

      {/* Future routes */}
      {/* 
      <Route path="licenses" element={<LicensePool />} />
      <Route path="employees" element={<EmployeeLicenses />} />
      <Route path="pricing" element={<PricingPlans />} />
      <Route path="invoices" element={<LicenseInvoices />} />
      <Route path="settings" element={<LicensingSettings />} />
      */}
    </Routes>
  );
}

export default LicensingRoutes;
