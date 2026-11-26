import { useNavigate } from "react-router-dom";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Box, Typography } from "@mui/material";

const MENU_ITEMS = [
  {
    key: "perfil",
    label: "Meu Perfil",
    icon: PersonOutlineRoundedIcon,
    path: "/configuracoes/perfil",
  },
  {
    key: "alertas",
    label: "Configurações de Alerta",
    icon: NotificationsNoneRoundedIcon,
    path: "/configuracoes/alertas",
  },
  {
    key: "seguranca",
    label: "Segurança",
    icon: LockOutlinedIcon,
    path: "/configuracoes/seguranca",
  },
];

function SettingsSubMenu({ active }) {
  const navigate = useNavigate();

  return (
    <Box sx={styles.menu}>
      <Typography sx={styles.menuTitle}>Configurações</Typography>

      {MENU_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;

        return (
          <Box
            key={item.key}
            onClick={() => navigate(item.path)}
            sx={{
              ...styles.menuItem,
              ...(isActive ? styles.menuItemActive : {}),
            }}
          >
            <Icon
              sx={{
                fontSize: 18,
                color: isActive ? "#3f7ff2" : "#9aa5b8",
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                ...styles.menuLabel,
                color: isActive ? "#3f7ff2" : "#67728a",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

const styles = {
  menu: {
    width: { xs: "100%", md: 220 },
    minWidth: { xs: 0, md: 220 },
    bgcolor: "#fff",
    border: "1px solid #eef1f6",
    borderRadius: "12px",
    p: { xs: 1, md: 1.5 },
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    alignSelf: "flex-start",
    flexShrink: 0,
    display: { xs: "flex", md: "block" },
    flexDirection: { xs: "row", md: "column" },
    gap: { xs: 0.75, md: 0 },
    overflowX: { xs: "auto", md: "visible" },
    WebkitOverflowScrolling: "touch",
  },

  menuTitle: {
    display: { xs: "none", md: "block" },
    fontSize: "11px",
    fontWeight: 700,
    color: "#9aa5b8",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    px: 1.5,
    mb: 1,
    mt: 0.5,
  },

  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    px: 1.5,
    py: { xs: 1, md: 1.2 },
    borderRadius: "8px",
    cursor: "pointer",
    whiteSpace: { xs: "nowrap", md: "normal" },
    flexShrink: 0,
    transition: "all 0.15s",
    "&:hover": { bgcolor: "#f4f7fb" },
  },

  menuItemActive: {
    bgcolor: "#e8f0fe",
    "&:hover": { bgcolor: "#dde9fd" },
  },

  menuLabel: {
    fontSize: "13px",
    lineHeight: 1.4,
  },
};

export default SettingsSubMenu;

