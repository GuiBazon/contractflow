import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Tooltip,
  Avatar,
} from "@mui/material";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

const NAV_ITEMS = [
  { label: "Dashboard",    icon: <DashboardRoundedIcon />,            path: "/home" },
  { label: "Clientes",     icon: <PeopleAltRoundedIcon />,            path: "/clientes" },
  { label: "Contratos",    icon: <DescriptionRoundedIcon />,          path: "/contratos" },
  { label: "Calendário",   icon: <CalendarMonthRoundedIcon />,        path: "/calendario" },
  { label: "Financeiro",   icon: <AccountBalanceWalletRoundedIcon />, path: "/financeiro" },
  { label: "Calculadora",  icon: <CalculateRoundedIcon />,            path: "/calculadora" },
  { label: "Relatórios",   icon: <BarChartRoundedIcon />,             path: "/relatorios" },
  { label: "Configurações",icon: <SettingsRoundedIcon />,             path: "/configuracoes" },
];

function Sidebar() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [hovered, setHovered] = useState(null);

  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem("usuario") || "{}"); }
    catch { return {}; }
  })();

  function getInitials(name = "") {
    return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "U";
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("auth");
    navigate("/");
  }

  return (
    <Box sx={styles.sidebar}>
      {/* ── Logo ── */}
      <Box sx={styles.brand} onClick={() => navigate("/home")}>
        <Box sx={styles.brandIcon}>
          <DescriptionRoundedIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={styles.brandName}>ContractFlow</Typography>
          <Typography sx={styles.brandSub}>Gestão de Contratos</Typography>
        </Box>
      </Box>

      {/* ── Divider ── */}
      <Box sx={styles.divider} />

      {/* ── Nav Items ── */}
      <Box sx={styles.nav} component="nav">
        <Typography sx={styles.navSection}>MENU PRINCIPAL</Typography>

        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const isHover  = hovered === item.path;

          return (
            <Tooltip
              key={item.path}
              title=""
              placement="right"
              arrow={false}
            >
              <Box
                sx={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                  ...(isHover && !isActive ? styles.navItemHover : {}),
                }}
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHovered(item.path)}
                onMouseLeave={() => setHovered(null)}
              >
                <Box sx={{
                  ...styles.navIcon,
                  ...(isActive ? styles.navIconActive : {}),
                }}>
                  {item.icon}
                </Box>
                <Typography sx={{
                  ...styles.navLabel,
                  ...(isActive ? styles.navLabelActive : {}),
                }}>
                  {item.label}
                </Typography>

                {isActive && <Box sx={styles.activeIndicator} />}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* ── Spacer ── */}
      <Box sx={{ flex: 1 }} />

      {/* ── Divider ── */}
      <Box sx={styles.divider} />

      {/* ── User Profile ── */}
      <Box sx={styles.userSection}>
        <Avatar sx={styles.avatar}>
          {getInitials(usuario.nome)}
        </Avatar>

        <Box sx={styles.userInfo}>
          <Typography sx={styles.userName}>
            {usuario.nome || "Usuário"}
          </Typography>
          <Typography sx={styles.userRole}>
            {usuario.perfil || "Colaborador"}
          </Typography>
        </Box>

        <Tooltip title="Sair" placement="right">
          <Box sx={styles.logoutBtn} onClick={logout}>
            <LogoutRoundedIcon sx={{ fontSize: 16 }} />
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}

const styles = {
  sidebar: {
    width: "240px",
    minWidth: "240px",
    height: "100vh",
    backgroundColor: "#203f82",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    overflowY: "auto",
    overflowX: "hidden",
    zIndex: 100,
    boxShadow: "4px 0 24px rgba(0,0,0,0.15)",

    "&::-webkit-scrollbar": { width: "4px" },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.15)", borderRadius: "4px" },
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    px: 2.5,
    py: 2.5,
    cursor: "pointer",
    userSelect: "none",
  },

  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: "10px",
    backgroundColor: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },

  brandName: {
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: "0.2px",
  },

  brandSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "10px",
    mt: 0.3,
  },

  divider: {
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.08)",
    mx: 2.5,
    my: 0.5,
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    px: 1.5,
    pt: 1.5,
    gap: 0.5,
  },

  navSection: {
    color: "rgba(255,255,255,0.35)",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "1.2px",
    px: 1,
    py: 1,
    mb: 0.5,
  },

  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 1.2,
    px: 1.2,
    py: 1,
    borderRadius: "10px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.18s ease",
    userSelect: "none",
  },

  navItemActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  navItemHover: {
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  navIcon: {
    color: "rgba(255,255,255,0.5)",
    display: "flex",
    alignItems: "center",
    "& svg": { fontSize: 19 },
    transition: "color 0.18s ease",
  },

  navIconActive: {
    color: "#7eb8ff",
  },

  navLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "13px",
    fontWeight: 500,
    transition: "color 0.18s ease",
    flex: 1,
  },

  navLabelActive: {
    color: "#fff",
    fontWeight: 600,
  },

  activeIndicator: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    width: "3px",
    height: "18px",
    borderRadius: "3px 0 0 3px",
    backgroundColor: "#7eb8ff",
  },

  userSection: {
    display: "flex",
    alignItems: "center",
    gap: 1.2,
    px: 2,
    py: 2,
  },

  avatar: {
    width: 34,
    height: 34,
    fontSize: "13px",
    fontWeight: 700,
    backgroundColor: "rgba(126, 184, 255, 0.25)",
    color: "#a8d0ff",
    border: "1.5px solid rgba(255,255,255,0.12)",
    flexShrink: 0,
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  userRole: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "10px",
    mt: 0.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  logoutBtn: {
    width: 28,
    height: 28,
    borderRadius: "8px",
    backgroundColor: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.18s ease",

    "&:hover": {
      backgroundColor: "rgba(255,80,80,0.2)",
      color: "#ff8080",
    },
  },
};

export default Sidebar;
