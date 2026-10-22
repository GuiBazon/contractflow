import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Badge,
  Chip,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

/**
 * TopHeader
 * Props:
 *  - title  {string}  título da página
 *  - notificationCount {number} badge de notificações (padrão 0)
 */
function Header({ title = "Dashboard", notificationCount = 3 }) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <Box sx={styles.header}>
      {/* ── Título ── */}
      <Box sx={styles.titleBlock}>
        <Typography sx={styles.pageTitle}>{title}</Typography>
        <Typography sx={styles.pageDate}>{getTodayLabel()}</Typography>
      </Box>

      {/* ── Barra de busca ── */}
      <TextField
        size="small"
        placeholder="Buscar..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        sx={styles.searchField}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon sx={{ fontSize: 18, color: "#9baaba" }} />
            </InputAdornment>
          ),
        }}
      />

      {/* ── Ações ── */}
      <Box sx={styles.actions}>
        {/* Filtro geral */}
        <Chip
          icon={<TuneRoundedIcon sx={{ fontSize: "16px !important" }} />}
          label="Filtros"
          clickable
          sx={styles.filterChip}
        />

        {/* Notificações */}
        <IconButton sx={styles.notifBtn} aria-label="Notificações">
          <Badge
            badgeContent={notificationCount}
            sx={styles.badge}
          >
            <NotificationsRoundedIcon sx={{ fontSize: 22 }} />
          </Badge>
        </IconButton>
      </Box>
    </Box>
  );
}

function getTodayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const styles = {
  header: {
    height: "64px",
    minHeight: "64px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #eaeff6",
    display: "flex",
    alignItems: "center",
    gap: 2,
    px: 3,
    position: "sticky",
    top: 0,
    zIndex: 99,
    boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
  },

  titleBlock: {
    flex: 1,
    minWidth: 0,
  },

  pageTitle: {
    fontSize: "17px",
    fontWeight: 700,
    color: "#182338",
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  pageDate: {
    fontSize: "11px",
    color: "#9baaba",
    mt: 0.2,
    textTransform: "capitalize",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  searchField: {
    width: "240px",
    flexShrink: 0,

    "& .MuiOutlinedInput-root": {
      backgroundColor: "#f7f9fc",
      borderRadius: "10px",
      height: "38px",

      "& fieldset": { borderColor: "#e4eaf2" },
      "&:hover fieldset": { borderColor: "#bfccd9" },
      "&.Mui-focused fieldset": { borderColor: "#3f7ff2", borderWidth: "1.5px" },
    },

    "& input": {
      fontSize: "13px",
      color: "#182338",
      "&::placeholder": { color: "#9baaba" },
    },
  },

  actions: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    flexShrink: 0,
  },

  filterChip: {
    height: "34px",
    borderRadius: "9px",
    backgroundColor: "#f0f5ff",
    color: "#3f7ff2",
    fontSize: "12px",
    fontWeight: 600,
    border: "1px solid #d6e4ff",

    "& .MuiChip-icon": { color: "#3f7ff2" },

    "&:hover": {
      backgroundColor: "#e3edff",
    },
  },

  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: "10px",
    backgroundColor: "#f7f9fc",
    border: "1px solid #e4eaf2",
    color: "#5a6e8a",

    "&:hover": {
      backgroundColor: "#eef3fa",
    },
  },

  badge: {
    "& .MuiBadge-badge": {
      backgroundColor: "#ef4444",
      color: "#fff",
      fontSize: "9px",
      minWidth: "16px",
      height: "16px",
      top: 2,
      right: 2,
    },
  },
};

export default Header;
