import { useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FiFileText,
  FiHome,
  FiUsers,
  FiDollarSign,
  FiCalendar,
  FiFolder,
  FiBarChart2,
  FiGrid,
  FiBell,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
} from "react-icons/fi";
import useConsulta from "../hooks/useConsulta";
import { api } from "../axios/axios";
import { labels } from "../utils/format";
import { QueryState } from "./ui";

const navigation = [
  ["/home", "Visão geral", FiHome],
  ["/clientes", "Clientes", FiUsers],
  ["/contratos", "Contratos", FiFileText],
  ["/financeiro", "Financeiro", FiDollarSign],
  ["/calendario", "Calendário", FiCalendar],
  ["/documentos", "Documentos", FiFolder],
  ["/relatorios", "Relatórios", FiBarChart2],
  ["/calculadora", "Calculadora", FiGrid],
  ["/alertas", "Alertas", FiBell],
  ["/configuracoes", "Configurações", FiSettings],
];
export function Protected({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/" replace />;
}
export default function Layout() {
  const me = useConsulta("/auth/me");
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = me.data?.usuario;
  const current =
    navigation.find(([path]) => location.pathname.startsWith(path))?.[1] ||
    "ContractFlow";
  async function sair() {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      navigate("/", { replace: true });
    }
  }
  return (
    <div className="app-layout">
      {open ? (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={"sidebar " + (open ? "sidebar-open" : "")}
        aria-label="Navegação principal"
      >
        <Link className="brand" to="/home">
          <FiFileText />
          ContractFlow
        </Link>
        <button
          className="icon-button mobile-close"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        >
          <FiX />
        </button>
        <nav>
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} onClick={() => setOpen(false)}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="account">
            <span className="avatar">{usuario?.nome?.[0] || "C"}</span>
            <div>
              <strong>{usuario?.nome || "Carregando…"}</strong>
              <span>{labels[usuario?.perfil] || ""}</span>
            </div>
          </div>
          <button
            className="logout"
            onClick={() => {
              sair().catch(() => {});
            }}
          >
            <FiLogOut />
            Sair
          </button>
        </div>
      </aside>
      <div className="main-layout">
        <header className="topbar">
          <div className="actions">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <FiMenu />
            </button>
            <span>
              ContractFlow <span className="breadcrumb-separator">/</span>{" "}
              {current}
            </span>
          </div>
          <Link className="icon-button" aria-label="Ver alertas" to="/alertas">
            <FiBell />
          </Link>
        </header>
        <main>
          <QueryState query={me}>
            {usuario ? <Outlet context={{ usuario }} /> : null}
          </QueryState>
        </main>
      </div>
    </div>
  );
}
