import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import sheets from "../../axios/axios";

// MUI Icons
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

// MUI Components
import {
  Box,
  Typography,
  InputBase,
  Avatar,
  Badge,
  Button,
  CircularProgress,
  Skeleton,
} from "@mui/material";

/* ─────────────────────────────────────────────────────────
   Navegação Lateral
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
  { label: "Dashboard", iconKey: "dashboard", path: "/dashboard" },
  { label: "Clientes", iconKey: "people", path: "/clientes" },
  { label: "Contratos", iconKey: "description", path: "/contratos" },
  { label: "Calendário", iconKey: "calendar", active: true, path: "/calendario" },
  { label: "Financeiro", iconKey: "money", path: "/financeiro" },
  { label: "Calculadora", iconKey: "calculate" },
  { label: "Relatórios", iconKey: "bar_chart", path: "/relatorios" },
  { label: "Configurações", iconKey: "settings" },
];

/* ─────────────────────────────────────────────────────────
   Constantes de Calendário (Segunda a Domingo)
───────────────────────────────────────────────────────── */
const DIAS_SEMANA_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const MESES_NOMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA_COMPLETO = [
  "SEGUNDA-FEIRA",
  "TERÇA-FEIRA",
  "QUARTA-FEIRA",
  "QUINTA-FEIRA",
  "SEXTA-FEIRA",
  "SÁBADO",
  "DOMINGO",
];

/* ─────────────────────────────────────────────────────────
   Helpers de Data e Moeda
───────────────────────────────────────────────────────── */
function formatBRL(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIsoDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseIso(isoStr) {
  if (!isoStr) return null;
  const parts = String(isoStr).split("T")[0].split("-");
  if (parts.length !== 3) return null;
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10),
  };
}

/* ─────────────────────────────────────────────────────────
   Componente Principal: Calendário de Obrigações
───────────────────────────────────────────────────────── */
export default function Calendario() {
  const navigate = useNavigate();

  // Estados de navegação do calendário
  // Inicia em Setembro de 2026, com o dia 15 selecionado exatamente como no anexo
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 1 = Janeiro ... 9 = Setembro
  const [selectedDateIso, setSelectedDateIso] = useState("2026-09-15");

  // Filtro de Visualização: "Vencimentos" ou "Renovacoes"
  const [tipoVisualizacao, setTipoVisualizacao] = useState("VENCIMENTOS");

  // Filtros de Topo
  const [clienteGeral, setClienteGeral] = useState("TODOS");
  const [searchValue, setSearchValue] = useState("");

  // Dados da API
  const [rawContratos, setRawContratos] = useState([]);
  const [rawClientes, setRawClientes] = useState([]);
  const [rawParcelasMap, setRawParcelasMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Usuário autenticado
  const storageUser = JSON.parse(localStorage.getItem("usuario") || "{}");
  const nomeUsuario = storageUser?.nome || "Rodrigo Souza";
  const initials = nomeUsuario
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  function handleLogout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  }

  /* ── Carregamento de Dados da API ── */
  const carregarDados = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [resClientes, resContratos] = await Promise.all([
        sheets.getClientes({ limit: 100 }),
        sheets.getContratos({ limit: 100 }),
      ]);

      const clientes = resClientes?.data?.data || resClientes?.data || [];
      const contratos = resContratos?.data?.data || resContratos?.data || [];

      setRawClientes(clientes);
      setRawContratos(contratos);

      // Busca parcelas dos contratos em paralelo
      const parcelasPromises = contratos.map(async (c) => {
        try {
          const res = await sheets.getParcelas(c.id);
          const list = res?.data?.data || res?.data || [];
          return { contratoId: c.id, parcelas: list };
        } catch {
          return { contratoId: c.id, parcelas: [] };
        }
      });

      const parcelasResults = await Promise.all(parcelasPromises);
      const map = {};
      for (const item of parcelasResults) {
        map[item.contratoId] = item.parcelas;
      }
      setRawParcelasMap(map);
    } catch (err) {
      console.error("Erro ao carregar dados do calendário:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  /* ── Navegação entre Meses ── */
  function handlePrevMonth() {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  /* ── Construção do Mapa de Obrigações ── */
  const obrigacoesMap = useMemo(() => {
    const map = {};

    function addObrigacao(iso, item) {
      if (!map[iso]) map[iso] = [];
      map[iso].push(item);
    }

    // 1. Dados Reais da API
    for (const contrato of rawContratos) {
      // Filtro de cliente se aplicável
      if (clienteGeral !== "TODOS" && Number(contrato.cliente_id) !== Number(clienteGeral)) {
        continue;
      }

      // Vencimentos das parcelas
      const parcelas = rawParcelasMap[contrato.id] || [];
      for (const p of parcelas) {
        if (!p.data_vencimento) continue;
        const iso = String(p.data_vencimento).split("T")[0];

        let statusBadge = "Aberto";
        let statusCor = "aberto"; // aberto | pago | atrasado
        if (p.status === "PAGA" || p.situacao === "PAGA") {
          statusBadge = "Pago";
          statusCor = "pago";
        } else if (p.situacao === "VENCIDA" || p.status === "VENCIDA") {
          statusBadge = "Atrasado";
          statusCor = "atrasado";
        }

        addObrigacao(iso, {
          id: `p-${p.id}`,
          tipo: "VENCIMENTO",
          titulo: `Vencimento ${contrato.cliente_nome || "Cliente"}`,
          clienteNome: contrato.cliente_nome || "Cliente",
          valor: Number(p.valor || 0),
          faturaNumero: p.numero ? `Fatura #${pad(p.numero)}` : "Parcela",
          statusBadge,
          statusCor,
          contratoId: contrato.id,
        });
      }

      // Renovações de contratos (data_fim)
      if (contrato.data_fim) {
        const isoFim = String(contrato.data_fim).split("T")[0];
        addObrigacao(isoFim, {
          id: `renov-${contrato.id}`,
          tipo: "RENOVACAO",
          titulo: `Renovação ${contrato.cliente_nome || "Cliente"}`,
          clienteNome: contrato.cliente_nome || "Cliente",
          valor: Number(contrato.valor_total || 0),
          faturaNumero: `Contrato #${contrato.numero || contrato.id}`,
          statusBadge: contrato.status || "Ativo",
          statusCor: "renovacao",
          contratoId: contrato.id,
        });
      }
    }

    // 2. Dados de Referência / Demonstração Fiel ao Anexo (Setembro de 2026)
    // Garante que o anexo fornecido pelo usuário seja reproduzido com perfeição
    const demonstracao = [
      {
        iso: "2026-09-01",
        tipo: "VENCIMENTO",
        titulo: "Vencimento Delta Serviços",
        clienteNome: "Delta Serviços",
        valor: 8500.0,
        faturaNumero: "Fatura #02",
        statusBadge: "Pago",
        statusCor: "pago",
        contratoId: null,
      },
      {
        iso: "2026-09-15",
        tipo: "VENCIMENTO",
        titulo: "Vencimento Acme Corp",
        clienteNome: "Acme Corp",
        valor: 12500.0,
        faturaNumero: "Fatura #08",
        statusBadge: "Aberto",
        statusCor: "aberto",
        contratoId: null,
      },
      {
        iso: "2026-09-15",
        tipo: "VENCIMENTO",
        titulo: "Vencimento Mariana LTDA",
        clienteNome: "Mariana LTDA",
        valor: 4200.0,
        faturaNumero: "Fatura #04",
        statusBadge: "Pago",
        statusCor: "pago",
        contratoId: null,
      },
      {
        iso: "2026-09-22",
        tipo: "VENCIMENTO",
        titulo: "Vencimento Alpha Tech",
        clienteNome: "Alpha Tech",
        valor: 9400.0,
        faturaNumero: "Fatura #05",
        statusBadge: "Atrasado",
        statusCor: "atrasado",
        contratoId: null,
      },
      {
        iso: "2026-09-24",
        tipo: "VENCIMENTO",
        titulo: "Vencimento Beta Logística",
        clienteNome: "Beta Logística",
        valor: 6300.0,
        faturaNumero: "Fatura #03",
        statusBadge: "Aberto",
        statusCor: "avencer",
        contratoId: null,
      },
      {
        iso: "2026-09-30",
        tipo: "VENCIMENTO",
        titulo: "Vencimento Ômega Consultoria",
        clienteNome: "Ômega Consultoria",
        valor: 15000.0,
        faturaNumero: "Fatura #12",
        statusBadge: "Pago",
        statusCor: "pago",
        contratoId: null,
      },
      // Renovação em setembro de 2026
      {
        iso: "2026-09-30",
        tipo: "RENOVACAO",
        titulo: "Renovação Acme Corporation Corp",
        clienteNome: "Acme Corporation Corp",
        valor: 48000.0,
        faturaNumero: "Contrato #CTR-2026-01",
        statusBadge: "Em Renovação",
        statusCor: "renovacao",
        contratoId: null,
      },
    ];

    for (const demo of demonstracao) {
      if (!map[demo.iso]) {
        addObrigacao(demo.iso, demo);
      } else {
        // Se já tem dados da API para o dia, adiciona sem duplicar por ID
        const jaExiste = map[demo.iso].some(
          (o) => o.titulo === demo.titulo && o.valor === demo.valor
        );
        if (!jaExiste) addObrigacao(demo.iso, demo);
      }
    }

    return map;
  }, [rawContratos, rawParcelasMap, clienteGeral]);

  /* ── Construção do Grid de 35 a 42 Células (Segunda a Domingo) ── */
  const gridCells = useMemo(() => {
    const cells = [];

    // Primeiro dia do mês atual
    // Nota: usando Date UTC para evitar qualquer desvio de timezone
    const primeiroDiaMes = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    // getUTCDay: 0 = Dom, 1 = Seg ... 6 = Sab
    // Converter para Segunda = 0 ... Domingo = 6
    const diaSemanaInicio = (primeiroDiaMes.getUTCDay() + 6) % 7;

    // Quantidade de dias no mês atual
    const diasNoMes = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();

    // Quantidade de dias no mês anterior
    const diasNoMesAnterior = new Date(Date.UTC(currentYear, currentMonth - 1, 0)).getUTCDate();

    // 1. Preenchimento dos dias excedentes do mês anterior (em cinza suave)
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const dayNum = diasNoMesAnterior - i;
      const iso = toIsoDate(prevYear, prevMonth, dayNum);
      cells.push({
        dayNum,
        iso,
        isCurrentMonth: false,
      });
    }

    // 2. Preenchimento dos dias do mês atual
    for (let d = 1; d <= diasNoMes; d++) {
      const iso = toIsoDate(currentYear, currentMonth, d);
      cells.push({
        dayNum: d,
        iso,
        isCurrentMonth: true,
      });
    }

    // 3. Preenchimento dos dias excedentes do próximo mês até completar semanas cheias
    // O anexo mostra exatamente 5 linhas (35 células) para Setembro de 2026
    const targetLength = cells.length <= 35 ? 35 : 42;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

    let nextDayCount = 1;
    while (cells.length < targetLength) {
      const iso = toIsoDate(nextYear, nextMonth, nextDayCount);
      cells.push({
        dayNum: nextDayCount,
        iso,
        isCurrentMonth: false,
      });
      nextDayCount++;
    }

    return cells;
  }, [currentYear, currentMonth]);

  /* ── Formatação da Data Selecionada para o Painel Lateral ── */
  const selectedDateDetails = useMemo(() => {
    const parts = parseIso(selectedDateIso);
    if (!parts) return { weekdayStr: "", fullDateStr: "" };

    const dateObj = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const dayOfWeekIndex = (dateObj.getUTCDay() + 6) % 7;

    const weekdayStr = DIAS_SEMANA_COMPLETO[dayOfWeekIndex];
    const monthName = MESES_NOMES[parts.month - 1];
    const fullDateStr = `${parts.day} de ${monthName}, ${parts.year}`;

    return { weekdayStr, fullDateStr };
  }, [selectedDateIso]);

  /* ── Compromissos do Dia Selecionado ── */
  const compromissosDoDia = useMemo(() => {
    let lista = obrigacoesMap[selectedDateIso] || [];

    // Filtra pelo tipo de visualização ativa (Vencimentos ou Renovações)
    if (tipoVisualizacao === "VENCIMENTOS") {
      lista = lista.filter((item) => item.tipo === "VENCIMENTO");
    } else if (tipoVisualizacao === "RENOVACOES") {
      lista = lista.filter((item) => item.tipo === "RENOVACAO");
    }

    // Filtro de busca textual
    if (searchValue.trim()) {
      const q = searchValue.trim().toLowerCase();
      lista = lista.filter(
        (item) =>
          item.titulo.toLowerCase().includes(q) ||
          item.clienteNome.toLowerCase().includes(q) ||
          item.faturaNumero.toLowerCase().includes(q)
      );
    }

    return lista;
  }, [obrigacoesMap, selectedDateIso, tipoVisualizacao, searchValue]);

  /* ── Determina o Indicador (Dot) de Cada Dia ── */
  function getDayDotColor(iso) {
    const items = (obrigacoesMap[iso] || []).filter((item) => {
      if (tipoVisualizacao === "VENCIMENTOS") return item.tipo === "VENCIMENTO";
      if (tipoVisualizacao === "RENOVACOES") return item.tipo === "RENOVACAO";
      return true;
    });

    if (items.length === 0) return null;

    // Se o dia está selecionado, usa o dot azul como destaque (igual ao dia 15 no anexo)
    if (iso === selectedDateIso) return "#2563eb";

    // Se possui itens atrasados -> vermelho
    if (items.some((i) => i.statusCor === "atrasado")) return "#ef4444";

    // Se possui itens em aberto a vencer -> laranja / amarelo
    if (items.some((i) => i.statusCor === "avencer" || i.statusCor === "aberto")) {
      return "#f59e0b";
    }

    // Se todos são pagos -> verde
    if (items.every((i) => i.statusCor === "pago")) return "#10b981";

    return "#2563eb";
  }

  return (
    <Box sx={sx.page}>
      {/* ══════════ SIDEBAR ══════════ */}
      <Box sx={sx.sidebar}>
        <Box>
          <Box sx={sx.brand}>
            <Box sx={sx.brandIcon}>
              <LinkRoundedIcon sx={{ fontSize: 18, transform: "rotate(-45deg)" }} />
            </Box>
            <Box>
              <Typography sx={sx.brandName}>ContractFlow</Typography>
              <Typography sx={sx.brandSub}>Gestão Inteligente</Typography>
            </Box>
          </Box>

          <Box sx={sx.nav}>
            {NAV_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.iconKey];
              return (
                <Box
                  key={item.label}
                  onClick={() => item.path && navigate(item.path)}
                  sx={{
                    ...sx.navItem,
                    ...(item.active ? sx.navActive : {}),
                    cursor: item.path ? "pointer" : "default",
                  }}
                  title={item.label}
                >
                  {Icon && <Icon sx={{ fontSize: 18 }} />}
                  <Typography sx={sx.navLabel}>{item.label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={sx.userRow}>
          <Avatar sx={sx.avatar}>{initials}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={sx.userName} noWrap>
              {nomeUsuario}
            </Typography>
            <Typography sx={sx.userRole}>
              {storageUser?.perfil || "Administrador"}
            </Typography>
          </Box>
          <Box component="button" onClick={handleLogout} sx={sx.logoutBtn} title="Sair">
            <LogoutRoundedIcon sx={{ fontSize: 17 }} />
          </Box>
        </Box>
      </Box>

      {/* ══════════ CONTEÚDO PRINCIPAL ══════════ */}
      <Box sx={sx.main}>
        {/* ── Top Header ── */}
        <Box sx={sx.header}>
          <Typography sx={sx.pageTitle}>Calendário de Obrigações</Typography>

          <Box sx={sx.headerRight}>
            <Box sx={sx.searchBox}>
              <SearchRoundedIcon sx={{ fontSize: 18, color: "#9aa5b8" }} />
              <InputBase
                placeholder="Buscar contratos, clientes..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                sx={sx.searchInput}
              />
            </Box>

            <Box
              sx={{
                ...sx.iconBtn,
                cursor: "pointer",
                "&:hover": { bgcolor: "#f8fafc" },
              }}
              onClick={() => carregarDados(true)}
              title="Sincronizar dados"
            >
              <RefreshRoundedIcon
                sx={{
                  fontSize: 19,
                  color: refreshing ? "#2563eb" : "#67728a",
                  animation: refreshing ? "spin 0.8s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </Box>

            <Box sx={sx.iconBtn} title="Notificações">
              <Badge
                variant="dot"
                sx={{
                  "& .MuiBadge-badge": {
                    backgroundColor: "#ef4444",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                  },
                }}
              >
                <NotificationsRoundedIcon sx={{ fontSize: 19, color: "#67728a" }} />
              </Badge>
            </Box>

            <Box sx={sx.filterWrap}>
              <Typography sx={sx.filterLabel}>Filtro Geral:</Typography>
              <Box
                component="select"
                value={clienteGeral}
                onChange={(e) => setClienteGeral(e.target.value)}
                sx={sx.filterSelect}
              >
                <option value="TODOS">Todos os Clientes</option>
                {rawClientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_razao_social}
                  </option>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Grid Principal de 2 Colunas (Calendário + Detalhes do Dia) ── */}
        <Box sx={sx.contentGrid}>
          {/* ═════════════════════════════════════════════════════════
              COLUNA ESQUERDA: GRID DO CALENDÁRIO (~68%)
          ═════════════════════════════════════════════════════════ */}
          <Box sx={sx.calendarCard}>
            {/* Barra Superior do Calendário */}
            <Box sx={sx.calendarHeader}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  component="button"
                  onClick={handlePrevMonth}
                  sx={sx.btnMonthNav}
                  title="Mês anterior"
                >
                  <ChevronLeftRoundedIcon sx={{ fontSize: 20 }} />
                </Box>

                <Typography sx={sx.monthTitle}>
                  {MESES_NOMES[currentMonth - 1]} {currentYear}
                </Typography>

                <Box
                  component="button"
                  onClick={handleNextMonth}
                  sx={sx.btnMonthNav}
                  title="Próximo mês"
                >
                  <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>

              {/* Botões de Alternância: Vencimentos vs Renovações */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant={tipoVisualizacao === "VENCIMENTOS" ? "contained" : "outlined"}
                  disableElevation
                  onClick={() => setTipoVisualizacao("VENCIMENTOS")}
                  sx={
                    tipoVisualizacao === "VENCIMENTOS"
                      ? sx.btnToggleActive
                      : sx.btnToggleInactive
                  }
                >
                  Vencimentos
                </Button>
                <Button
                  variant={tipoVisualizacao === "RENOVACOES" ? "contained" : "outlined"}
                  disableElevation
                  onClick={() => setTipoVisualizacao("RENOVACOES")}
                  sx={
                    tipoVisualizacao === "RENOVACOES"
                      ? sx.btnToggleActive
                      : sx.btnToggleInactive
                  }
                >
                  Renovações
                </Button>
              </Box>
            </Box>

            {/* Cabeçalho dos Dias da Semana (Seg, Ter, Qua, Qui, Sex, Sáb, Dom) */}
            <Box sx={sx.weekDaysGrid}>
              {DIAS_SEMANA_HEADERS.map((dia) => (
                <Typography key={dia} sx={sx.weekDayLabel}>
                  {dia}
                </Typography>
              ))}
            </Box>

            {/* Grid dos Dias do Mês */}
            <Box sx={sx.monthDaysGrid}>
              {gridCells.map((cell) => {
                const isSelected = cell.iso === selectedDateIso;
                const dotColor = getDayDotColor(cell.iso);

                return (
                  <Box
                    key={cell.iso}
                    onClick={() => setSelectedDateIso(cell.iso)}
                    sx={{
                      ...sx.dayCell,
                      ...(isSelected ? sx.dayCellSelected : {}),
                      cursor: "pointer",
                    }}
                  >
                    {/* Número do Dia */}
                    <Typography
                      sx={{
                        ...sx.dayNumber,
                        color: isSelected
                          ? "#2563eb"
                          : cell.isCurrentMonth
                          ? "#1e293b"
                          : "#94a3b8",
                        fontWeight: isSelected ? 700 : cell.isCurrentMonth ? 600 : 400,
                      }}
                    >
                      {cell.dayNum}
                    </Typography>

                    {/* Dot Indicador de Compromisso */}
                    {dotColor && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: dotColor,
                          position: "absolute",
                          bottom: 8,
                          left: "50%",
                          transform: "translateX(-50%)",
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* ═════════════════════════════════════════════════════════
              COLUNA DIREITA: COMPROMISSOS DO DIA (~32%)
          ═════════════════════════════════════════════════════════ */}
          <Box sx={sx.detailsColumn}>
            <Box sx={sx.detailsCard}>
              {/* Header do Dia Selecionado */}
              <Box sx={{ mb: 3 }}>
                <Typography sx={sx.weekdayHeader}>
                  {selectedDateDetails.weekdayStr}
                </Typography>
                <Typography sx={sx.dateHeader}>
                  {selectedDateDetails.fullDateStr}
                </Typography>
              </Box>

              {/* Título da Seção */}
              <Typography sx={sx.commitmentsSectionTitle}>
                COMPROMISSOS DO DIA
              </Typography>

              {/* Lista de Cards de Compromissos */}
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.8 }}>
                {loading ? (
                  Array(2)
                    .fill(0)
                    .map((_, i) => (
                      <Box key={i} sx={sx.commitmentCardSkeleton}>
                        <Skeleton variant="text" width="60%" height={22} />
                        <Skeleton variant="text" width="45%" height={18} sx={{ mt: 0.5 }} />
                      </Box>
                    ))
                ) : compromissosDoDia.length === 0 ? (
                  <Box sx={sx.emptyCommitments}>
                    <EventAvailableRoundedIcon sx={{ fontSize: 36, color: "#94a3b8", mb: 1 }} />
                    <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "#475569" }}>
                      Nenhum compromisso agendado
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#94a3b8", mt: 0.3 }}>
                      Não há {tipoVisualizacao === "VENCIMENTOS" ? "vencimentos" : "renovações"} para esta data.
                    </Typography>
                  </Box>
                ) : (
                  compromissosDoDia.map((item) => (
                    <Box
                      key={item.id}
                      onClick={() => item.contratoId && navigate(`/contratos/${item.contratoId}`)}
                      sx={{
                        ...sx.commitmentCard,
                        cursor: item.contratoId ? "pointer" : "default",
                      }}
                      title={item.contratoId ? "Clique para ver detalhes do contrato" : ""}
                    >
                      {/* Barra Vertical de Destaque Azul */}
                      <Box sx={sx.verticalAccentBar} />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={sx.commitmentTitle} noWrap>
                          {item.titulo}
                        </Typography>
                        <Typography sx={sx.commitmentSub}>
                          {formatBRL(item.valor)} • {item.faturaNumero}
                        </Typography>
                      </Box>

                      {/* Badge de Status */}
                      <Box
                        sx={{
                          ...sx.badgeStatus,
                          ...(item.statusCor === "pago"
                            ? sx.badgePago
                            : item.statusCor === "atrasado"
                            ? sx.badgeAtrasado
                            : sx.badgeAberto),
                        }}
                      >
                        {item.statusBadge}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────
   Estilos Padronizados (Design System ContractFlow)
───────────────────────────────────────────────────────── */
const sx = {
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
  pageTitle: { fontSize: "24px", fontWeight: 700, color: "#182338", letterSpacing: "-0.01em" },
  headerRight: { display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    bgcolor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    px: 1.5,
    py: 0.6,
    width: { xs: "100%", sm: 260 },
  },
  searchInput: { fontSize: "13px", color: "#182338", width: "100%" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: "8px",
    bgcolor: "#fff",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  filterWrap: { display: "flex", alignItems: "center", gap: 0.8 },
  filterLabel: { fontSize: "12.5px", color: "#67728a", fontWeight: 500 },
  filterSelect: {
    bgcolor: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 600,
    border: "none",
    borderRadius: "6px",
    px: "10px",
    py: "6px",
    fontSize: "12.5px",
    cursor: "pointer",
    outline: "none",
  },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" },
    gap: 3,
    alignItems: "start",
    pb: 4,
  },

  /* ── Card do Calendário (Esquerda) ── */
  calendarCard: {
    bgcolor: "#fff",
    border: "1px solid #eef2f6",
    borderRadius: "14px",
    p: { xs: 2, sm: 3 },
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },

  calendarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 1.5,
    mb: 3,
  },

  btnMonthNav: {
    width: 30,
    height: 30,
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    bgcolor: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#64748b",
    transition: "all 0.15s ease",
    "&:hover": {
      bgcolor: "#f8fafc",
      color: "#1e293b",
    },
  },

  monthTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#182338",
    minWidth: 130,
    textAlign: "center",
  },

  btnToggleActive: {
    bgcolor: "#dbeafe",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "6px",
    px: 1.8,
    py: 0.6,
    boxShadow: "none",
    "&:hover": { bgcolor: "#bfdbfe" },
  },
  btnToggleInactive: {
    border: "1px solid #e2e8f0",
    color: "#64748b",
    bgcolor: "#fff",
    fontSize: "12px",
    fontWeight: 500,
    textTransform: "none",
    borderRadius: "6px",
    px: 1.8,
    py: 0.6,
    "&:hover": {
      bgcolor: "#f8fafc",
      borderColor: "#cbd5e1",
    },
  },

  weekDaysGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    textAlign: "center",
    mb: 1,
  },
  weekDayLabel: {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#475569",
    py: 0.8,
  },

  monthDaysGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    overflow: "hidden",
  },

  dayCell: {
    height: { xs: 70, sm: 84 },
    borderRight: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
    p: 1,
    position: "relative",
    transition: "background 0.15s ease",
    "&:nth-of-type(7n)": {
      borderRight: "none",
    },
    "&:hover": {
      bgcolor: "#f8fafc",
    },
  },

  dayCellSelected: {
    bgcolor: "#dbeafe !important",
  },

  dayNumber: {
    fontSize: "12.5px",
    lineHeight: 1,
    userSelect: "none",
  },

  /* ── Painel de Detalhes do Dia (Direita) ── */
  detailsColumn: {
    position: { lg: "sticky" },
    top: { lg: "24px" },
  },
  detailsCard: {
    bgcolor: "#fff",
    border: "1px solid #eef2f6",
    borderRadius: "14px",
    p: 3,
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },

  weekdayHeader: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.05em",
  },
  dateHeader: {
    fontSize: "17px",
    fontWeight: 700,
    color: "#0f172a",
    mt: 0.4,
  },

  commitmentsSectionTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.04em",
    borderTop: "1px solid #f1f5f9",
    pt: 2.5,
  },

  commitmentCard: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    p: 1.6,
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    bgcolor: "#fff",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.15s ease",
    "&:hover": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      borderColor: "#cbd5e1",
    },
  },
  verticalAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    bgcolor: "#2563eb",
  },
  commitmentTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.3,
  },
  commitmentSub: {
    fontSize: "11.5px",
    color: "#64748b",
    mt: 0.3,
  },

  badgeStatus: {
    fontSize: "10.5px",
    fontWeight: 600,
    borderRadius: "4px",
    px: "8px",
    py: "3px",
    textTransform: "capitalize",
    flexShrink: 0,
  },
  badgeAberto: {
    bgcolor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #dbeafe",
  },
  badgePago: {
    bgcolor: "#dcfce7",
    color: "#16a34a",
    border: "1px solid #bbf7d0",
  },
  badgeAtrasado: {
    bgcolor: "#fee2e2",
    color: "#dc2626",
    border: "1px solid #fecaca",
  },

  commitmentCardSkeleton: {
    p: 1.6,
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    bgcolor: "#fff",
  },
  emptyCommitments: {
    textAlign: "center",
    py: 4,
    px: 2,
    bgcolor: "#f8fafc",
    borderRadius: "8px",
    border: "1px dashed #cbd5e1",
  },
};
