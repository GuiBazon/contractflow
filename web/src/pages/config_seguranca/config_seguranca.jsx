import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import sheets from "../../axios/axios";

import SnackBar from "../../components/snack_bar/snack_bar";
import SettingsSubMenu from "../../components/settings_sub_menu/settings_sub_menu";
import SectionCard from "../../components/section_card/section_card";

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
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Visibility from "@mui/icons-material/Visibility";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";
import PhoneAndroidRoundedIcon from "@mui/icons-material/PhoneAndroidRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

import {
  Box,
  Typography,
  Avatar,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
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

/* ─── Dados mockados ─────────────────────────────────────── */
const SESSOES_MOCK = [
  {
    device: "Chrome · Windows 10",
    ip: "192.168.1.105",
    date: "Agora (sessão atual)",
    isActive: true,
  },
  {
    device: "Mobile · Android",
    ip: "177.84.22.11",
    date: "Ontem, 18:32",
    isActive: false,
  },
];

const LOG_MOCK = [
  {
    action: "Login realizado",
    detail: "Chrome · Windows 10 · 192.168.1.105",
    time: "Hoje, 13:44",
  },
  {
    action: "Contrato criado",
    detail: "Contrato #CF-2024-001",
    time: "Ontem, 10:15",
  },
  {
    action: "Senha alterada",
    detail: "Alteração de credenciais",
    time: "15/10/2024, 09:30",
  },
  {
    action: "Novo cliente cadastrado",
    detail: "Cliente: Empresa XYZ Ltda",
    time: "10/10/2024, 16:22",
  },
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
   CONFIG SEGURANÇA
========================================================= */
function ConfigSeguranca() {
  const navigate = useNavigate();
  const location = useLocation();

  const storageUser = getStorageUser();
  const nomeUsuario = storageUser?.nome || "Usuário";
  const initials = getInitials(nomeUsuario);

  /* ── Senha ── */
  const [senha, setSenha] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const [showSenha, setShowSenha] = useState({
    senhaAtual: false,
    novaSenha: false,
    confirmarSenha: false,
  });

  const [savingSenha, setSavingSenha] = useState(false);

  /* ── 2FA ── */
  const [doisFatores] = useState(false);

  /* ── Alerts ── */
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

  function onSenhaChange(e) {
    const { name, value } = e.target;
    setSenha((prev) => ({ ...prev, [name]: value }));
  }

  function toggleShow(field) {
    setShowSenha((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleAtualizarSenha() {
    const { senhaAtual, novaSenha, confirmarSenha } = senha;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      showAlert("warning", "Preencha todos os campos de senha.");
      return;
    }
    if (novaSenha.length < 6) {
      showAlert("warning", "A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      showAlert("error", "A nova senha e a confirmação não coincidem.");
      return;
    }

    setSavingSenha(true);
    try {
      await sheets.updateSenha({ senhaAtual, novaSenha });
      showAlert("success", "Senha atualizada com sucesso!");
      setSenha({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Não foi possível atualizar a senha.";
      showAlert("error", msg);
    } finally {
      setSavingSenha(false);
    }
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
          <SettingsSubMenu active="seguranca" />

          <Box sx={styles.cardsCol}>
            {/* Card Alterar Senha */}
            <SectionCard title="Alterar Senha">
              <Box sx={styles.senhaForm}>
                {/* Senha Atual */}
                <Box>
                  <Typography sx={styles.label}>Senha Atual</Typography>
                  <TextField
                    fullWidth
                    type={showSenha.senhaAtual ? "text" : "password"}
                    name="senhaAtual"
                    placeholder="Digite sua senha atual"
                    value={senha.senhaAtual}
                    onChange={onSenhaChange}
                    disabled={savingSenha}
                    sx={styles.input}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            onClick={() => toggleShow("senhaAtual")}
                            edge="end"
                            aria-label={showSenha.senhaAtual ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showSenha.senhaAtual ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {/* Nova Senha */}
                <Box>
                  <Typography sx={styles.label}>Nova Senha</Typography>
                  <TextField
                    fullWidth
                    type={showSenha.novaSenha ? "text" : "password"}
                    name="novaSenha"
                    placeholder="Mínimo 6 caracteres"
                    value={senha.novaSenha}
                    onChange={onSenhaChange}
                    disabled={savingSenha}
                    sx={styles.input}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            onClick={() => toggleShow("novaSenha")}
                            edge="end"
                            aria-label={showSenha.novaSenha ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showSenha.novaSenha ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {/* Confirmar Senha */}
                <Box>
                  <Typography sx={styles.label}>Confirmar Nova Senha</Typography>
                  <TextField
                    fullWidth
                    type={showSenha.confirmarSenha ? "text" : "password"}
                    name="confirmarSenha"
                    placeholder="Repita a nova senha"
                    value={senha.confirmarSenha}
                    onChange={onSenhaChange}
                    disabled={savingSenha}
                    sx={styles.input}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            onClick={() => toggleShow("confirmarSenha")}
                            edge="end"
                            aria-label={showSenha.confirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showSenha.confirmarSenha ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box sx={styles.senhaBtnRow}>
                  <Button
                    variant="contained"
                    disabled={savingSenha}
                    onClick={handleAtualizarSenha}
                    startIcon={
                      savingSenha ? (
                        <CircularProgress size={16} sx={{ color: "#fff" }} />
                      ) : (
                        <LockResetRoundedIcon />
                      )
                    }
                    sx={styles.btnSave}
                  >
                    {savingSenha ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
                </Box>
              </Box>
            </SectionCard>

            {/* Card 2FA */}
            <SectionCard
              title="Autenticação em Duas Etapas"
              action={
                <Box
                  sx={{
                    ...styles.badge2FA,
                    ...(doisFatores ? styles.badge2FAAtiva : styles.badge2FAInativa),
                  }}
                >
                  {doisFatores ? "Ativada" : "Desativada"}
                </Box>
              }
            >
              <Typography sx={styles.twoFADesc}>
                A autenticação em duas etapas adiciona uma camada extra de segurança à
                sua conta, exigindo um código de verificação além da sua senha no login.
              </Typography>

              <Button
                variant="outlined"
                onClick={() =>
                  showAlert("info", "Autenticação em duas etapas estará disponível em breve.")
                }
                sx={styles.btn2FA}
              >
                {doisFatores ? "Desativar Autenticação" : "Ativar Autenticação"}
              </Button>
            </SectionCard>

            {/* Card Sessões Ativas (mockado) */}
            <SectionCard title="Sessões Ativas">
              <Box sx={styles.sessionList}>
                {SESSOES_MOCK.map((sessao, i) => {
                  const DeviceIcon = sessao.isActive
                    ? ComputerRoundedIcon
                    : PhoneAndroidRoundedIcon;
                  return (
                    <Box key={i} sx={styles.sessionRow}>
                      <Box
                        sx={{
                          ...styles.sessionIconBox,
                          bgcolor: sessao.isActive ? "#e7f9ef" : "#f0f2f7",
                        }}
                      >
                        <DeviceIcon
                          sx={{
                            fontSize: 18,
                            color: sessao.isActive ? "#1f9d55" : "#8b97aa",
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={styles.sessionDevice}>
                          {sessao.device}
                          {sessao.isActive && (
                            <Box component="span" sx={styles.sessionCurrentBadge}>
                              atual
                            </Box>
                          )}
                        </Typography>
                        <Typography sx={styles.sessionMeta}>
                          IP {sessao.ip} · {sessao.date}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </SectionCard>

            {/* Card Log de Atividades (mockado) */}
            <SectionCard title="Log de Atividades">
              <Box sx={styles.logList}>
                {LOG_MOCK.map((entry, i) => (
                  <Box key={i} sx={styles.logRow}>
                    <Box sx={styles.logIconBox}>
                      <HistoryRoundedIcon sx={{ fontSize: 16, color: "#9aa5b8" }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={styles.logAction}>{entry.action}</Typography>
                      <Typography sx={styles.logDetail}>{entry.detail}</Typography>
                    </Box>
                    <Typography sx={styles.logTime}>{entry.time}</Typography>
                  </Box>
                ))}
              </Box>
            </SectionCard>
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
    pb: 3,
  },

  /* Senha */
  senhaForm: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#27344b",
    mb: 0.8,
  },

  input: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#fff",
      borderRadius: "8px",
      height: "44px",
      "& fieldset": { borderColor: "#dce2eb" },
      "&:hover fieldset": { borderColor: "#aebbd0" },
      "&.Mui-focused fieldset": { borderColor: "#3f7ff2", borderWidth: "1.5px" },
    },
    "& input": { fontSize: "13.5px" },
  },

  senhaBtnRow: {
    display: "flex",
    justifyContent: "flex-end",
    mt: 0.5,
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

  /* 2FA */
  badge2FA: {
    fontSize: "11px",
    fontWeight: 700,
    borderRadius: "6px",
    px: "10px",
    py: "4px",
    letterSpacing: "0.02em",
  },

  badge2FAInativa: {
    bgcolor: "#fdf3e0",
    color: "#c8850f",
  },

  badge2FAAtiva: {
    bgcolor: "#e7f9ef",
    color: "#1f9d55",
  },

  twoFADesc: {
    fontSize: "13.5px",
    color: "#67728a",
    lineHeight: 1.6,
    mb: 2.5,
  },

  btn2FA: {
    borderColor: "#3f7ff2",
    color: "#3f7ff2",
    fontSize: "13px",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    height: 40,
    "&:hover": { borderColor: "#316fe0", bgcolor: "#e8f0fe" },
  },

  /* Sessões */
  sessionList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },

  sessionRow: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    py: 1.5,
    borderBottom: "1px solid #f2f4f8",
    "&:last-child": { borderBottom: "none" },
  },

  sessionIconBox: {
    width: 38,
    height: 38,
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  sessionDevice: {
    fontSize: "13.5px",
    fontWeight: 600,
    color: "#27344b",
    display: "flex",
    alignItems: "center",
    gap: 0.8,
  },

  sessionCurrentBadge: {
    fontSize: "10px",
    fontWeight: 700,
    bgcolor: "#e8f0fe",
    color: "#3f7ff2",
    borderRadius: "4px",
    px: "6px",
    py: "2px",
  },

  sessionMeta: {
    fontSize: "12px",
    color: "#8b97aa",
    mt: 0.3,
  },

  /* Log */
  logList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },

  logRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 1.5,
    py: 1.5,
    borderBottom: "1px solid #f2f4f8",
    "&:last-child": { borderBottom: "none" },
  },

  logIconBox: {
    width: 30,
    height: 30,
    borderRadius: "8px",
    bgcolor: "#f4f7fb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    mt: "2px",
  },

  logAction: {
    fontSize: "13.5px",
    fontWeight: 600,
    color: "#27344b",
  },

  logDetail: {
    fontSize: "12px",
    color: "#8b97aa",
    mt: 0.2,
  },

  logTime: {
    fontSize: "11.5px",
    color: "#8b97aa",
    whiteSpace: "nowrap",
    flexShrink: 0,
    mt: "3px",
  },
};

export default ConfigSeguranca;

