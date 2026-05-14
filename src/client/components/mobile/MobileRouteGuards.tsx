import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/useIsMobile";

export function DesktopOnlyRoute() {
  const isMobile = useIsMobile();
  return isMobile ? <Navigate to="/m" replace /> : <Outlet />;
}

export function MobileOnlyRoute() {
  const isMobile = useIsMobile();
  const location = useLocation();
  return !isMobile && location.pathname.startsWith("/m") ? <Navigate to="/" replace /> : <Outlet />;
}
