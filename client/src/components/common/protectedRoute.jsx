// import React from "react";
// import { useSelector } from "react-redux";
// import { Navigate } from "react-router-dom";

// const ProtectedRoute = ({ children }) => {
//   const { token } = useSelector((state) => state.auth);
//   return token ? children : <Navigate to="/login" replace />;
// };

// export default ProtectedRoute;

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { isTokenExpired } from "../helpers/tokenExpiration";

const ProtectedRoute = ({ children, roles = [] }) => {
  const location = useLocation();
  const auth = useSelector((s) => s.auth);
  const user = auth?.user;
  const userRole = auth?.user?.role;
  const tokenExp = auth?.user?.tokenExpiry;

  if (!user || isTokenExpired(tokenExp)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length && !roles.includes(userRole)) {
    return <Navigate to="/404" replace />;
  }

  return children;
};

export default ProtectedRoute;
