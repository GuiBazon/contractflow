// Imports de Páginas
import Login from "./pages/login/login";
import Register from "./pages/register/register";
import Home from "./pages/home/home";
import Dashboard from "./pages/dashboard/dashboard";

import { CssBaseline } from "@mui/material";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/protected_route/protected_route";


function App() {
  return (
    <>
      <CssBaseline />

      <BrowserRouter>
        <Routes>
          {/* 🔓 PUBLIC */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 🔒 PROTEGIDAS */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;