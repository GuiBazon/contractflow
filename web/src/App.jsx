import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Layout, { Protected } from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

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
