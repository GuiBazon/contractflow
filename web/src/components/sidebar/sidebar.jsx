import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, Avatar } from "@mui/material";

// MUI Icons
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";

/* ─────────────────────────────────────────────────────────
   Mapeamento iconKey → componente MUI
───────────────────────────────────────────────────────── */
const ICON_MAP = {
  dashboard: DashboardRoundedIcon,
  people: PeopleAltRoundedIcon,
  description: DescriptionRoundedIcon,
  calendar: CalendarMonthRoundedIcon,
  money: AttachMoneyRoundedIcon,
  calculate: CalculateRoundedIcon,
  bar_chart: BarChartRoundedIcon,
  settings: SettingsRoundedIcon,
};

const NAV_ITEMS = [
  { label: "Dashboard",     iconKey: "dashboard",   path: "/dashboard" },
  { label: "Clientes",      iconKey: "people",      path: "/clientes" },
  { label: "Contratos",     iconKey: "description", path: "/contratos" },
  { label: "Calendário",    iconKey: "calendar",    path: "/calendario" },
  { label: "Financeiro",    iconKey: "money",       path: "/financeiro" },
  { label: "Calculadora",   iconKey: "calculate",   path: "/calculadora" },
  { label: "Relatórios",    iconKey: "bar_chart",   path: "/relatorios" },
  { label: "Configurações", iconKey: "settings",    path: "/configuracoes/perfil" },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const storageUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("usuario") || "{}");
    } catch {
      return {};
    }
  })();

  const nomeUsuario = storageUser?.nome || "Usuário";
  const initials =
    nomeUsuario
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("auth");
    navigate("/");
  }

  return (
    <Box sx={styles.sidebar}>
      <Box>
        {/* Brand */}
        <Box sx={styles.brand} onClick={() => navigate("/dashboard")}>
          <Box sx={styles.brandIcon}>
            <LinkRoundedIcon sx={{ fontSize: 18, transform: "rotate(-45deg)" }} />
          </Box>
          <Box>
            <Typography sx={styles.brandName}>ContractFlow</Typography>
            <Typography sx={styles.brandSub}>Gestão Inteligente</Typography>
          </Box>
        </Box>

        {/* Navigation */}
        <Box sx={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.iconKey];
            const isActive =
              item.path === "/configuracoes/perfil"
                ? location.pathname.startsWith("/configuracoes")
                : item.path === "/contratos"
                ? location.pathname.startsWith("/contratos")
                : location.pathname === item.path;

            return (
              <Box
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                sx={{
                  ...styles.navItem,
                  ...(isActive ? styles.navActive : {}),
                  cursor: item.path ? "pointer" : "default",
                }}
                title={item.path ? `Ir para ${item.label}` : item.label}
              >
                {Icon && <Icon sx={{ fontSize: 18 }} />}
                <Typography sx={styles.navLabel}>{item.label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* User Section */}
      <Box sx={styles.userRow}>
        <Avatar sx={styles.avatar}>{initials}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={styles.userName} noWrap>
            {nomeUsuario}
          </Typography>
          <Typography sx={styles.userRole}>
            {storageUser?.perfil || "Usuário"}
          </Typography>
        </Box>
        <Box
          component="button"
          onClick={handleLogout}
          sx={styles.logoutBtn}
          title="Sair"
        >
          <LogoutRoundedIcon sx={{ fontSize: 17 }} />
        </Box>
      </Box>
    </Box>
  );
}

const styles = {
  sidebar: {
    width: 220,
    minWidth: 220,
    bgcolor: "#192d65",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    px: 2.5,
    py: 3,
    position: "fixed",
    top: 0,
    left: 0,
    height: "100dvh",
    overflowY: "auto",
    zIndex: 100,
    flexShrink: 0,
    boxSizing: "border-box",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 1.3,
    mb: 4,
    px: 0.5,
    cursor: "pointer",
  },

  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: "9px",
    bgcolor: "#3f7ff2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },

  brandName: {
    color: "#fff",
    fontSize: "14.5px",
    fontWeight: 700,
    lineHeight: 1.2,
  },

  brandSub: {
    color: "rgba(255,255,255,0.42)",
    fontSize: "10px",
    mt: "1px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 1.4,
    px: 1.5,
    py: 1.15,
    borderRadius: "8px",
    color: "rgba(255,255,255,0.55)",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    "&:hover": {
      bgcolor: "rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.85)",
    },
  },

  navActive: {
    bgcolor: "rgba(255,255,255,0.12)",
    color: "#fff",
    "&:hover": {
      bgcolor: "rgba(255,255,255,0.15)",
    },
  },

  navLabel: {
    fontSize: "13px",
    fontWeight: 500,
  },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 1.2,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    pt: 2.5,
    px: 0.5,
    mt: 2,
  },

  avatar: {
    width: 34,
    height: 34,
    fontSize: "12px",
    fontWeight: 700,
    bgcolor: "#3f7ff2",
    flexShrink: 0,
  },

  userName: {
    color: "#fff",
    fontSize: "12.5px",
    fontWeight: 600,
    lineHeight: 1.3,
  },

  userRole: {
    color: "rgba(255,255,255,0.42)",
    fontSize: "10.5px",
  },

  logoutBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: 0,
    ml: "auto",
    flexShrink: 0,
    transition: "color 0.15s",
    "&:hover": {
      color: "#fff",
    },
  },
};

export default Sidebar;
