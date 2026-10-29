import { useState, useEffect } from "react";
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
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import {
  Box,
  Typography,
  Avatar,
  TextField,
  Button,
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
   CONFIG PERFIL
========================================================= */
function ConfigPerfil() {
  const navigate = useNavigate();
  const location = useLocation();

  const storageUser = getStorageUser();
  const nomeUsuario = storageUser?.nome || "Usuário";
  const initials = getInitials(nomeUsuario);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    cargo: "",
    telefone: "",
    razao_social: "",
    cnpj: "",
    inscricao_estadual: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  /* Carregar dados do usuário logado */
  useEffect(() => {
    if (!storageUser?.id) return;

    setLoading(true);
    sheets
      .getPerfilUsuario(storageUser.id)
      .then((res) => {
        const u = res.data?.usuario || res.data || {};
        setForm({
          nome: u.nome || storageUser.nome || "",
          email: u.email || storageUser.email || "",
          cargo: u.cargo || "",
          telefone: u.telefone || "",
          razao_social: u.razao_social || "",
          cnpj: u.cnpj || "",
          inscricao_estadual: u.inscricao_estadual || "",
        });
      })
      .catch(() => {
        /* Endpoint pode não existir ainda — pré-preenche com dados do localStorage */
        setForm((prev) => ({
          ...prev,
          nome: storageUser.nome || "",
          email: storageUser.email || "",
        }));
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.nome.trim()) {
      showAlert("warning", "O campo Nome Completo é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      await sheets.updatePerfilUsuario(storageUser.id, {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        cargo: form.cargo,
        telefone: form.telefone,
        razao_social: form.razao_social,
        cnpj: form.cnpj,
        inscricao_estadual: form.inscricao_estadual,
      });

      /* Atualiza o localStorage para refletir o novo nome */
      const updated = { ...storageUser, nome: form.nome.trim(), email: form.email.trim().toLowerCase() };
      localStorage.setItem("usuario", JSON.stringify(updated));

      showAlert("success", "Perfil atualizado com sucesso!");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Não foi possível salvar as alterações.";
      showAlert("error", msg);
    } finally {
      setSaving(false);
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

        {/* Layout interno: submenu + cards */}
        <Box sx={styles.contentLayout}>
          <SettingsSubMenu active="perfil" />

          <Box sx={styles.cardsCol}>
            {loading ? (
              <Box sx={styles.loadingBox}>
                <CircularProgress size={32} sx={{ color: "#3f7ff2" }} />
              </Box>
            ) : (
              <>
                {/* Card Meu Perfil */}
                <SectionCard title="Meu Perfil">
                  {/* Avatar */}
                  <Box sx={styles.avatarSection}>
                    <Avatar sx={styles.profileAvatar}>{initials}</Avatar>
                    <Box sx={styles.avatarActions}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PhotoCameraOutlinedIcon />}
                        sx={styles.btnMudarFoto}
                        onClick={() =>
                          showAlert("info", "Upload de foto em breve.")
                        }
                      >
                        Mudar Foto
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        sx={styles.btnRemover}
                        onClick={() =>
                          showAlert("info", "Remoção de foto em breve.")
                        }
                      >
                        Remover
                      </Button>
                    </Box>
                  </Box>

                  {/* Campos */}
                  <Box sx={styles.fieldsGrid}>
                    <Box sx={styles.fieldWrap}>
                      <Typography sx={styles.label}>Nome Completo</Typography>
                      <TextField
                        fullWidth
                        name="nome"
                        placeholder="Seu nome completo"
                        value={form.nome}
                        onChange={onChange}
                        disabled={saving}
                        sx={styles.input}
                      />
                    </Box>

                    <Box sx={styles.fieldWrap}>
                      <Typography sx={styles.label}>E-mail</Typography>
                      <TextField
                        fullWidth
                        type="email"
                        name="email"
                        placeholder="seuemail@empresa.com"
                        value={form.email}
                        onChange={onChange}
                        disabled={saving}
                        sx={styles.input}
                      />
                    </Box>

                    <Box sx={styles.fieldWrap}>
                      <Typography sx={styles.label}>Cargo</Typography>
                      <TextField
                        fullWidth
                        name="cargo"
                        placeholder="Ex: Gerente de Contratos"
                        value={form.cargo}
                        onChange={onChange}
                        disabled={saving}
                        sx={styles.input}
                      />
                    </Box>

                    <Box sx={styles.fieldWrap}>
                      <Typography sx={styles.label}>Telefone</Typography>
                      <TextField
                        fullWidth
                        name="telefone"
                        placeholder="(11) 99999-9999"
                        value={form.telefone}
                        onChange={onChange}
                        disabled={saving}
                        sx={styles.input}
                      />
                    </Box>
                  </Box>
                </SectionCard>

                {/* Card Dados da Empresa */}
                <SectionCard title="Dados da Empresa">
                  <Box sx={styles.fieldsGrid}>
                    <Box sx={styles.fieldWrapFull}>
                      <Typography sx={styles.label}>Razão Social</Typography>
                      <TextField
                        fullWidth
                        name="razao_social"
                        placeholder="Nome da empresa"
                        value={form.razao_social}
                        onChange={onChange}
                        disabled={saving}
                        sx={styles.input}
                      />
                    </Box>

                    <Box sx={styles.fieldWrap}>
                      <Typography sx={styles.label}>CNPJ</Typography>
                      <TextField
                        fullWidth
                        name="cnpj"
                        placeholder="00.000.000/0000-00"
                        value={form.cnpj}
                        onChange={onChange}
                        disabled={saving}
                        sx={styles.input}
                      />
                    </Box>

                    <Box sx={styles.fieldWrap}>
                      <Typography sx={styles.label}>Inscrição Estadual</Typography>
                      <TextField
                        fullWidth
                        name="inscricao_estadual"
                        placeholder="000.000.000.000"
                        value={form.inscricao_estadual}
                        onChange={onChange}
                        disabled={saving}
                        sx={styles.input}
                      />
                    </Box>
                  </Box>
                </SectionCard>

                {/* Botão Salvar */}
                <Box sx={styles.saveRow}>
                  <Button
                    variant="contained"
                    disabled={saving}
                    onClick={handleSave}
                    startIcon={
                      saving ? (
                        <CircularProgress size={16} sx={{ color: "#fff" }} />
                      ) : (
                        <SaveRoundedIcon />
                      )
                    }
                    sx={styles.btnSave}
                  >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </Box>
              </>
            )}
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

  /* ── Sidebar ── */
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

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 1.3,
    mb: 4,
    px: 0.5,
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
    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
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
    "&:hover": { color: "#fff" },
  },

  /* ── Main ── */
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

  loadingBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    py: 6,
  },

  /* Avatar de perfil */
  avatarSection: {
    display: "flex",
    alignItems: "center",
    gap: 2.5,
    mb: 3,
    pb: 3,
    borderBottom: "1px solid #f2f4f8",
  },

  profileAvatar: {
    width: 80,
    height: 80,
    fontSize: "28px",
    fontWeight: 700,
    bgcolor: "#3f7ff2",
    flexShrink: 0,
  },

  avatarActions: {
    display: "flex",
    flexDirection: "column",
    gap: 0.8,
  },

  btnMudarFoto: {
    borderColor: "#3f7ff2",
    color: "#3f7ff2",
    fontSize: "12px",
    textTransform: "none",
    borderRadius: "8px",
    height: 34,
    "&:hover": { borderColor: "#316fe0", bgcolor: "#e8f0fe" },
  },

  btnRemover: {
    color: "#e0392b",
    fontSize: "12px",
    textTransform: "none",
    borderRadius: "8px",
    height: 34,
    "&:hover": { bgcolor: "#fff5f5" },
  },

  /* Campos */
  fieldsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 2,
    "@media (max-width:700px)": { gridTemplateColumns: "1fr" },
  },

  fieldWrap: {},

  fieldWrapFull: {
    gridColumn: "1 / -1",
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
      "&.Mui-focused fieldset": {
        borderColor: "#3f7ff2",
        borderWidth: "1.5px",
      },
    },
    "& input": { fontSize: "13.5px" },
  },

  /* Botão salvar */
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

export default ConfigPerfil;

