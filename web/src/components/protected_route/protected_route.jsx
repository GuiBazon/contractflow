import { Navigate } from "react-router-dom";


const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("auth");
  return isAuthenticated ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
