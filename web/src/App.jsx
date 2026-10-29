// Imports de Páginas
import Login from "./pages/login/login";
import Register from "./pages/register/register";
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

          {/* Importação Inteligente com IA */}
          <Route
            path="/contratos/importar"
            element={
              <ProtectedRoute>
                <ImportarContrato />
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

          {/* Relatórios e Inteligência */}
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute>
                <Relatorios />
              </ProtectedRoute>
            }
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
