import { useState, useEffect, useCallback, useMemo } from "react";
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
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

// MUI Components
import {
  Box,
  Typography,
  InputBase,
  Avatar,
  Badge,
  Skeleton,
  Alert,
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
  { label: "Calendário", iconKey: "calendar", path: "/calendario" },
  { label: "Financeiro", iconKey: "money", active: true, path: "/financeiro" },
  { label: "Calculadora", iconKey: "calculate" },
  { label: "Relatórios", iconKey: "bar_chart", path: "/relatorios" },
  { label: "Configurações", iconKey: "settings" },
];

/* ─────────────────────────────────────────────────────────
   Helpers de Formatação
───────────────────────────────────────────────────────── */
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatBRLCompact(valor) {
  const val = Number(valor || 0);
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `R$ ${Math.round(val / 1000)}k`;
  return `R$ ${Math.round(val)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export default function Financeiro() {
  const navigate = useNavigate();

  // Estados de dados da API (100% REAIS)
  const [rawPagamentos, setRawPagamentos] = useState([]);
  const [rawContratos, setRawContratos] = useState([]);
  const [rawClientes, setRawClientes] = useState([]);
  const [rawParcelas, setRawParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState("");

  // Filtros
  const [clienteGeral, setClienteGeral] = useState("TODOS");
  const [searchValue, setSearchValue] = useState("");

  // Paginação
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Usuário autenticado
  const storageUser = JSON.parse(localStorage.getItem("usuario") || "{}");
  const nomeUsuario = storageUser?.nome || "Rodrigo Souza";
  const initials = nomeUsuario
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  /* ── Carregamento de Dados da API ── */
  const carregarDados = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErro("");

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

      // Carregar parcelas dos contratos cadastrados para consolidação financeira real
      const contratosComParcelas = contratos
        .filter((c) => Number(c.total_parcelas || 0) > 0 || c.id)
        .slice(0, 30);

      if (contratosComParcelas.length > 0) {
        const promessas = contratosComParcelas.map((c) =>
          sheets
            .getParcelas(c.id)
            .then((res) => {
              const rows = res.data?.data || [];
              return rows.map((p) => ({
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
        const todasParcelas = resultados
          .filter((r) => r.status === "fulfilled")
          .flatMap((r) => r.value);
        setRawParcelas(todasParcelas);
      } else {
        setRawParcelas([]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
      const msg = err.response?.data?.message || err.message;
      setErro(
        msg
          ? `Falha ao conectar à API: ${msg}`
          : "Não foi possível carregar os dados financeiros da API."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  /* ── Logout ── */
  function handleLogout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  }

  /* ── Consolidação dos KPIs Financeiros 100% REAIS ── */
  const kpis = useMemo(() => {
    let contratos = [...rawContratos];
    let pagamentos = [...rawPagamentos];
    let parcelas = [...rawParcelas];

    if (clienteGeral !== "TODOS") {
      const cid = Number(clienteGeral);
      contratos = contratos.filter((c) => Number(c.cliente_id) === cid);
      pagamentos = pagamentos.filter((p) => Number(p.cliente_id) === cid);
      parcelas = parcelas.filter((p) => Number(p.cliente_id) === cid);
    }

    // 1. Total Recebido: soma de todos os pagamentos realizados no mês atual (ou total caso vazio)
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    const pagamentosMes = pagamentos.filter((p) => {
      if (!p.data_pagamento) return false;
      const d = new Date(p.data_pagamento);
      return d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
    });

    const totalRecebidoMes = pagamentosMes.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const totalRecebidoGeral = pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const totalRecebido = totalRecebidoMes > 0 ? totalRecebidoMes : totalRecebidoGeral;

    // 2. Total Pendente: parcelas a vencer ainda este mês ou contratos ativos pendentes
    const parcelasPendentes = parcelas.filter((p) => p.situacao === "PENDENTE");
    const totalPendente = parcelasPendentes.length > 0
      ? parcelasPendentes.reduce((acc, p) => acc + Number(p.valor || 0), 0)
      : contratos.filter((c) => c.status === "ATIVO").reduce((acc, c) => acc + Number(c.pendente || 0), 0);

    // 3. Total Inadimplente: parcelas com vencimento expirado ou contratos inadimplentes
    const parcelasVencidas = parcelas.filter((p) => p.situacao === "VENCIDA");
    const totalInadimplente = parcelasVencidas.length > 0
      ? parcelasVencidas.reduce((acc, p) => acc + Number(p.valor || 0), 0)
      : contratos
          .filter((c) => c.status === "INADIMPLENTE")
          .reduce((acc, c) => acc + Number(c.pendente || c.valor_total || 0), 0);

    // 4. Receita Total Esperada: recebido + pendente + atrasado
    const receitaEsperada = totalRecebido + totalPendente + totalInadimplente;

    const percentRecebido = receitaEsperada > 0
      ? ((totalRecebido / receitaEsperada) * 100).toFixed(1)
      : "0.0";

    return {
      receitaEsperada,
      totalRecebido,
      percentRecebido,
      totalPendente,
      totalInadimplente,
    };
  }, [rawContratos, rawPagamentos, rawParcelas, clienteGeral]);

  /* ── Previsão de Receita vs Caixa (Calculado 100% dos dados da API) ── */
  const { chartData, maxChartVal } = useMemo(() => {
    const agora = new Date();
    const meses = [];

    // Janela de 6 meses (3 meses anteriores, mês atual, e 2 meses futuros)
    for (let i = -3; i <= 2; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
      const m = d.getMonth();
      const a = d.getFullYear();

      // Liquidado: pagamentos reais quitados naquele mês/ano
      const liq = rawPagamentos
        .filter((p) => {
          if (!p.data_pagamento) return false;
          if (clienteGeral !== "TODOS" && Number(p.cliente_id) !== Number(clienteGeral)) return false;
          const pd = new Date(p.data_pagamento);
          return pd.getFullYear() === a && pd.getMonth() === m;
        })
        .reduce((sum, p) => sum + Number(p.valor || 0), 0);

      // Projetado: parcelas ou vencimentos daquele mês/ano
      const proj = rawParcelas
        .filter((par) => {
          if (!par.data_vencimento) return false;
          if (clienteGeral !== "TODOS" && Number(par.cliente_id) !== Number(clienteGeral)) return false;
          const vd = new Date(par.data_vencimento);
          return vd.getFullYear() === a && vd.getMonth() === m;
        })
        .reduce((sum, par) => sum + Number(par.valor || 0), 0);

      meses.push({
        mes: MESES_ABREV[m],
        ano: a,
        projetado: proj,
        liquidado: liq,
      });
    }

    const maxVal = Math.max(...meses.flatMap((m) => [m.projetado, m.liquidado]), 1);

    return {
      chartData: meses,
      maxChartVal: maxVal,
    };
  }, [rawPagamentos, rawParcelas, clienteGeral]);

  /* Coordenadas e Curvas SVG Calculadas Dinamicamente */
  const svgCurves = useMemo(() => {
    const w = 620;
    const h = 130;
    const padX = 40;
    const stepX = (w - padX * 2) / Math.max(chartData.length - 1, 1);

    const projPts = chartData.map((d, i) => {
      const x = padX + i * stepX;
      const y = h - (d.projetado / maxChartVal) * (h - 25) - 10;
      return { x, y, valor: d.projetado, mes: d.mes };
    });

    const liqPts = chartData.map((d, i) => {
      const x = padX + i * stepX;
      const y = h - (d.liquidado / maxChartVal) * (h - 25) - 10;
      return { x, y, valor: d.liquidado, mes: d.mes };
    });

    // Gera paths suaves (Bezier curves)
    function buildPath(pts) {
      if (pts.length === 0) return "";
      let p = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cx1 = (p0.x + p1.x) / 2;
        p += ` C ${cx1} ${p0.y}, ${cx1} ${p1.y}, ${p1.x} ${p1.y}`;
      }
      return p;
    }

    return {
      projPath: buildPath(projPts),
      liqPath: buildPath(liqPts),
      projPts,
      liqPts,
    };
  }, [chartData, maxChartVal]);

  /* ── Lista de Transações 100% REAIS da API ── */
  const transacoes = useMemo(() => {
    const lista = [];

    // Pagamentos confirmados
    rawPagamentos.forEach((p) => {
      lista.push({
        id: `pg-${p.id}`,
        data: p.data_pagamento || p.created_at,
        descricao: p.observacoes || (p.contrato_numero ? `Recebimento Contrato ${p.contrato_numero}` : "Recebimento de Faturamento"),
        cliente: p.cliente_nome || "Cliente Geral",
        categoria: p.forma_pagamento ? `Recebimento (${p.forma_pagamento})` : "Recebimento",
        valor: Number(p.valor || 0),
        status: "Confirmado",
        cliente_id: p.cliente_id,
      });
    });

    // Parcelas pendentes e atrasadas
    rawParcelas.forEach((par) => {
      if (par.situacao !== "PAGA" && par.status !== "CANCELADA") {
        const isAtrasado = par.situacao === "VENCIDA" || (par.data_vencimento && new Date(par.data_vencimento) < new Date());
        lista.push({
          id: `par-${par.id}`,
          data: par.data_vencimento,
          descricao: `Parcela ${par.numero || 1} • Contrato ${par.contrato_numero || ""}`,
          cliente: par.cliente_nome || "Cliente Geral",
          categoria: "Cobrança Prevista",
          valor: Number(par.valor || 0),
          status: isAtrasado ? "Atrasado" : "Pendente",
          cliente_id: par.cliente_id,
        });
      }
    });

    // Filtragem por cliente
    let filtradas = lista;
    if (clienteGeral !== "TODOS") {
      filtradas = filtradas.filter(
        (t) => !t.cliente_id || Number(t.cliente_id) === Number(clienteGeral)
      );
    }

    // Filtragem por busca
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      filtradas = filtradas.filter(
        (t) =>
          (t.descricao && t.descricao.toLowerCase().includes(q)) ||
          (t.cliente && t.cliente.toLowerCase().includes(q)) ||
          (t.categoria && t.categoria.toLowerCase().includes(q))
      );
    }

    // Ordenação mais recente primeiro
    return filtradas.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
  }, [rawPagamentos, rawParcelas, clienteGeral, searchValue]);

  /* ── Transações Paginadas ── */
  const transacoesPaginadas = useMemo(() => {
    const total = transacoes.length;
    const inicio = (pagina - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return {
      itens: transacoes.slice(inicio, fim),
      total,
      totalPaginas: Math.max(1, Math.ceil(total / itensPorPagina)),
    };
  }, [transacoes, pagina]);

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
            <Typography sx={sx.userName} noWrap>
              {nomeUsuario}
            </Typography>
            <Typography sx={sx.userRole}>
              {storageUser?.perfil || "Administrador"}
            </Typography>
          </Box>
          <Box
            component="button"
            onClick={handleLogout}
            sx={sx.logoutBtn}
            title="Sair"
          >
            <LogoutRoundedIcon sx={{ fontSize: 17 }} />
          </Box>
        </Box>
      </Box>

      {/* ══════════ CONTEÚDO PRINCIPAL ══════════ */}
      <Box sx={sx.main}>
        {/* ── Top Header ── */}
        <Box sx={sx.header}>
          <Typography sx={sx.pageTitle}>Fluxo Financeiro</Typography>

          <Box sx={sx.headerRight}>
            <Box sx={sx.searchBox}>
              <SearchRoundedIcon sx={{ fontSize: 18, color: "#9aa5b8" }} />
              <InputBase
                placeholder="Buscar contratos, clientes..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setPagina(1);
                }}
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
                onChange={(e) => {
                  setClienteGeral(e.target.value);
                  setPagina(1);
                }}
                sx={sx.filterSelect}
                title="Filtrar por cliente específico"
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

        {erro && (
          <Alert severity="warning" sx={{ borderRadius: "8px" }}>
            {erro}
          </Alert>
        )}

        {/* ── 4 KPI Cards Superiores (100% REAIS) ── */}
        <Box sx={sx.kpisGrid}>
          {/* Card 1: Receita Total Esperada */}
          <Box sx={sx.kpiCard}>
            <Typography sx={sx.kpiLabel}>Receita Total Esperada</Typography>
            <Typography sx={sx.kpiValueDark}>
              {loading ? <Skeleton width="80%" height={36} /> : formatBRL(kpis.receitaEsperada)}
            </Typography>
            <Typography sx={sx.kpiFootnote}>Total consolidado</Typography>
          </Box>

          {/* Card 2: Total Recebido */}
          <Box sx={sx.kpiCard}>
            <Typography sx={sx.kpiLabel}>Total Recebido</Typography>
            <Typography sx={sx.kpiValueGreen}>
              {loading ? <Skeleton width="80%" height={36} /> : formatBRL(kpis.totalRecebido)}
            </Typography>
            <Typography sx={sx.kpiFootnote}>
              {kpis.percentRecebido}% do total esperado
            </Typography>
          </Box>

          {/* Card 3: Total Pendente */}
          <Box sx={sx.kpiCard}>
            <Typography sx={sx.kpiLabel}>Total Pendente</Typography>
            <Typography sx={sx.kpiValueBlue}>
              {loading ? <Skeleton width="80%" height={36} /> : formatBRL(kpis.totalPendente)}
            </Typography>
            <Typography sx={sx.kpiFootnote}>A receber em aberto</Typography>
          </Box>

          {/* Card 4: Total Inadimplente */}
          <Box sx={sx.kpiCard}>
            <Typography sx={sx.kpiLabel}>Total Inadimplente</Typography>
            <Typography sx={sx.kpiValueRed}>
              {loading ? <Skeleton width="80%" height={36} /> : formatBRL(kpis.totalInadimplente)}
            </Typography>
            <Typography sx={sx.kpiFootnote}>Cobranças em atraso</Typography>
          </Box>
        </Box>

        {/* ── Painel: Previsão de Receita vs Caixa (Gráfico Real) ── */}
        <Box sx={sx.chartCard}>
          <Box sx={sx.chartHead}>
            <Box>
              <Typography sx={sx.chartTitle}>Previsão de Receita vs Caixa</Typography>
              <Typography sx={sx.chartSubtitle}>
                Demonstrativo comparativo de liquidez esperada para os próximos meses
              </Typography>
            </Box>

            <Box sx={sx.legendWrap}>
              <Box sx={sx.legendItem}>
                <Box sx={{ ...sx.legendLine, bgcolor: "#3b82f6" }} />
                <Typography sx={sx.legendText}>Projetado</Typography>
              </Box>
              <Box sx={sx.legendItem}>
                <Box sx={{ ...sx.legendLine, bgcolor: "#10b981" }} />
                <Typography sx={sx.legendText}>Liquidado</Typography>
              </Box>
            </Box>
          </Box>

          {/* Área do Gráfico */}
          <Box sx={sx.chartContainer}>
            {/* Eixo Y com gridlines dinâmicas */}
            <Box sx={sx.chartYAxis}>
              {[
                formatBRLCompact(maxChartVal),
                formatBRLCompact(maxChartVal * 0.66),
                formatBRLCompact(maxChartVal * 0.33),
                "0",
              ].map((rotulo, idx) => (
                <Box key={idx} sx={sx.yTickRow}>
                  <Typography sx={sx.yTickLabel}>{rotulo}</Typography>
                  <Box sx={sx.gridLine} />
                </Box>
              ))}
            </Box>

            {/* SVG das Curvas Reais */}
            <Box sx={sx.svgWrap}>
              <svg viewBox="0 0 620 130" width="100%" height="100%" preserveAspectRatio="none">
                {/* Linha Projetado: Curva Azul */}
                {svgCurves.projPath && (
                  <path
                    d={svgCurves.projPath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Linha Liquidado: Curva Verde */}
                {svgCurves.liqPath && (
                  <path
                    d={svgCurves.liqPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Pontos Projetado */}
                {svgCurves.projPts.map((pt, i) => (
                  <circle
                    key={`p-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#fff"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                  />
                ))}

                {/* Pontos Liquidado */}
                {svgCurves.liqPts.map((pt, i) => (
                  <circle
                    key={`l-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#fff"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />
                ))}
              </svg>

              {/* Rótulos dos Meses no Eixo X */}
              <Box sx={sx.chartXLabels}>
                {chartData.map((d) => (
                  <Typography key={`${d.mes}-${d.ano}`} sx={sx.xLabel}>
                    {d.mes}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Tabela de Lançamentos Recentes (100% REAIS) ── */}
        <Box sx={sx.tableCard}>
          <Box sx={{ overflowX: "auto" }}>
            <Box component="table" sx={sx.table}>
              <Box component="thead">
                <Box component="tr" sx={sx.thRow}>
                  <Box component="th" sx={sx.th}>DATA</Box>
                  <Box component="th" sx={sx.th}>DESCRIÇÃO</Box>
                  <Box component="th" sx={sx.th}>CLIENTE</Box>
                  <Box component="th" sx={sx.th}>CATEGORIA</Box>
                  <Box component="th" sx={{ ...sx.th, textAlign: "right" }}>VALOR</Box>
                  <Box component="th" sx={{ ...sx.th, textAlign: "center" }}>STATUS</Box>
                </Box>
              </Box>

              <Box component="tbody">
                {loading ? (
                  [1, 2, 3, 4].map((n) => (
                    <Box component="tr" key={n}>
                      <Box component="td" colSpan={6} sx={{ p: 2 }}>
                        <Skeleton variant="text" height={26} />
                      </Box>
                    </Box>
                  ))
                ) : transacoesPaginadas.itens.length === 0 ? (
                  <Box component="tr">
                    <Box component="td" colSpan={6} sx={sx.emptyTd}>
                      Nenhum lançamento financeiro registrado na API.
                    </Box>
                  </Box>
                ) : (
                  transacoesPaginadas.itens.map((t) => {
                    let badgeStyle = { bg: "#dcfce7", color: "#15803d" }; // Confirmado
                    if (t.status === "Despesa") {
                      badgeStyle = { bg: "#fee2e2", color: "#dc2626" };
                    } else if (t.status === "Pendente") {
                      badgeStyle = { bg: "#fef3c7", color: "#b45309" };
                    } else if (t.status === "Atrasado") {
                      badgeStyle = { bg: "#fdeceb", color: "#e0392b" };
                    }

                    return (
                      <Box component="tr" key={t.id} sx={sx.tr}>
                        <Box component="td" sx={sx.tdSub}>
                          {formatDate(t.data)}
                        </Box>

                        <Box component="td" sx={sx.tdBold}>
                          {t.descricao}
                        </Box>

                        <Box component="td" sx={sx.td}>
                          {t.cliente}
                        </Box>

                        <Box component="td" sx={sx.tdCategory}>
                          {t.categoria}
                        </Box>

                        <Box component="td" sx={sx.tdValor}>
                          {formatBRL(t.valor)}
                        </Box>

                        <Box component="td" sx={{ textAlign: "center" }}>
                          <Box
                            sx={{
                              ...sx.statusBadge,
                              bgcolor: badgeStyle.bg,
                              color: badgeStyle.color,
                            }}
                          >
                            {t.status}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>

          {/* Paginação */}
          {transacoesPaginadas.totalPaginas > 1 && (
            <Box sx={sx.paginationRow}>
              <Typography sx={sx.pageInfo}>
                Mostrando {transacoesPaginadas.itens.length} de {transacoesPaginadas.total} lançamentos
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Box
                  component="button"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  sx={{
                    ...sx.pageBtn,
                    opacity: pagina <= 1 ? 0.4 : 1,
                    cursor: pagina <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box
                  component="button"
                  disabled={pagina >= transacoesPaginadas.totalPaginas}
                  onClick={() => setPagina((p) => Math.min(transacoesPaginadas.totalPaginas, p + 1))}
                  sx={{
                    ...sx.pageBtn,
                    opacity: pagina >= transacoesPaginadas.totalPaginas ? 0.4 : 1,
                    cursor: pagina >= transacoesPaginadas.totalPaginas ? "not-allowed" : "pointer",
                  }}
                >
                  <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────
   Estilos CSS em JS (sx)
───────────────────────────────────────────────────────── */
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

  brandName: {
    color: "#fff",
    fontSize: "14.5px",
    fontWeight: 700,
    lineHeight: 1.2,
  },
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

  /* ── Conteúdo Principal ── */
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
    gap: 3,
    boxSizing: "border-box",
  },

  /* ── Header ── */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 1.5,
  },

  pageTitle: {
    fontSize: { xs: "20px", md: "23px" },
    fontWeight: 700,
    color: "#182338",
    letterSpacing: "-0.01em",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    flexWrap: "wrap",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    bgcolor: "#fff",
    border: "1px solid #e3e7ee",
    borderRadius: "8px",
    px: 1.5,
    height: 38,
    width: { xs: 210, sm: 260 },
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },

  searchInput: {
    fontSize: "13px",
    flex: 1,
    color: "#182338",
    "& input::placeholder": { color: "#9aa5b8" },
  },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: "8px",
    bgcolor: "#fff",
    border: "1px solid #e3e7ee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    flexShrink: 0,
  },

  filterWrap: {
    display: "flex",
    alignItems: "center",
    gap: 0.9,
    flexShrink: 0,
  },
  filterLabel: { fontSize: "12.5px", color: "#67728a" },
  filterSelect: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#2563eb",
    bgcolor: "#e8f0fe",
    border: "none",
    borderRadius: "6px",
    px: 1.5,
    py: 0.8,
    cursor: "pointer",
    outline: "none",
    fontFamily: "inherit",
  },

  /* ── 4 KPI Cards Superiores ── */
  kpisGrid: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
    gap: 2.2,
  },

  kpiCard: {
    bgcolor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e3e7ee",
    p: 2.5,
    display: "flex",
    flexDirection: "column",
    gap: 0.6,
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    },
  },

  kpiLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
  },

  kpiValueDark: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },

  kpiValueGreen: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#10b981",
    letterSpacing: "-0.02em",
  },

  kpiValueBlue: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#2563eb",
    letterSpacing: "-0.02em",
  },

  kpiValueRed: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#ef4444",
    letterSpacing: "-0.02em",
  },

  kpiFootnote: {
    fontSize: "11px",
    color: "#94a3b8",
  },

  /* ── Card do Gráfico ── */
  chartCard: {
    bgcolor: "#fff",
    borderRadius: "14px",
    border: "1px solid #e3e7ee",
    p: 3,
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  chartHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 1.5,
  },

  chartTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#182338",
  },

  chartSubtitle: {
    fontSize: "12px",
    color: "#67728a",
    mt: 0.3,
  },

  legendWrap: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 0.8,
  },

  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },

  legendText: {
    fontSize: "12px",
    color: "#475569",
    fontWeight: 500,
  },

  chartContainer: {
    bgcolor: "#fff",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
    p: 2,
    position: "relative",
    display: "flex",
    minHeight: 180,
  },

  chartYAxis: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: 65,
    pr: 1.5,
    py: 0.5,
    flexShrink: 0,
  },

  yTickRow: {
    display: "flex",
    alignItems: "center",
    position: "relative",
  },

  yTickLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    width: 55,
  },

  gridLine: {
    position: "absolute",
    left: 60,
    right: -620,
    height: "1px",
    borderTop: "1px dashed #e2e8f0",
    pointerEvents: "none",
  },

  svgWrap: {
    flex: 1,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    overflow: "hidden",
  },

  chartXLabels: {
    display: "flex",
    justifyContent: "space-between",
    px: 4,
    pt: 1,
    borderTop: "1px solid #f1f5f9",
  },

  xLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: 500,
  },

  /* ── Tabela de Lançamentos Recentes ── */
  tableCard: {
    bgcolor: "#fff",
    borderRadius: "14px",
    border: "1px solid #e3e7ee",
    p: 3,
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },

  thRow: {
    borderBottom: "1.5px solid #e2e8f0",
  },

  th: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.04em",
    py: 1.2,
    px: 2,
  },

  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s",
    "&:hover": {
      bgcolor: "#f8fafc",
    },
  },

  tdSub: {
    fontSize: "12px",
    color: "#64748b",
    py: 1.8,
    px: 2,
  },

  tdBold: {
    fontSize: "12.5px",
    fontWeight: 700,
    color: "#0f172a",
    py: 1.8,
    px: 2,
  },

  td: {
    fontSize: "12.5px",
    color: "#334155",
    py: 1.8,
    px: 2,
  },

  tdCategory: {
    fontSize: "12px",
    color: "#64748b",
    py: 1.8,
    px: 2,
  },

  tdValor: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#0f172a",
    textAlign: "right",
    py: 1.8,
    px: 2,
  },

  statusBadge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: 700,
    borderRadius: "14px",
    px: 1.4,
    py: 0.35,
    letterSpacing: "0.01em",
  },

  emptyTd: {
    py: 4,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px",
  },

  paginationRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    pt: 2.5,
    mt: 1,
    borderTop: "1px solid #f1f5f9",
  },

  pageInfo: {
    fontSize: "12px",
    color: "#64748b",
  },

  pageBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    bgcolor: "#fff",
    color: "#475569",
    transition: "all 0.15s",
    "&:hover:not(:disabled)": {
      bgcolor: "#f1f5f9",
      borderColor: "#cbd5e1",
    },
  },
};
