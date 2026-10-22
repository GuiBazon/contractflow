// Imports de Páginas
import Login from "./pages/login/login";
import Register from "./pages/register/register";
import Dashboard from "./pages/dashboard/dashboard";
import Clientes from "./pages/clientes/clientes";
import Contratos from "./pages/contratos/contratos";

import { CssBaseline } from "@mui/material";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
          <Route path="/home" element={<Navigate to="/contratos" replace />} />

          <Route
            path="/dashboard"
            element={
              <Dashboard />
            }
          />

          <Route
            path="/clientes"
            element={
              <Clientes />
            }
          />

          {/* Listagem de contratos (grade de cards) */}
          <Route
            path="/contratos"
            element={
              <ProtectedRoute>
                <Contratos />
              </ProtectedRoute>
            }
          />

          {/* Detalhes de um contrato específico */}
          <Route
            path="/contratos/:id"
            element={
              <ProtectedRoute>
                <Contratos />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
