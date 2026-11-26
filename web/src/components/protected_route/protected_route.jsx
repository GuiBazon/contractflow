import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Box, Drawer, IconButton, Typography } from "@mui/material";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
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
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";

const MOBILE_NAV_ITEMS = [
  { label: "Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Clientes", icon: PeopleAltRoundedIcon, path: "/clientes" },
  { label: "Contratos", icon: DescriptionRoundedIcon, path: "/contratos" },
  { label: "Calendário", icon: CalendarMonthRoundedIcon, path: "/calendario" },
  { label: "Financeiro", icon: AttachMoneyRoundedIcon, path: "/financeiro" },
  { label: "Calculadora", icon: CalculateRoundedIcon, path: "/calculadora" },
  { label: "Relatórios", icon: BarChartRoundedIcon, path: "/relatorios" },
  { label: "Configurações", icon: SettingsRoundedIcon, path: "/configuracoes/perfil" },
];

const BOTTOM_TABS = [
  { label: "Início", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Clientes", icon: PeopleAltRoundedIcon, path: "/clientes" },
  { label: "Contratos", icon: DescriptionRoundedIcon, path: "/contratos" },
  { label: "Financeiro", icon: AttachMoneyRoundedIcon, path: "/financeiro" },
];

const MORE_PATHS = ["/calendario", "/calculadora", "/relatorios", "/configuracoes"];

function getPageTitle(pathname) {
  if (pathname.startsWith("/contratos/novo")) return "Novo Contrato";
  if (pathname.startsWith("/contratos/importar")) return "Importar Contrato";
  if (pathname.startsWith("/contratos")) return "Contratos";
  if (pathname.startsWith("/clientes")) return "Clientes";
  if (pathname.startsWith("/calendario")) return "Calendário";
  if (pathname.startsWith("/financeiro")) return "Financeiro";
  if (pathname.startsWith("/calculadora")) return "Calculadora";
  if (pathname.startsWith("/relatorios")) return "Relatórios";
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  return "ContractFlow";
}

function isRouteActive(itemPath, pathname) {
  if (itemPath === "/configuracoes/perfil") return pathname.startsWith("/configuracoes");
  if (itemPath === "/contratos") return pathname.startsWith("/contratos");
  return pathname === itemPath;
}

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("auth");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

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
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const isMoreActive = MORE_PATHS.some((p) => location.pathname.startsWith(p));

  function handleNavigate(path) {
    setDrawerOpen(false);
    navigate(path);
  }

  function handleLogout() {
    setDrawerOpen(false);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("auth");
    navigate("/");
  }

  return (
    <>
      {/* Mobile Top Bar (somente < 900px) */}
      <Box sx={mobileStyles.topBar}>
        <Box onClick={() => handleNavigate("/dashboard")} sx={mobileStyles.brand}>
          <Box sx={mobileStyles.brandIcon}>
            <LinkRoundedIcon sx={{ fontSize: 16, transform: "rotate(-45deg)" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={mobileStyles.brandName} noWrap>
              {getPageTitle(location.pathname)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Avatar
            onClick={() => handleNavigate("/configuracoes/perfil")}
            sx={mobileStyles.topAvatar}
          >
            {initials}
          </Avatar>
          <IconButton
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            sx={mobileStyles.menuBtn}
          >
            <MenuRoundedIcon sx={{ fontSize: 23 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: mobileStyles.drawerPaper }}
      >
        <Box sx={mobileStyles.drawerContent}>
          <Box>
            <Box sx={mobileStyles.drawerHeader}>
              <Box onClick={() => handleNavigate("/dashboard")} sx={mobileStyles.brand}>
                <Box sx={mobileStyles.brandIcon}>
                  <LinkRoundedIcon sx={{ fontSize: 18, transform: "rotate(-45deg)" }} />
                </Box>
                <Box>
                  <Typography sx={mobileStyles.brandName}>ContractFlow</Typography>
                  <Typography sx={mobileStyles.brandSub}>Gestão Inteligente</Typography>
                </Box>
              </Box>
              <IconButton
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                sx={{ color: "rgba(255,255,255,0.7)", p: 0.75 }}
              >
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>

            <Box sx={mobileStyles.nav}>
              {MOBILE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.path, location.pathname);

                return (
                  <Box
                    key={item.label}
                    onClick={() => handleNavigate(item.path)}
                    sx={{
                      ...mobileStyles.navItem,
                      ...(active ? mobileStyles.navActive : {}),
                    }}
                  >
                    <Icon sx={{ fontSize: 20 }} />
                    <Typography sx={mobileStyles.navLabel}>{item.label}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box sx={mobileStyles.userRow}>
            <Avatar sx={mobileStyles.avatar}>{initials}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={mobileStyles.userName} noWrap>
                {nomeUsuario}
              </Typography>
              <Typography sx={mobileStyles.userRole}>
                {storageUser?.perfil || "Usuário"}
              </Typography>
            </Box>
            <IconButton
              onClick={handleLogout}
              aria-label="Sair"
              sx={{ color: "rgba(255,255,255,0.7)", p: 0.75 }}
            >
              <LogoutRoundedIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Box>
        </Box>
      </Drawer>

      {/* Conteúdo da página (desktop >= 900px 100% inalterado) */}
      <Box className="cf-app-shell">{children}</Box>

      {/* Mobile Bottom Tab Bar (somente < 900px — padrão iOS/Android) */}
      <Box component="nav" aria-label="Navegação principal" sx={mobileStyles.bottomNav}>
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isRouteActive(tab.path, location.pathname);
          return (
            <Box
              key={tab.path}
              component="button"
              type="button"
              onClick={() => handleNavigate(tab.path)}
              sx={{
                ...mobileStyles.bottomTab,
                ...(active ? mobileStyles.bottomTabActive : {}),
              }}
            >
              <Icon sx={{ fontSize: 22 }} />
              <Typography sx={mobileStyles.bottomTabLabel}>{tab.label}</Typography>
            </Box>
          );
        })}

        <Box
          component="button"
          type="button"
          onClick={() => setDrawerOpen(true)}
          sx={{
            ...mobileStyles.bottomTab,
            ...(isMoreActive || drawerOpen ? mobileStyles.bottomTabActive : {}),
          }}
        >
          <MoreHorizRoundedIcon sx={{ fontSize: 22 }} />
          <Typography sx={mobileStyles.bottomTabLabel}>Mais</Typography>
        </Box>
      </Box>
    </>
  );
};

const mobileStyles = {
  topBar: {
    display: { xs: "flex", md: "none" },
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 1100,
    bgcolor: "#192d65",
    color: "#fff",
    px: 2,
    pt: "env(safe-area-inset-top, 0px)",
    minHeight: "56px",
    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.16)",
  },
  menuBtn: {
    color: "#fff",
    p: 1,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 1.1,
    cursor: "pointer",
    minWidth: 0,
  },
  brandIcon: {
    width: 32,
    height: 32,
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
    fontSize: "15.5px",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  brandSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "10px",
  },
  topAvatar: {
    width: 32,
    height: 32,
    fontSize: "11.5px",
    fontWeight: 700,
    bgcolor: "#3f7ff2",
    cursor: "pointer",
  },
  drawerPaper: {
    width: 272,
    bgcolor: "#192d65",
    color: "#fff",
    pt: "env(safe-area-inset-top, 0px)",
    pb: "env(safe-area-inset-bottom, 0px)",
  },
  drawerContent: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    px: 2.2,
    py: 2.5,
    boxSizing: "border-box",
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mb: 3,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    px: 1.5,
    py: 1.35,
    minHeight: "44px",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.7)",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    "&:active": {
      bgcolor: "rgba(255,255,255,0.14)",
      color: "#fff",
    },
  },
  navActive: {
    bgcolor: "rgba(63, 127, 242, 0.28)",
    color: "#fff",
  },
  navLabel: {
    fontSize: "14.5px",
    fontWeight: 500,
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 1.2,
    borderTop: "1px solid rgba(255,255,255,0.12)",
    pt: 2,
    mt: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    fontSize: "12.5px",
    fontWeight: 700,
    bgcolor: "#3f7ff2",
    flexShrink: 0,
  },
  userName: {
    color: "#fff",
    fontSize: "13.5px",
    fontWeight: 600,
  },
  userRole: {
    color: "rgba(255,255,255,0.48)",
    fontSize: "11px",
  },
  bottomNav: {
    display: { xs: "grid", md: "none" },
    gridTemplateColumns: "repeat(5, 1fr)",
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1100,
    bgcolor: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    borderTop: "1px solid #e2e8f0",
    pt: 0.75,
    pb: "calc(8px + env(safe-area-inset-bottom, 0px))",
    px: 0.5,
    boxShadow: "0 -4px 18px rgba(15, 23, 42, 0.06)",
  },
  bottomTab: {
    border: "none",
    background: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    minHeight: "48px",
    color: "#64748b",
    cursor: "pointer",
    borderRadius: "10px",
    p: 0.5,
    transition: "color 0.15s, background 0.15s",
    "&:active": {
      bgcolor: "rgba(63, 127, 242, 0.08)",
    },
  },
  bottomTabActive: {
    color: "#2563eb",
    "& .MuiTypography-root": {
      fontWeight: 700,
      color: "#2563eb",
    },
  },
  bottomTabLabel: {
    fontSize: "10.5px",
    fontWeight: 500,
    lineHeight: 1.1,
    color: "inherit",
  },
};

export default ProtectedRoute;
