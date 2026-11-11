// Imports de Páginas
import Login from "./pages/login/login";
import Register from "./pages/register/register";
import TermosDeUso from "./pages/termos_de_uso/termos_de_uso";
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
import Calculadora from "./pages/calculadora/calculadora";

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
          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />

          {/* ⚙️ CONFIGURAÇÕES */}
          <Route path="/configuracoes" element={<ProtectedRoute><Navigate to="/configuracoes/perfil" replace /></ProtectedRoute>} />
          <Route path="/configuracoes/perfil" element={<ProtectedRoute><ConfigPerfil /></ProtectedRoute>} />
          <Route path="/configuracoes/alertas" element={<ProtectedRoute><ConfigAlertas /></ProtectedRoute>} />
          <Route path="/configuracoes/seguranca" element={<ProtectedRoute><ConfigSeguranca /></ProtectedRoute>} />

          {/* Calendário de Obrigações */}
          <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />

          {/* Contratos */}
          <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
          <Route path="/contratos/novo" element={<ProtectedRoute><NovoContrato /></ProtectedRoute>} />
          <Route path="/contratos/importar" element={<ProtectedRoute><ImportarContrato /></ProtectedRoute>} />
          <Route path="/contratos/:id" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />

          {/* Relatórios e Inteligência */}
          <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />

          {/* Fluxo Financeiro */}
          <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />

          {/* Calculadora Financeira */}
          <Route path="/calculadora" element={<ProtectedRoute><Calculadora /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;