import { Navigate, Outlet, useLocation } from "react-router";
import { USER_TOKEN_KEY } from "../pages/site/userSession";

export function RequireAdmin() {
  const location = useLocation();
  const token = sessionStorage.getItem("token");

  return token
    ? <Outlet />
    : <Navigate to="/dashboard/signin" replace state={{ from: location.pathname }} />;
}

export function RequireUser() {
  const location = useLocation();
  const token = sessionStorage.getItem(USER_TOKEN_KEY);

  return token
    ? <Outlet />
    : <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
}
