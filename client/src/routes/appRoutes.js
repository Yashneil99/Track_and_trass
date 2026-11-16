import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/protectedRoute.jsx";
import { ROUTES } from "../components/constant/routes.js";
import ErrorBoundary from "../components/common/errorBoundary.jsx";
import { FullPageLoader } from "../components/common/fallback.jsx";
import NotFoundPage from "../pages/notFound.jsx";
import Locations from "../components/location/locations.jsx";
import Settings from "../components/settings/settings.jsx";
import RaiseRequest from "../components/settings/raiseRequest.jsx";

const Login = lazy(() => import("../pages/login/login"));
const Register = lazy(() => import("../pages/register/register"));
const Home = lazy(() => import("../pages/home/home"));
const Admin = lazy(() => import("../components/admin/admin"));
const Tracking = lazy(() => import("../components/tracking/tracking.jsx"));
const Analytics = lazy(() => import("../components/analytics/analytics.jsx"));
const MaterialComp = lazy(() => import("../components/materials/materialComp"));
const Process = lazy(() => import("../components/process/process.jsx"));
const Dashboard = lazy(() => import("../components/dashboard/dashboard.jsx"));

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={<FullPageLoader width="100%" height="100vh" count={5} />}
      >
        <Routes>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path={ROUTES.HOME}
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path={ROUTES.HOME_ADMIN} element={<Admin />} />
            <Route path={ROUTES.HOME_TRACKING} element={<Tracking />} />
            <Route path={ROUTES.HOME_LOCATION} element={<Locations />} />
            <Route path={ROUTES.HOME_MATERIALS} element={<MaterialComp />} />
            <Route path={ROUTES.HOME_PROCESS} element={<Process />} />
            <Route path={ROUTES.HOME_ANALYTICS} element={<Analytics />} />
            <Route path={ROUTES.HOME_RECIPE_MIX} element={<RaiseRequest />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
