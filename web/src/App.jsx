// Imports de Páginas
import Login from "./pages/login/login";
import Register from "./pages/register/register";
import Home from "./pages/home/home";
import ConfigPerfil from "./pages/config_perfil/config_perfil";
import ConfigAlertas from "./pages/config_alertas/config_alertas";
import ConfigSeguranca from "./pages/config_seguranca/config_seguranca";
import Dashboard from "./pages/dashboard/dashboard";
import Clientes from "./pages/clientes/clientes";
import Contratos from "./pages/contratos/contratos";
import NovoContrato from "./pages/contratos/novo_contrato";
import ImportarContrato from "./pages/contratos/importar_contrato";
import Calendario from "./pages/calendario/calendario";
import Relatorios from "./pages/relatorios/relatorios";
import Financeiro from "./pages/financeiro/financeiro";

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
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clientes"
            element={
              <ProtectedRoute>
                <Clientes />
              </ProtectedRoute>
            }
          />

          {/* Calendário de Obrigações */}
          <Route
            path="/calendario"
            element={
              <ProtectedRoute>
                <Calendario />
              </ProtectedRoute>
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

          {/* Novo Contrato */}
          <Route
            path="/contratos/novo"
            element={
              <ProtectedRoute>
                <NovoContrato />
              </ProtectedRoute>
            }
          />

          {/* ⚙️ CONFIGURAÇÕES */}
          <Route
            path="/configuracoes/perfil"
            element={
              <ProtectedRoute>
                <ConfigPerfil />
          {/* Importação Inteligente com IA */}
          <Route
            path="/contratos/importar"
            element={
              <ProtectedRoute>
                <ImportarContrato />
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracoes/alertas"
            element={
              <ProtectedRoute>
                <ConfigAlertas />
          {/* Detalhes de um contrato específico */}
          <Route
            path="/contratos/:id"
            element={
              <ProtectedRoute>
                <Contratos />
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracoes/seguranca"
            element={
              <ProtectedRoute>
                <ConfigSeguranca />
          {/* Relatórios e Inteligência */}
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute>
                <Relatorios />
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracoes"
            element={<Navigate to="/configuracoes/perfil" replace />}
          />

          {/* Fluxo Financeiro */}
          <Route
            path="/financeiro"
            element={
              <ProtectedRoute>
                <Financeiro />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
