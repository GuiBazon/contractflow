// Imports de Páginas
import Login from "./pages/login/login";
import Register from "./pages/register/register";
import Home from "./pages/home/home";
import ConfigPerfil from "./pages/config_perfil/config_perfil";
import ConfigAlertas from "./pages/config_alertas/config_alertas";
import ConfigSeguranca from "./pages/config_seguranca/config_seguranca";

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

          {/* 🔒 PROTEGIDA */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* ⚙️ CONFIGURAÇÕES */}
          <Route
            path="/configuracoes/perfil"
            element={
              <ProtectedRoute>
                <ConfigPerfil />
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracoes/alertas"
            element={
              <ProtectedRoute>
                <ConfigAlertas />
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracoes/seguranca"
            element={
              <ProtectedRoute>
                <ConfigSeguranca />
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracoes"
            element={<Navigate to="/configuracoes/perfil" replace />}
          />

        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;