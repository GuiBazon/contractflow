import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import SnackBar from "../../components/snack_bar/snack_bar";
import SettingsSubMenu from "../../components/settings_sub_menu/settings_sub_menu";
import SectionCard from "../../components/section_card/section_card";
import ToggleRow from "../../components/toggle_row/toggle_row";

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
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import {
  Box,
  Typography,
  Avatar,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

/* ─── Mapeamento iconKey → componente ───────────────────── */
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
  { label: "Dashboard", iconKey: "dashboard", path: "/dashboard" },
  { label: "Clientes", iconKey: "people", path: "/clientes" },
  { label: "Contratos", iconKey: "description", path: "/contratos" },
  { label: "Calendário", iconKey: "calendar", path: "/calendario" },
  { label: "Financeiro", iconKey: "money" },
  { label: "Calculadora", iconKey: "calculate" },
  { label: "Relatórios", iconKey: "bar_chart" },
  { label: "Configurações", iconKey: "settings", path: "/configuracoes/perfil" },
];

/* ─── Helpers ────────────────────────────────────────────── */
function getStorageUser() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    return null;
  }
}

function getInitials(nome) {
  return (nome || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/* =========================================================
   CONFIG ALERTAS
========================================================= */
function ConfigAlertas() {
  const navigate = useNavigate();
  const location = useLocation();

  const storageUser = getStorageUser();
  const nomeUsuario = storageUser?.nome || "Usuário";
  const initials = getInitials(nomeUsuario);

  const [alertas, setAlertas] = useState({
    vencimento: true,
    parcelas_atraso: true,
    dias_vencimento: 5,
    renovacao: false,
    encerramento: true,
    novos_contratos: false,
    dias_contratos: 7,
  });

  const [canais, setCanais] = useState({
    email: true,
    sistema: true,
    whatsapp: false,
  });

  const [alert, setAlert] = useState({ open: false, severity: "", message: "" });

  const showAlert = (severity, message) =>
    setAlert({ open: true, severity, message });

  const handleCloseAlert = () =>
    setAlert((prev) => ({ ...prev, open: false }));

  function handleLogout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  }

  function toggleAlerta(key) {
    setAlertas((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleDias(key, value) {
    const num = parseInt(value, 10);
    setAlertas((prev) => ({ ...prev, [key]: isNaN(num) ? "" : Math.max(1, num) }));
  }

  function toggleCanal(key) {
    setCanais((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    showAlert("success", "Preferências de alerta salvas com sucesso!");
  }

  /* ─── RENDER ─────────────────────────────────────────── */
  return (
    <Box sx={styles.page}>
      <SnackBar
        open={alert.open}
        severity={alert.severity}
        message={alert.message}
        handleClose={handleCloseAlert}
      />

      {/* ══════════ SIDEBAR ══════════ */}
      <Box sx={styles.sidebar}>
        <Box>
          <Box sx={styles.brand}>
            <Box sx={styles.brandIcon}>
              <LinkRoundedIcon sx={{ fontSize: 18, transform: "rotate(-45deg)" }} />
            </Box>
            <Box>
              <Typography sx={styles.brandName}>ContractFlow</Typography>
              <Typography sx={styles.brandSub}>Gestão Inteligente</Typography>
            </Box>
          </Box>

          <Box sx={styles.nav}>
            {NAV_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.iconKey];
              const isActive =
                item.path &&
                (location.pathname === item.path ||
                  (item.path.startsWith("/configuracoes") &&
                    location.pathname.startsWith("/configuracoes")));
              return (
                <Box
                  key={item.label}
                  onClick={() => item.path && navigate(item.path)}
                  sx={{
                    ...styles.navItem,
                    ...(isActive ? styles.navActive : {}),
                    cursor: item.path ? "pointer" : "default",
                  }}
                >
                  {Icon && <Icon sx={{ fontSize: 18 }} />}
                  <Typography sx={styles.navLabel}>{item.label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

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

      {/* ══════════ CONTEÚDO ══════════ */}
      <Box sx={styles.main}>
        {/* Header */}
        <Box sx={styles.header}>
          <Typography sx={styles.pageTitle}>Configurações</Typography>
        </Box>

        {/* Layout interno */}
        <Box sx={styles.contentLayout}>
          <SettingsSubMenu active="alertas" />

          <Box sx={styles.cardsCol}>
            {/* Card Alertas de Vencimento */}
            <SectionCard title="Alertas de Vencimento">
              <ToggleRow
                label="Notificar vencimento de contratos"
                description="Receba alertas antes do vencimento de cada contrato"
                checked={alertas.vencimento}
                onChange={() => toggleAlerta("vencimento")}
              />
              <ToggleRow
                label="Notificar parcelas em atraso"
                description="Alertas para parcelas vencidas e não pagas"
                checked={alertas.parcelas_atraso}
                onChange={() => toggleAlerta("parcelas_atraso")}
              />

              <Box sx={styles.diasRow}>
                <Typography sx={styles.diasLabel}>Dias de antecedência</Typography>
                <TextField
                  type="number"
                  value={alertas.dias_vencimento}
                  onChange={(e) => handleDias("dias_vencimento", e.target.value)}
                  inputProps={{ min: 1, max: 90 }}
                  sx={styles.diasInput}
                  size="small"
                />
                <Typography sx={styles.diasSuffix}>dias antes</Typography>
              </Box>
            </SectionCard>

            {/* Card Alertas de Contratos */}
            <SectionCard title="Alertas de Contratos">
              <ToggleRow
                label="Alerta de renovação automática"
                description="Notificar quando um contrato estiver próximo da renovação"
                checked={alertas.renovacao}
                onChange={() => toggleAlerta("renovacao")}
              />
              <ToggleRow
                label="Alerta de encerramento de contrato"
                description="Notificar quando um contrato estiver prestes a encerrar"
                checked={alertas.encerramento}
                onChange={() => toggleAlerta("encerramento")}
              />
              <ToggleRow
                label="Notificar criação de novos contratos"
                description="Receba uma notificação quando um novo contrato for registrado"
                checked={alertas.novos_contratos}
                onChange={() => toggleAlerta("novos_contratos")}
              />

              <Box sx={styles.diasRow}>
                <Typography sx={styles.diasLabel}>Dias de antecedência</Typography>
                <TextField
                  type="number"
                  value={alertas.dias_contratos}
                  onChange={(e) => handleDias("dias_contratos", e.target.value)}
                  inputProps={{ min: 1, max: 90 }}
                  sx={styles.diasInput}
                  size="small"
                />
                <Typography sx={styles.diasSuffix}>dias antes</Typography>
              </Box>
            </SectionCard>

            {/* Card Canal de Notificação */}
            <SectionCard title="Canal de Notificação">
              <Typography sx={styles.canalDesc}>
                Escolha por onde você deseja receber as notificações do sistema.
              </Typography>

              <Box sx={styles.canalList}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={canais.email}
                      onChange={() => toggleCanal("email")}
                      size="small"
                      sx={styles.checkbox}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={styles.canalLabel}>E-mail</Typography>
                      <Typography sx={styles.canalSub}>
                        Alertas enviados para {storageUser?.email || "seu e-mail cadastrado"}
                      </Typography>
                    </Box>
                  }
                  sx={styles.canalItem}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={canais.sistema}
                      onChange={() => toggleCanal("sistema")}
                      size="small"
                      sx={styles.checkbox}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={styles.canalLabel}>Notificação no sistema</Typography>
                      <Typography sx={styles.canalSub}>
                        Avisos exibidos diretamente no ContractFlow
                      </Typography>
                    </Box>
                  }
                  sx={styles.canalItem}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={canais.whatsapp}
                      onChange={() => toggleCanal("whatsapp")}
                      size="small"
                      sx={styles.checkbox}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={styles.canalLabel}>WhatsApp</Typography>
                      <Typography sx={styles.canalSub}>
                        Mensagens via WhatsApp Business (em breve)
                      </Typography>
                    </Box>
                  }
                  sx={styles.canalItem}
                />
              </Box>
            </SectionCard>

            {/* Botão Salvar */}
            <Box sx={styles.saveRow}>
              <Button
                variant="contained"
                onClick={handleSave}
                startIcon={<SaveRoundedIcon />}
                sx={styles.btnSave}
              >
                Salvar Preferências
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* =========================================================
   ESTILOS
========================================================= */
const styles = {
  page: {
    display: "flex",
    height: "100dvh",
    overflow: "hidden",
    bgcolor: "#f4f7fb",
    fontFamily: "'Roboto', sans-serif",
  },

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
  },

  brand: { display: "flex", alignItems: "center", gap: 1.3, mb: 4, px: 0.5 },

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

  brandName: { color: "#fff", fontSize: "14.5px", fontWeight: 700, lineHeight: 1.2 },
  brandSub: { color: "rgba(255,255,255,0.42)", fontSize: "10px", mt: "1px" },

  nav: { display: "flex", flexDirection: "column", gap: "2px" },

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
    "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" },
  },

  navActive: {
    bgcolor: "rgba(255,255,255,0.12)",
    color: "#fff",
    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
  },

  navLabel: { fontSize: "13px", fontWeight: 500 },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 1.2,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    pt: 2.5,
    px: 0.5,
    mt: 2,
  },

  avatar: { width: 34, height: 34, fontSize: "12px", fontWeight: 700, bgcolor: "#3f7ff2", flexShrink: 0 },
  userName: { color: "#fff", fontSize: "12.5px", fontWeight: 600, lineHeight: 1.3 },
  userRole: { color: "rgba(255,255,255,0.42)", fontSize: "10.5px" },

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
    "&:hover": { color: "#fff" },
  },

  main: {
    marginLeft: "220px",
    width: "calc(100% - 220px)",
    height: "100dvh",
    overflowY: "auto",
    overflowX: "hidden",
    px: { xs: 2, sm: 3, md: 4 },
    py: 3.5,
    display: "flex",
    flexDirection: "column",
    gap: 2.5,
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 1.5,
  },

  pageTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#182338",
    letterSpacing: "-0.01em",
  },

  contentLayout: {
    display: "flex",
    gap: 3,
    alignItems: "flex-start",
  },

  cardsCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2.5,
    minWidth: 0,
  },

  /* Dias de antecedência */
  diasRow: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    mt: 2,
    pt: 1.5,
    borderTop: "1px solid #f2f4f8",
  },

  diasLabel: {
    fontSize: "13.5px",
    fontWeight: 500,
    color: "#27344b",
    flex: 1,
  },

  diasInput: {
    width: 90,
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      height: 38,
      "& fieldset": { borderColor: "#dce2eb" },
      "&:hover fieldset": { borderColor: "#aebbd0" },
      "&.Mui-focused fieldset": { borderColor: "#3f7ff2", borderWidth: "1.5px" },
    },
    "& input": { fontSize: "13.5px", textAlign: "center" },
  },

  diasSuffix: {
    fontSize: "13px",
    color: "#8b97aa",
    whiteSpace: "nowrap",
  },

  /* Canal */
  canalDesc: {
    fontSize: "13px",
    color: "#8b97aa",
    mb: 2,
  },

  canalList: {
    display: "flex",
    flexDirection: "column",
    gap: 0.5,
  },

  canalItem: {
    alignItems: "flex-start",
    py: 1,
    borderBottom: "1px solid #f2f4f8",
    "&:last-child": { borderBottom: "none" },
    mx: 0,
  },

  canalLabel: {
    fontSize: "13.5px",
    fontWeight: 500,
    color: "#27344b",
  },

  canalSub: {
    fontSize: "12px",
    color: "#8b97aa",
    mt: 0.2,
  },

  checkbox: {
    color: "#c3cad6",
    mt: "2px",
    "&.Mui-checked": { color: "#3f7ff2" },
  },

  /* Salvar */
  saveRow: {
    display: "flex",
    justifyContent: "flex-end",
    pb: 3,
  },

  btnSave: {
    height: 44,
    borderRadius: "8px",
    bgcolor: "#3f7ff2",
    color: "#fff",
    fontSize: "13.5px",
    fontWeight: 600,
    textTransform: "none",
    px: 3,
    boxShadow: "0 4px 12px rgba(63,127,242,0.18)",
    "&:hover": { bgcolor: "#316fe0" },
    "&.Mui-disabled": { bgcolor: "#9dbbf5", color: "#fff" },
  },
};

export default ConfigAlertas;

