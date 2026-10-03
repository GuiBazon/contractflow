import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Layout, { Protected } from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clientes, { DetalheCliente } from "./pages/Clientes";
import Contratos, { FormContrato } from "./pages/Contratos";
import DetalheContrato from "./pages/DetalheContrato";

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
          <Route path="/contratos/:id" element={<DetalheContrato />} />
          <Route path="/contratos/:id/editar" element={<FormContrato />} />
          <Route path="/contratos/:id/renovar" element={<FormContrato renewal />} />
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
