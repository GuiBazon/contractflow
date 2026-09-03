import { Navigate } from "react-router-dom";


const protected_route = ({children}) => {
  const isAuthenticated = localStorage.getItem("auth");
  return isAuthenticated ? children : <Navigate to="/" />;
};

export default protected_route;
