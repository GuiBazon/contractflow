import { useState, useEffect, useCallback } from "react";
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
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

// MUI Components
import { Box, Typography, InputBase, Avatar, Badge, CircularProgress, Skeleton } from "@mui/material";

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
  warning: WarningAmberRoundedIcon,
  add: AddCircleRoundedIcon,
  check: CheckCircleRoundedIcon,
  error: ErrorRoundedIcon,
  renew: AutorenewRoundedIcon,
  person: PersonAddAltRoundedIcon,
};

const NAV_ITEMS = [
  { label: "Dashboard", iconKey: "dashboard", active: true, path: "/dashboard" },
  { label: "Clientes", iconKey: "people", path: "/clientes" },
  { label: "Contratos", iconKey: "description", path: "/home" },
  { label: "Calendário", iconKey: "calendar" },
  { label: "Financeiro", iconKey: "money" },
  { label: "Calculadora", iconKey: "calculate" },
  { label: "Relatórios", iconKey: "bar_chart" },
  { label: "Configurações", iconKey: "settings" },
];

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function tempoRelativo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);
  if (min < 1) return "Agora mesmo";
  if (min < 60) return `Há ${min} minuto${min > 1 ? "s" : ""}`;
  if (hrs < 24) return `Há ${hrs} hora${hrs > 1 ? "s" : ""}`;
  return `Há ${dias} dia${dias > 1 ? "s" : ""}`;
}

/* Status do contrato → chip de vencimento */
const STATUS_CHIP = {
  ATIVO: { label: "EM DIA", bg: "#e7f9ef", color: "#1f9d55" },
  INADIMPLENTE: { label: "ATRASADO", bg: "#fdeceb", color: "#e0392b" },
  PENDENTE: { label: "EM ABERTO", bg: "#e8f0fe", color: "#3f7ff2" },
  RASCUNHO: { label: "RASCUNHO", bg: "#fdf3e0", color: "#c8850f" },
  ENCERRADO: { label: "ENCERRADO", bg: "#f0f2f7", color: "#67728a" },
  CANCELADO: { label: "CANCELADO", bg: "#f0f2f7", color: "#67728a" },
};

/* ─────────────────────────────────────────────────────────
   Deriva indicadores a partir das respostas existentes da API
   (Contratos, Clientes, Receitas/Pagamentos e Parcelas)
───────────────────────────────────────────────────────── */
function derivarDados(contratos = [], clientes = [], pagamentos = [], parcelas = [], clienteIdFiltro = "TODOS", termoBusca = "") {
  let contratosFiltrados = [...contratos];
  let pagamentosFiltrados = [...pagamentos];
  let parcelasFiltradas = [...parcelas];

  // Filtro por Cliente selecionado
  if (clienteIdFiltro && clienteIdFiltro !== "TODOS") {
    const cid = Number(clienteIdFiltro);
    contratosFiltrados = contratosFiltrados.filter(c => Number(c.cliente_id) === cid);
    pagamentosFiltrados = pagamentosFiltrados.filter(p => Number(p.cliente_id) === cid);
    parcelasFiltradas = parcelasFiltradas.filter(p => Number(p.cliente_id) === cid || contratosFiltrados.some(c => c.id === p.contrato_id));
  }

  // Filtro por termo de busca
  if (termoBusca && termoBusca.trim()) {
    const q = termoBusca.trim().toLowerCase();
    contratosFiltrados = contratosFiltrados.filter(c =>
      (c.numero && String(c.numero).toLowerCase().includes(q)) ||
      (c.cliente_nome && String(c.cliente_nome).toLowerCase().includes(q)) ||
      (c.descricao && String(c.descricao).toLowerCase().includes(q))
    );
    pagamentosFiltrados = pagamentosFiltrados.filter(p =>
      (p.cliente_nome && String(p.cliente_nome).toLowerCase().includes(q)) ||
      (p.contrato_numero && String(p.contrato_numero).toLowerCase().includes(q)) ||
      (p.forma_pagamento && String(p.forma_pagamento).toLowerCase().includes(q))
    );
    parcelasFiltradas = parcelasFiltradas.filter(p =>
      (p.cliente_nome && String(p.cliente_nome).toLowerCase().includes(q)) ||
      (p.contrato_numero && String(p.contrato_numero).toLowerCase().includes(q))
    );
  }

  /* ── KPIs ── */
  const totalAtivos = contratosFiltrados.filter(c => c.status === "ATIVO").length;
  const totalInadimplentes = contratosFiltrados.filter(
    c => c.status === "INADIMPLENTE" || (c.status === "ATIVO" && Number(c.pendente || 0) > 0)
  ).length;
  const totalClientes = clienteIdFiltro !== "TODOS" ? 1 : clientes.length;

  // Recebido no mês atual a partir dos pagamentos reais da API
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth();
  const recebidoMes = pagamentosFiltrados
    .filter(p => {
      const d = new Date(p.data_pagamento);
      return d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
    })
    .reduce((acc, p) => acc + Number(p.valor || 0), 0);

  // Inadimplência %: contratos com pendência / total de contratos válidos
  const contratosValidos = contratosFiltrados.filter(c => !["CANCELADO", "ENCERRADO"].includes(c.status));
  const inadimplencia = contratosValidos.length > 0
    ? ((totalInadimplentes / contratosValidos.length) * 100).toFixed(1)
    : "0.0";

  /* ── Status de contratos (donut) ── */
  const totalPendentes = contratosFiltrados.filter(c => ["PENDENTE", "RASCUNHO"].includes(c.status)).length;
  const totalEncerrados = contratosFiltrados.filter(c => ["ENCERRADO", "CANCELADO"].includes(c.status)).length;

  const statusContratos = [
    { label: "Ativos", value: totalAtivos, color: "#3f7ff2" },
    { label: "Inadimplentes", value: totalInadimplentes, color: "#ef4444" },
    { label: "Pendentes / Rascunho", value: totalPendentes, color: "#f5a623" },
    { label: "Encerrados", value: totalEncerrados, color: "#8b97aa" },
  ].filter(s => s.value > 0);

  /* ── Fluxo financeiro: últimos 6 meses a partir dos pagamentos reais ── */
  const fluxo = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const m = d.getMonth();
    const a = d.getFullYear();
    const rec = pagamentosFiltrados
      .filter(p => {
        const pd = new Date(p.data_pagamento);
        return pd.getFullYear() === a && pd.getMonth() === m;
      })
      .reduce((acc, p) => acc + Number(p.valor || 0), 0);
    fluxo.push({ mes: MESES_ABREV[m], ano: a, receitas: rec, despesas: 0 });
  }

  /* ── Próximos vencimentos: parcelas reais ou contratos com vencimento ── */
  let proximosVencimentos = [];

  if (parcelasFiltradas.length > 0) {
    proximosVencimentos = [...parcelasFiltradas]
      .filter(p => p.situacao !== "PAGA" && p.status !== "CANCELADA")
      .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
      .slice(0, 5)
      .map(p => {
        const diasAtraso = Number(p.dias_atraso || 0);
        const ehAtrasado = diasAtraso > 0 || p.situacao === "VENCIDA";
        const chip = ehAtrasado
          ? { label: "ATRASADO", bg: "#fdeceb", color: "#e0392b" }
          : diasAtraso >= -5
          ? { label: "A VENCER", bg: "#fdf3e0", color: "#c8850f" }
          : { label: "EM ABERTO", bg: "#e8f0fe", color: "#3f7ff2" };

        return {
          cliente: p.cliente_nome || "—",
          detalhe: `${p.contrato_numero ? `Contrato ${p.contrato_numero}` : ""} • Parc. ${p.numero || 1}`,
          valor: formatBRL(p.valor),
          data: formatDate(p.data_vencimento),
          status: chip.label,
          bg: chip.bg,
          color: chip.color,
        };
      });
  }

  // Fallback caso não haja parcelas detalhadas cadastradas
  if (proximosVencimentos.length === 0 && contratosFiltrados.length > 0) {
    proximosVencimentos = [...contratosFiltrados]
      .filter(c => !["ENCERRADO", "CANCELADO"].includes(c.status))
      .sort((a, b) => new Date(a.data_fim || a.data_inicio) - new Date(b.data_fim || b.data_inicio))
      .slice(0, 5)
      .map(c => {
        const chipInfo = STATUS_CHIP[c.status] || { label: c.status, bg: "#f0f2f7", color: "#67728a" };
        return {
          cliente: c.cliente_nome || "—",
          detalhe: `Contrato ${c.numero}`,
          valor: formatBRL(c.pendente || c.valor_total),
          data: formatDate(c.data_fim || c.data_inicio),
          status: chipInfo.label,
          bg: chipInfo.bg,
          color: chipInfo.color,
        };
      });
  }

  /* ── Atividades recentes: pagamentos reais + novos contratos ── */
  const listaAtividades = [];

  pagamentosFiltrados.forEach(p => {
    listaAtividades.push({
      id: `pg-${p.id}`,
      dataHora: new Date(p.data_pagamento || p.created_at).getTime(),
      texto: `Pagamento de ${formatBRL(p.valor)} recebido${p.cliente_nome ? ` de ${p.cliente_nome}` : ""}${p.forma_pagamento ? ` via ${p.forma_pagamento}` : ""}`,
      tempo: tempoRelativo(p.data_pagamento || p.created_at),
      iconKey: "check",
      color: "#22c55e",
    });
  });

  contratosFiltrados.forEach(c => {
    listaAtividades.push({
      id: `c-${c.id}`,
      dataHora: new Date(c.created_at || c.data_inicio).getTime(),
      texto: `Contrato ${c.numero} registrado para ${c.cliente_nome || "cliente"} (${c.status})`,
      tempo: tempoRelativo(c.created_at || c.data_inicio),
      iconKey: "description",
      color: "#3f7ff2",
    });
  });

  const atividades = listaAtividades
    .sort((a, b) => b.dataHora - a.dataHora)
    .slice(0, 6);

  return {
    kpis: [
      {
        id: "contratos-ativos",
        label: "Contratos Ativos",
        value: String(totalAtivos),
        change: `${totalInadimplentes} com pendência`,
        tone: "positive",
        iconKey: "description",
      },
      {
        id: "clientes",
        label: "Clientes Atendidos",
        value: String(totalClientes),
        change: `${totalClientes} cadastrado${totalClientes > 1 ? "s" : ""}`,
        tone: "positive",
        iconKey: "people",
      },
      {
        id: "recebido-mes",
        label: "Recebido este mês",
        value: formatBRL(recebidoMes),
        change: `Mês de ${MESES_ABREV[mesAtual]}/${anoAtual}`,
        tone: "positive",
        iconKey: "money",
      },
      {
        id: "inadimplencia",
        label: "Inadimplência Geral",
        value: `${inadimplencia}%`,
        change: totalInadimplentes > 0 ? `${totalInadimplentes} em atraso` : "Em dia",
        tone: totalInadimplentes > 0 ? "warning" : "positive",
        iconKey: "warning",
      },
    ],
    statusContratos,
    fluxo,
    proximosVencimentos,
    atividades,
  };
}

/* =========================================================
   DASHBOARD
========================================================= */
function Dashboard() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState("TODOS");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState(null);

  // Dados brutos vindos da API
  const [rawContratos, setRawContratos] = useState([]);
  const [rawClientes, setRawClientes] = useState([]);
  const [rawPagamentos, setRawPagamentos] = useState([]);
  const [rawParcelas, setRawParcelas] = useState([]);

  // Dados processados para renderização
  const [dados, setDados] = useState(null);

  /* Dados do usuário logado */
  const storageUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || null;
    } catch {
      return null;
    }
  })();
  const nomeUsuario = storageUser?.nome || "Usuário";
  const initials = nomeUsuario
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join("")
    .toUpperCase();

  /* ── Busca da API ── */
  const carregarDados = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErro(null);

    try {
      const [resContratos, resClientes, resPagamentos] = await Promise.all([
        sheets.getContratos({ limit: 100 }),
        sheets.getClientes({ limit: 100 }),
        sheets.getPagamentos({ limit: 100 }),
      ]);

      const contratos = resContratos?.data?.data || resContratos?.data || [];
      const clientes = resClientes?.data?.data || resClientes?.data || [];
      const pagamentos = resPagamentos?.data?.data || resPagamentos?.data || [];

      setRawContratos(contratos);
      setRawClientes(clientes);
      setRawPagamentos(pagamentos);

      // Carrega parcelas dos contratos vigentes para obter vencimentos precisos
      let todasParcelas = [];
      const contratosParaParcelas = contratos
        .filter(c => !["ENCERRADO", "CANCELADO"].includes(c.status) && Number(c.total_parcelas || 0) > 0)
        .slice(0, 15);

      if (contratosParaParcelas.length > 0) {
        const promessas = contratosParaParcelas.map(c =>
          sheets
            .getParcelas(c.id)
            .then(res => {
              const rows = res.data?.data || [];
              return rows.map(p => ({
                ...p,
                contrato_id: c.id,
                contrato_numero: c.numero,
                cliente_id: c.cliente_id,
                cliente_nome: c.cliente_nome,
              }));
            })
            .catch(() => [])
        );

        const resultados = await Promise.allSettled(promessas);
        todasParcelas = resultados
          .filter(r => r.status === "fulfilled")
          .flatMap(r => r.value);
      }

      setRawParcelas(todasParcelas);
      setDados(
        derivarDados(
          contratos,
          clientes,
          pagamentos,
          todasParcelas,
          clienteSelecionado,
          searchValue
        )
      );
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
      const msg = err.response?.data?.message || err.message;
      setErro(
        msg
          ? `Falha ao carregar dados da API: ${msg}`
          : "Não foi possível conectar ao servidor. Verifique se a API está rodando em http://localhost:8080 ou no IP configurado."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clienteSelecionado, searchValue]);

  // Recalcula dados derivados quando o cliente ou busca mudam localmente
  useEffect(() => {
    if (rawContratos.length > 0 || rawClientes.length > 0 || rawPagamentos.length > 0) {
      setDados(
        derivarDados(
          rawContratos,
          rawClientes,
          rawPagamentos,
          rawParcelas,
          clienteSelecionado,
          searchValue
        )
      );
    }
  }, [clienteSelecionado, searchValue, rawContratos, rawClientes, rawPagamentos, rawParcelas]);

  useEffect(() => {
    carregarDados();
  }, []);

  /* ── Logout ── */
  function handleLogout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  }

  /* ── Donut chart ── */
  const statusContratos = dados?.statusContratos || [];
  const totalContratos = statusContratos.reduce((s, i) => s + i.value, 0);
  let acum = 0;
  const donutGradient = statusContratos.length
    ? statusContratos.map(s => {
        const ini = (acum / totalContratos) * 360;
        acum += s.value;
        return `${s.color} ${ini}deg ${(acum / totalContratos) * 360}deg`;
      }).join(", ")
    : "#e3e7ee 0deg 360deg";

  /* ── Bar chart ── */
  const fluxo = dados?.fluxo || [];
  const maxFluxo = Math.max(...fluxo.flatMap(m => [m.receitas, m.despesas]), 1);

  const kpis = dados?.kpis || [];
  const vencimentos = dados?.proximosVencimentos || [];
  const atividades = dados?.atividades || [];

  /* ─── RENDER ─────────────────────────────────────────── */
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
            {NAV_ITEMS.map(item => {
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
                  title={item.path ? `Ir para ${item.label}` : item.label}
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
            <Typography sx={sx.userName} noWrap>{nomeUsuario}</Typography>
            <Typography sx={sx.userRole}>{storageUser?.perfil || "Usuário"}</Typography>
          </Box>
          <Box component="button" onClick={handleLogout} sx={sx.logoutBtn} title="Sair">
            <LogoutRoundedIcon sx={{ fontSize: 17 }} />
          </Box>
        </Box>
      </Box>

      {/* ══════════ CONTEÚDO ══════════ */}
      <Box sx={sx.main}>

        {/* ── Header ── */}
        <Box sx={sx.header}>
          <Typography sx={sx.pageTitle}>Visão Geral</Typography>
          <Box sx={sx.headerRight}>
            <Box sx={sx.searchBox}>
              <SearchRoundedIcon sx={{ fontSize: 17, color: "#9aa5b8" }} />
              <InputBase
                placeholder="Buscar contratos, clientes..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                sx={sx.searchInput}
              />
            </Box>
            <Box
              sx={{
                ...sx.iconBtn,
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": { bgcolor: "#f8fafc" },
              }}
              onClick={() => carregarDados(true)}
              title="Sincronizar com a API"
            >
              <RefreshRoundedIcon
                sx={{
                  fontSize: 19,
                  color: refreshing ? "#3f7ff2" : "#67728a",
                  animation: refreshing ? "spin 0.8s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </Box>
            <Box sx={sx.filterWrap}>
              <Typography sx={sx.filterLabel}>Filtro Geral:</Typography>
              <Box
                component="select"
                value={clienteSelecionado}
                onChange={e => setClienteSelecionado(e.target.value)}
                sx={sx.filterSelect}
                title="Filtrar dados por cliente"
              >
                <option value="TODOS">Todos os Clientes ({rawClientes.length})</option>
                {rawClientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome_razao_social}
                  </option>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Erro ── */}
        {erro && (
          <Box sx={sx.erroBox}>
            <Typography sx={{ fontSize: "13px", color: "#e0392b", flex: 1 }}>{erro}</Typography>
            <Box component="button" onClick={carregarDados} sx={sx.retryBtn}>
              <RefreshRoundedIcon sx={{ fontSize: 16 }} /> Tentar novamente
            </Box>
          </Box>
        )}

        {/* ── KPIs ── */}
        <Box sx={sx.kpiGrid}>
          {loading
            ? Array(4).fill(0).map((_, i) => (
              <Box key={i} sx={sx.kpiCard}>
                <Skeleton variant="text" width="60%" height={18} />
                <Skeleton variant="text" width="45%" height={38} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="70%" height={16} sx={{ mt: 0.5 }} />
              </Box>
            ))
            : kpis.map(kpi => {
              const Icon = ICON_MAP[kpi.iconKey];
              const isWarning = kpi.tone === "warning";
              return (
                <Box key={kpi.id} sx={sx.kpiCard}>
                  <Box sx={sx.kpiTop}>
                    <Typography sx={sx.kpiLabel}>{kpi.label}</Typography>
                    {Icon && <Icon sx={{ fontSize: 19, color: isWarning ? "#f5a623" : "#9aa5b8" }} />}
                  </Box>
                  <Typography sx={sx.kpiValue}>{kpi.value}</Typography>
                  <Box sx={sx.kpiBottom}>
                    <Box sx={{ ...sx.kpiDot, bgcolor: isWarning ? "#f5a623" : "#22c55e" }} />
                    <Typography sx={sx.kpiChange}>{kpi.change}</Typography>
                  </Box>
                </Box>
              );
            })
          }
        </Box>

        {/* ── Gráficos ── */}
        <Box sx={sx.row2}>

          {/* Fluxo Financeiro */}
          <Box sx={sx.panel}>
            <Box sx={sx.panelHead}>
              <Box>
                <Typography sx={sx.panelTitle}>Fluxo Financeiro (6 Meses)</Typography>
                <Typography sx={sx.panelSub}>Receitas consolidadas por mês</Typography>
              </Box>
              <Box sx={sx.legend}>
                <Box sx={sx.legendItem}>
                  <Box sx={{ ...sx.legendDot, bgcolor: "#3f7ff2" }} />
                  <Typography sx={sx.legendText}>Receitas</Typography>
                </Box>
                <Box sx={sx.legendItem}>
                  <Box sx={{ ...sx.legendDot, bgcolor: "#ef4444" }} />
                  <Typography sx={sx.legendText}>Despesas</Typography>
                </Box>
              </Box>
            </Box>

            {loading ? (
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: "8px", mt: 2 }} />
            ) : (
              <Box sx={sx.chartArea}>
                {fluxo.map(m => (
                  <Box key={m.mes} sx={sx.chartCol}>
                    <Box sx={sx.barPair}>
                      <Box sx={{ ...sx.bar, height: `${(m.receitas / maxFluxo) * 100}%`, bgcolor: "#3f7ff2" }} />
                      <Box sx={{ ...sx.bar, height: `${(m.despesas / maxFluxo) * 100}%`, bgcolor: "#ef4444" }} />
                    </Box>
                    <Typography sx={sx.chartLabel}>{m.mes}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Status de Contratos */}
          <Box sx={sx.panel}>
            <Typography sx={sx.panelTitle}>Status de Contratos</Typography>
            <Typography sx={sx.panelSub}>Distribuição atual das assinaturas</Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
                <CircularProgress size={30} sx={{ color: "#3f7ff2" }} />
              </Box>
            ) : (
              <>
                <Box sx={sx.donutArea}>
                  <Box>
                    <Typography sx={sx.donutNum}>{totalContratos}</Typography>
                    <Typography sx={sx.donutNumLabel}>Ativos</Typography>
                  </Box>
                  <Box sx={{ ...sx.donut, background: `conic-gradient(${donutGradient})` }}>
                    <Box sx={sx.donutHole} />
                  </Box>
                </Box>
                <Box sx={sx.statusList}>
                  {statusContratos.map(s => (
                    <Box key={s.label} sx={sx.statusRow}>
                      <Box sx={sx.statusLeft}>
                        <Box sx={{ ...sx.legendDot, bgcolor: s.color }} />
                        <Typography sx={sx.legendText}>{s.label}</Typography>
                      </Box>
                      <Typography sx={sx.statusVal}>{s.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* ── Vencimentos + Atividades ── */}
        <Box sx={sx.row3}>

          {/* Próximos Vencimentos */}
          <Box sx={sx.panel}>
            <Box sx={sx.panelHead}>
              <Box>
                <Typography sx={sx.panelTitle}>Próximos Vencimentos</Typography>
                <Typography sx={sx.panelSub}>Parcelas e contratos pendentes</Typography>
              </Box>
              <Box sx={sx.link} onClick={() => navigate("/home")}>
                Ver todos os contratos <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>

            {loading
              ? Array(4).fill(0).map((_, i) => (
                <Box key={i} sx={{ py: 1.2, borderBottom: "1px solid #f2f4f8" }}>
                  <Skeleton variant="text" width="100%" height={22} />
                </Box>
              ))
              : vencimentos.length === 0
                ? <Typography sx={{ fontSize: "13px", color: "#8b97aa", py: 2 }}>Nenhum vencimento pendente.</Typography>
                : vencimentos.map((item, i) => (
                  <Box key={i} sx={sx.vRow}>
                    <Box sx={sx.vLeft}>
                      <PersonRoundedIcon sx={{ fontSize: 16, color: "#9aa5b8", flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={sx.vNome} title={item.cliente}>{item.cliente}</Typography>
                        {item.detalhe && (
                          <Typography sx={sx.vDetalhe} title={item.detalhe}>{item.detalhe}</Typography>
                        )}
                      </Box>
                    </Box>
                    <Typography sx={sx.vValor}>{item.valor}</Typography>
                    <Typography sx={sx.vData}>{item.data}</Typography>
                    <Box sx={{ ...sx.chip, bgcolor: item.bg, color: item.color }}>
                      {item.status}
                    </Box>
                  </Box>
                ))
            }
          </Box>

          {/* Atividades Recentes */}
          <Box sx={sx.panel}>
            <Typography sx={sx.panelTitle}>Atividades Recentes</Typography>

            {loading
              ? Array(4).fill(0).map((_, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1.3, mt: 2 }}>
                  <Skeleton variant="circular" width={20} height={20} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="85%" height={18} />
                    <Skeleton variant="text" width="40%" height={14} />
                  </Box>
                </Box>
              ))
              : atividades.length === 0
                ? <Typography sx={{ fontSize: "13px", color: "#8b97aa", mt: 2 }}>Nenhuma atividade recente.</Typography>
                : (
                  <Box sx={sx.actList}>
                    {atividades.map(a => {
                      const Icon = ICON_MAP[a.iconKey];
                      return (
                        <Box key={a.id} sx={sx.actRow}>
                          {Icon && <Icon sx={{ fontSize: 18, color: a.color, flexShrink: 0, mt: "1px" }} />}
                          <Box>
                            <Typography sx={sx.actText}>{a.texto}</Typography>
                            <Typography sx={sx.actTime}>{a.tempo}</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )
            }
          </Box>
        </Box>

      </Box>
    </Box>
  );
}

/* =========================================================
   ESTILOS
========================================================= */
const sx = {
  page: {
    display: "flex",
    height: "100dvh",
    overflow: "hidden",
    bgcolor: "#f4f7fb",
    fontFamily: "'Roboto', sans-serif",
  },

  /* ── Sidebar ── */
  sidebar: {
    width: 220, minWidth: 220,
    bgcolor: "#192d65",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    px: 2.5, py: 3,
    position: "fixed", top: 0, left: 0,
    height: "100dvh", overflowY: "auto",
    zIndex: 100, flexShrink: 0,
  },

  brand: { display: "flex", alignItems: "center", gap: 1.3, mb: 4, px: 0.5 },

  brandIcon: {
    width: 34, height: 34, borderRadius: "9px",
    bgcolor: "#3f7ff2", display: "flex",
    alignItems: "center", justifyContent: "center",
    color: "#fff", flexShrink: 0,
  },

  brandName: { color: "#fff", fontSize: "14.5px", fontWeight: 700, lineHeight: 1.2 },
  brandSub: { color: "rgba(255,255,255,0.42)", fontSize: "10px", mt: "1px" },

  nav: { display: "flex", flexDirection: "column", gap: "2px" },

  navItem: {
    display: "flex", alignItems: "center", gap: 1.4,
    px: 1.5, py: 1.15, borderRadius: "8px",
    color: "rgba(255,255,255,0.55)", cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" },
  },

  navActive: {
    bgcolor: "rgba(255,255,255,0.12)", color: "#fff",
    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
  },

  navLabel: { fontSize: "13px", fontWeight: 500 },

  userRow: {
    display: "flex", alignItems: "center", gap: 1.2,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    pt: 2.5, px: 0.5, mt: 2,
  },

  avatar: { width: 34, height: 34, fontSize: "12px", fontWeight: 700, bgcolor: "#3f7ff2", flexShrink: 0 },
  userName: { color: "#fff", fontSize: "12.5px", fontWeight: 600, lineHeight: 1.3 },
  userRole: { color: "rgba(255,255,255,0.42)", fontSize: "10.5px" },

  logoutBtn: {
    border: "none", background: "none", cursor: "pointer",
    color: "rgba(255,255,255,0.45)", display: "flex",
    alignItems: "center", justifyContent: "center",
    p: 0, ml: "auto", flexShrink: 0,
    transition: "color 0.15s",
    "&:hover": { color: "#fff" },
  },

  /* ── Conteúdo ── */
  main: {
    marginLeft: "220px",
    width: "calc(100% - 220px)",
    height: "100dvh",
    overflowY: "auto",
    overflowX: "hidden",
    px: { xs: 2, sm: 3, md: 4 },
    py: 3.5,
    display: "flex", flexDirection: "column", gap: 2.5,
    boxSizing: "border-box",
  },

  header: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap", gap: 1.5,
  },

  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#182338", letterSpacing: "-0.01em" },

  headerRight: { display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" },

  searchBox: {
    display: "flex", alignItems: "center", gap: 1,
    bgcolor: "#fff", border: "1px solid #e3e7ee",
    borderRadius: "8px", px: 1.5, height: 38, width: 260,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },

  searchInput: {
    fontSize: "13px", flex: 1, color: "#182338",
    "& input::placeholder": { color: "#9aa5b8" },
  },

  iconBtn: {
    width: 38, height: 38, borderRadius: "8px",
    bgcolor: "#fff", border: "1px solid #e3e7ee",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", flexShrink: 0,
  },

  filterWrap: { display: "flex", alignItems: "center", gap: 0.9, flexShrink: 0 },
  filterLabel: { fontSize: "12.5px", color: "#67728a" },
  filterSelect: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#3f7ff2",
    bgcolor: "#e8f0fe",
    borderRadius: "6px",
    border: "1px solid #d4e2fc",
    px: "10px",
    py: "5px",
    outline: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    maxWidth: "200px",
    textOverflow: "ellipsis",
    transition: "all 0.15s ease",
    "&:hover": {
      bgcolor: "#dde9fd",
    },
    "&:focus": {
      borderColor: "#3f7ff2",
      boxShadow: "0 0 0 2px rgba(63, 127, 242, 0.2)",
    },
  },

  erroBox: {
    display: "flex", alignItems: "center", gap: 2,
    bgcolor: "#fff5f5", border: "1px solid #fcc", borderRadius: "10px",
    px: 2.5, py: 1.5,
  },

  retryBtn: {
    display: "flex", alignItems: "center", gap: 0.5,
    border: "none", background: "none", cursor: "pointer",
    color: "#e0392b", fontSize: "12px", fontWeight: 600,
    flexShrink: 0, p: 0,
    "&:hover": { textDecoration: "underline" },
  },

  /* ── KPIs ── */
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 2,
    "@media (max-width:1100px)": { gridTemplateColumns: "repeat(2,1fr)" },
    "@media (max-width:600px)": { gridTemplateColumns: "1fr" },
  },

  kpiCard: {
    bgcolor: "#fff", border: "1px solid #eef1f6",
    borderRadius: "12px", p: 2.2,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },

  kpiTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.4 },
  kpiLabel: { fontSize: "12.5px", color: "#67728a", fontWeight: 500, lineHeight: 1.4, pr: 0.5 },
  kpiValue: { fontSize: "24px", fontWeight: 700, color: "#182338", mb: 0.7, letterSpacing: "-0.01em", lineHeight: 1.1 },
  kpiBottom: { display: "flex", alignItems: "center", gap: 0.7 },
  kpiDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  kpiChange: { fontSize: "11.5px", color: "#67728a" },

  /* ── Painéis ── */
  panel: {
    bgcolor: "#fff", border: "1px solid #eef1f6",
    borderRadius: "12px", p: 2.5,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },

  panelHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2, gap: 1 },
  panelTitle: { fontSize: "14.5px", fontWeight: 700, color: "#182338" },
  panelSub: { fontSize: "11.5px", color: "#8b97aa", mt: 0.4 },

  link: {
    fontSize: "12px", color: "#3f7ff2", fontWeight: 600,
    display: "flex", alignItems: "center", cursor: "pointer",
    whiteSpace: "nowrap", flexShrink: 0,
    "&:hover": { textDecoration: "underline" },
  },

  legend: { display: "flex", gap: 1.5, flexShrink: 0 },
  legendItem: { display: "flex", alignItems: "center", gap: 0.6 },
  legendDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  legendText: { fontSize: "11.5px", color: "#67728a" },

  row2: {
    display: "grid", gridTemplateColumns: "1.75fr 1fr", gap: 2,
    "@media (max-width:900px)": { gridTemplateColumns: "1fr" },
  },

  /* Bar chart */
  chartArea: {
    display: "flex", alignItems: "flex-end",
    justifyContent: "space-around",
    height: 200, mt: 1.5, px: 0.5,
  },

  chartCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1 },
  barPair: { display: "flex", alignItems: "flex-end", gap: "5px", height: 170 },
  bar: { width: 16, borderRadius: "4px 4px 0 0", transition: "height 0.4s ease" },
  chartLabel: { fontSize: "11px", color: "#8b97aa" },

  /* Donut */
  donutArea: {
    display: "flex", alignItems: "center",
    justifyContent: "center", gap: 3, my: 2.5,
  },

  donutNum: { fontSize: "30px", fontWeight: 700, color: "#182338", lineHeight: 1 },
  donutNumLabel: { fontSize: "11px", color: "#8b97aa", mt: 0.5, textAlign: "center" },

  donut: {
    width: 130, height: 130, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  donutHole: { width: 82, height: 82, borderRadius: "50%", bgcolor: "#fff" },

  statusList: {
    display: "flex", flexDirection: "column", gap: 1.2,
    borderTop: "1px solid #f0f2f7", pt: 1.5,
  },

  statusRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  statusLeft: { display: "flex", alignItems: "center", gap: 0.8 },
  statusVal: { fontSize: "12.5px", fontWeight: 600, color: "#182338" },

  /* Linha inferior */
  row3: {
    display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 2,
    "@media (max-width:900px)": { gridTemplateColumns: "1fr" },
    pb: 2,
  },

  vRow: {
    display: "grid",
    gridTemplateColumns: "1.9fr 1fr 0.9fr auto",
    alignItems: "center",
    gap: 1, py: 1.3,
    borderBottom: "1px solid #f2f4f8",
    "&:last-child": { borderBottom: "none" },
  },

  vLeft: { display: "flex", alignItems: "center", gap: 0.9, minWidth: 0 },
  vNome: { fontSize: "12.5px", fontWeight: 600, color: "#27344b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  vDetalhe: { fontSize: "11px", color: "#8b97aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  vValor: { fontSize: "12.5px", color: "#27344b", fontWeight: 500 },
  vData: { fontSize: "12px", color: "#8b97aa" },

  chip: {
    fontSize: "10px", fontWeight: 700, borderRadius: "6px",
    px: "9px", py: "4px", letterSpacing: "0.02em",
    whiteSpace: "nowrap", display: "inline-flex",
    alignItems: "center", justifyContent: "center",
  },

  /* Atividades */
  actList: { display: "flex", flexDirection: "column", gap: 1.8, mt: 2 },
  actRow: { display: "flex", alignItems: "flex-start", gap: 1.3 },
  actText: { fontSize: "12.5px", color: "#27344b", fontWeight: 500, lineHeight: 1.4 },
  actTime: { fontSize: "11px", color: "#8b97aa", mt: "2px" },
};

export default Dashboard;
