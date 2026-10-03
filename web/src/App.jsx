import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Layout, { Protected } from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clientes, { DetalheCliente } from "./pages/Clientes";
import Contratos, { FormContrato } from "./pages/Contratos";
import DetalheContrato from "./pages/DetalheContrato";
import Financeiro from "./pages/Financeiro";
import Calendario from "./pages/Calendario";
import Alertas from "./pages/Alertas";
import Documentos from "./pages/Documentos";
import ImportarContrato from "./pages/ImportarContrato";
import Calculadora from "./pages/Calculadora";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth key="login" />} />
        <Route path="/register" element={<Auth key="register" register />} />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/home" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<DetalheCliente />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/contratos/novo" element={<FormContrato />} />
          <Route path="/contratos/importar" element={<ImportarContrato />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/calculadora" element={<Calculadora />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/contratos/:id" element={<DetalheContrato />} />
          <Route path="/contratos/:id/editar" element={<FormContrato />} />
          <Route
            path="/contratos/:id/renovar"
            element={<FormContrato renewal />}
          />
          <Route
            path="*"
            element={
              <>
                <h1>Página não encontrada</h1>
                <Link to="/home">Voltar ao início</Link>
              </>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
