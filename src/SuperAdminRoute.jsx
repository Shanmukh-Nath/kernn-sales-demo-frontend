import { Navigate, Outlet } from "react-router-dom";
import { normalizeRoleName } from "@/utils/roleUtils";

export default function SuperAdminRoute() {
  // Get user from localStorage (same pattern your app uses)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const selectedDivision = JSON.parse(
    localStorage.getItem("selectedDivision") || "{}"
  );

  const roles = Array.isArray(user.roles) ? user.roles : [];

  const isSuperAdmin = roles.some((r) => {
    const role = normalizeRoleName(r);
    return (
      role === "super admin" || role === "super_admin" || role === "superadmin"
    );
  });

  const isAllDivisions =
    selectedDivision?.isAllDivisions === true || selectedDivision?.id === "all";

  // ❌ Block access if conditions fail
  if (!isSuperAdmin || !isAllDivisions) {
    return <Navigate to="/licensing" replace />;
  }

  // ✅ Allow access
  return <Outlet />;
}
