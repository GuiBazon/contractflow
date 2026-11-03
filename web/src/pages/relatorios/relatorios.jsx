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
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
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
  Snackbar,
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
  { label: "Financeiro", iconKey: "money", path: "/financeiro" },
  { label: "Calculadora", iconKey: "calculate" },
  { label: "Relatórios", iconKey: "bar_chart", active: true, path: "/relatorios" },
  { label: "Configurações", iconKey: "settings" },
];

/* ─────────────────────────────────────────────────────────
   Helpers de Formatação
───────────────────────────────────────────────────────── */
function formatBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

/* ─────────────────────────────────────────────────────────
   Definição dos 4 Tipos de Relatórios
───────────────────────────────────────────────────────── */
const RELATORIOS_CONFIG = [
  {
    id: "inadimplencia",
    titulo: "Inadimplência por Período",
    descricao: "Acompanhe a curva de pagamentos atrasados e perdas consolidadas.",
    icon: TrendingDownRoundedIcon,
    iconColor: "#2563eb",
    iconBg: "#e0f2fe",
    previewTitle: "Inadimplência e Valores em Atraso",
  },
  {
    id: "receitas",
    titulo: "Receitas por Cliente",
    descricao: "Consolidação de faturamento por carteira e faturamento recorrente.",
    icon: PieChartRoundedIcon,
    iconColor: "#2563eb",
    iconBg: "#e0f2fe",
    previewTitle: "Top 4 Maiores Contratos",
  },
  {
    id: "status",
    titulo: "Contratos por Status",
    descricao: "Distribuição geral de assinaturas e saúde de contratos ativos.",
    icon: DescriptionRoundedIcon,
    iconColor: "#2563eb",
    iconBg: "#e0f2fe",
    previewTitle: "Distribuição de Contratos por Status",
  },
  {
    id: "aging",
    titulo: "Aging de Recebíveis",
    descricao: "Análise de atrasos por faixas de dias (1-30, 30-60, +90 dias).",
    icon: AccessTimeRoundedIcon,
    iconColor: "#2563eb",
    iconBg: "#e0f2fe",
    previewTitle: "Aging de Recebíveis (Faixas de Atraso)",
  },
];

export default function Relatorios() {
  const navigate = useNavigate();

  // Estados de dados da API (100% REAIS)
  const [rawContratos, setRawContratos] = useState([]);
  const [rawClientes, setRawClientes] = useState([]);
  const [rawPagamentos, setRawPagamentos] = useState([]);
  const [rawParcelas, setRawParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState("");

  // Filtros
  const [relatorioSelecionado, setRelatorioSelecionado] = useState("receitas");
  const [periodoFiltro, setPeriodoFiltro] = useState("60d");
  const [clienteGeral, setClienteGeral] = useState("TODOS");
  const [searchValue, setSearchValue] = useState("");

  // Paginação da tabela de detalhamento
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Notificação / Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

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

      // Carregar parcelas para contratos relevantes
      const contratosParaParcelas = contratos
        .filter((c) => Number(c.total_parcelas || 0) > 0 || c.id)
        .slice(0, 30);

      if (contratosParaParcelas.length > 0) {
        const promessas = contratosParaParcelas.map((c) =>
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
      console.error("Erro ao carregar dados dos relatórios:", err);
      const msg = err.response?.data?.message || err.message;
      setErro(
        msg
          ? `Falha ao carregar dados da API: ${msg}`
          : "Não foi possível conectar ao servidor. Verifique se a API está rodando."
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

  /* ── Filtragem dos dados conforme período, cliente e busca ── */
  const dadosFiltrados = useMemo(() => {
    const agora = new Date();

    // Data de corte para o período selecionado
    let dataCorte = null;
    if (periodoFiltro === "30d") {
      dataCorte = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (periodoFiltro === "60d") {
      dataCorte = new Date(agora.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (periodoFiltro === "90d") {
      dataCorte = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (periodoFiltro === "ano") {
      dataCorte = new Date(agora.getFullYear(), 0, 1);
    }

    // Filtrar contratos reais
    let contratos = [...rawContratos];
    if (clienteGeral !== "TODOS") {
      contratos = contratos.filter((c) => Number(c.cliente_id) === Number(clienteGeral));
    }
    if (dataCorte) {
      contratos = contratos.filter((c) => {
        const d = new Date(c.data_inicio || c.created_at || c.data_fim);
        return d >= dataCorte;
      });
    }
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      contratos = contratos.filter(
        (c) =>
          (c.numero && c.numero.toLowerCase().includes(q)) ||
          (c.cliente_nome && c.cliente_nome.toLowerCase().includes(q)) ||
          (c.descricao && c.descricao.toLowerCase().includes(q))
      );
    }

    // Filtrar pagamentos reais
    let pagamentos = [...rawPagamentos];
    if (clienteGeral !== "TODOS") {
      pagamentos = pagamentos.filter((p) => Number(p.cliente_id) === Number(clienteGeral));
    }
    if (dataCorte) {
      pagamentos = pagamentos.filter((p) => {
        const d = new Date(p.data_pagamento || p.created_at);
        return d >= dataCorte;
      });
    }

    // Filtrar parcelas reais
    let parcelas = [...rawParcelas];
    if (clienteGeral !== "TODOS") {
      parcelas = parcelas.filter((p) => Number(p.cliente_id) === Number(clienteGeral));
    }
    if (dataCorte) {
      parcelas = parcelas.filter((p) => {
        const d = new Date(p.data_vencimento || p.created_at);
        return d >= dataCorte;
      });
    }

    return { contratos, pagamentos, parcelas };
  }, [rawContratos, rawPagamentos, rawParcelas, clienteGeral, periodoFiltro, searchValue]);

  /* ── Cálculos da Pré-visualização do Relatório Ativo 100% REAIS ── */
  const previewData = useMemo(() => {
    const { contratos, parcelas } = dadosFiltrados;

    if (relatorioSelecionado === "receitas") {
      // Maiores contratos da API
      const lista = [...contratos]
        .sort((a, b) => Number(b.valor_total || 0) - Number(a.valor_total || 0))
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          nome: c.cliente_nome || `Contrato ${c.numero || c.id}`,
          valor: Number(c.valor_total || 0),
        }));

      const maxVal = Math.max(...lista.map((i) => i.valor), 1);
      return {
        tipo: "receitas",
        titulo: "Top 4 Maiores Contratos",
        itens: lista.map((i) => ({
          ...i,
          pct: Math.min(100, Math.round((i.valor / maxVal) * 100)),
        })),
      };
    }

    if (relatorioSelecionado === "inadimplencia") {
      // Contratos com pendência ou inadimplentes da API
      const atrasados = contratos
        .filter((c) => c.status === "INADIMPLENTE" || Number(c.pendente || 0) > 0)
        .sort((a, b) => Number(b.pendente || 0) - Number(a.pendente || 0))
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          nome: c.cliente_nome || `Contrato ${c.numero || c.id}`,
          valor: Number(c.pendente || c.valor_total || 0),
        }));

      const maxVal = Math.max(...atrasados.map((i) => i.valor), 1);
      return {
        tipo: "inadimplencia",
        titulo: "Contratos com Maior Inadimplência",
        itens: atrasados.map((i) => ({
          ...i,
          pct: Math.min(100, Math.round((i.valor / maxVal) * 100)),
        })),
      };
    }

    if (relatorioSelecionado === "status") {
      // Distribuição real por status
      const total = contratos.length;
      const ativos = contratos.filter((c) => c.status === "ATIVO").length;
      const inadimplentes = contratos.filter((c) => c.status === "INADIMPLENTE").length;
      const pendentes = contratos.filter((c) => ["PENDENTE", "RASCUNHO"].includes(c.status)).length;
      const encerrados = contratos.filter((c) => ["ENCERRADO", "CANCELADO"].includes(c.status)).length;

      const itens = [
        { id: "s1", nome: "Ativos", valor: ativos, pct: total > 0 ? Math.round((ativos / total) * 100) : 0 },
        { id: "s2", nome: "Inadimplentes", valor: inadimplentes, pct: total > 0 ? Math.round((inadimplentes / total) * 100) : 0 },
        { id: "s3", nome: "Pendentes", valor: pendentes, pct: total > 0 ? Math.round((pendentes / total) * 100) : 0 },
        { id: "s4", nome: "Encerrados", valor: encerrados, pct: total > 0 ? Math.round((encerrados / total) * 100) : 0 },
      ];

      return {
        tipo: "status",
        titulo: "Distribuição de Contratos por Status",
        itens,
      };
    }

    if (relatorioSelecionado === "aging") {
      // Aging real de parcelas
      const hoje = new Date();
      let faixa1 = 0; // 1-30 dias
      let faixa2 = 0; // 31-60 dias
      let faixa3 = 0; // 61-90 dias
      let faixa4 = 0; // +90 dias

      parcelas.forEach((p) => {
        if (p.situacao === "VENCIDA" || (p.data_vencimento && new Date(p.data_vencimento) < hoje)) {
          const dias = Math.max(1, Math.floor((hoje - new Date(p.data_vencimento)) / (1000 * 60 * 60 * 24)));
          const val = Number(p.valor || 0);
          if (dias <= 30) faixa1 += val;
          else if (dias <= 60) faixa2 += val;
          else if (dias <= 90) faixa3 += val;
          else faixa4 += val;
        }
      });

      const totalVal = faixa1 + faixa2 + faixa3 + faixa4;
      const itens = [
        { id: "a1", nome: "1 a 30 dias", valor: faixa1, pct: totalVal > 0 ? Math.round((faixa1 / totalVal) * 100) : 0 },
        { id: "a2", nome: "31 a 60 dias", valor: faixa2, pct: totalVal > 0 ? Math.round((faixa2 / totalVal) * 100) : 0 },
        { id: "a3", nome: "61 a 90 dias", valor: faixa3, pct: totalVal > 0 ? Math.round((faixa3 / totalVal) * 100) : 0 },
        { id: "a4", nome: "Acima de 90 dias", valor: faixa4, pct: totalVal > 0 ? Math.round((faixa4 / totalVal) * 100) : 0 },
      ];

      return {
        tipo: "aging",
        titulo: "Aging de Recebíveis (Faixas de Atraso)",
        itens,
      };
    }

    return { tipo: "receitas", titulo: "Top 4 Maiores Contratos", itens: [] };
  }, [relatorioSelecionado, dadosFiltrados]);

  /* ── Exportação do Relatório para Arquivo XLS / CSV (100% REAL) ── */
  function handleExportarXLS() {
    try {
      const relConfig = RELATORIOS_CONFIG.find((r) => r.id === relatorioSelecionado);
      const nomeRel = relConfig ? relConfig.titulo : "Relatorio";

      let csvContent = "\uFEFF";
      csvContent += `Relatório: ${nomeRel}\n`;
      csvContent += `Período: ${periodoFiltro}\n`;
      csvContent += `Filtro Cliente: ${clienteGeral}\n`;
      csvContent += `Data de Geração: ${new Date().toLocaleString("pt-BR")}\n\n`;

      if (relatorioSelecionado === "receitas") {
        csvContent += "Contrato;Cliente;Valor Total (R$);Recebido (R$);Pendente (R$);Status;Início;Término\n";
        dadosFiltrados.contratos.forEach((c) => {
          csvContent += `"${c.numero || `CTR-${c.id}`}";"${c.cliente_nome || "—"}";"${Number(c.valor_total || 0).toFixed(2)}";"${Number(c.recebido || 0).toFixed(2)}";"${Number(c.pendente || 0).toFixed(2)}";"${c.status || "—"}";"${formatDate(c.data_inicio)}";"${formatDate(c.data_fim)}"\n`;
        });
      } else if (relatorioSelecionado === "inadimplencia") {
        csvContent += "Contrato;Cliente;Valor Pendente (R$);Valor Total (R$);Status;Data Vencimento\n";
        dadosFiltrados.contratos
          .filter((c) => c.status === "INADIMPLENTE" || Number(c.pendente || 0) > 0)
          .forEach((c) => {
            csvContent += `"${c.numero || `CTR-${c.id}`}";"${c.cliente_nome || "—"}";"${Number(c.pendente || 0).toFixed(2)}";"${Number(c.valor_total || 0).toFixed(2)}";"${c.status || "—"}";"${formatDate(c.data_fim)}"\n`;
          });
      } else if (relatorioSelecionado === "aging") {
        csvContent += "Faixa de Atraso;Valor Total (R$);Participação (%)\n";
        previewData.itens.forEach((item) => {
          csvContent += `"${item.nome}";"${item.valor.toFixed(2)}";"${item.pct}%"\n`;
        });
      } else {
        csvContent += "Status;Quantidade de Contratos;Proporção (%)\n";
        previewData.itens.forEach((item) => {
          csvContent += `"${item.nome}";"${item.valor}";"${item.pct}%"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio_${relatorioSelecionado}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({
        open: true,
        message: "Relatório gerado e baixado com sucesso!",
        severity: "success",
      });
    } catch (err) {
      console.error("Erro ao exportar:", err);
      setSnackbar({
        open: true,
        message: "Falha ao exportar relatório.",
        severity: "error",
      });
    }
  }

  /* ── Itens paginados da tabela de detalhamento ── */
  const contratosPaginados = useMemo(() => {
    const total = dadosFiltrados.contratos.length;
    const inicio = (pagina - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return {
      itens: dadosFiltrados.contratos.slice(inicio, fim),
      total,
      totalPaginas: Math.max(1, Math.ceil(total / itensPorPagina)),
    };
  }, [dadosFiltrados.contratos, pagina]);

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
          <Typography sx={sx.pageTitle}>Relatórios e Inteligência de Faturamento</Typography>

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

        {/* ── Seção: Relatórios Disponíveis & Pré-visualização ── */}
        <Box sx={sx.sectionContainer}>
          {/* Coluna Esquerda: Grid 2x2 dos Relatórios */}
          <Box sx={sx.leftColumn}>
            <Typography sx={sx.sectionSubtitle}>Relatórios Disponíveis</Typography>

            <Box sx={sx.cardsGrid}>
              {RELATORIOS_CONFIG.map((rel) => {
                const isSelected = relatorioSelecionado === rel.id;
                const IconComponent = rel.icon;

                return (
                  <Box
                    key={rel.id}
                    onClick={() => {
                      setRelatorioSelecionado(rel.id);
                      setPagina(1);
                    }}
                    sx={{
                      ...sx.reportCard,
                      ...(isSelected ? sx.reportCardActive : {}),
                    }}
                  >
                    <Box sx={sx.cardIconBox}>
                      <IconComponent sx={{ fontSize: 22, color: "#2563eb" }} />
                    </Box>

                    <Typography sx={sx.cardTitle}>{rel.titulo}</Typography>
                    <Typography sx={sx.cardDesc}>{rel.descricao}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Coluna Direita: Card de Pré-visualização do Relatório */}
          <Box sx={sx.previewCard}>
            <Box sx={sx.previewHeader}>
              <Typography sx={sx.previewTitle}>Pré-visualização do Relatório</Typography>
              <Box
                component="button"
                onClick={handleExportarXLS}
                sx={sx.exportBtn}
                title="Exportar dados para Excel (.csv)"
              >
                <FileDownloadRoundedIcon sx={{ fontSize: 15 }} />
                Exportar XLS
              </Box>
            </Box>

            <Box sx={sx.divider} />

            {/* Filtro de Período */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={sx.periodoLabel}>Filtrar Período:</Typography>
              <Box sx={sx.selectWrap}>
                <Box
                  component="select"
                  value={periodoFiltro}
                  onChange={(e) => {
                    setPeriodoFiltro(e.target.value);
                    setPagina(1);
                  }}
                  sx={sx.periodoSelect}
                >
                  <option value="60d">Últimos 60 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                  <option value="ano">Ano Atual</option>
                  <option value="todos">Todos os Períodos</option>
                </Box>
                <KeyboardArrowDownRoundedIcon sx={sx.selectArrow} />
              </Box>
            </Box>

            {/* Painel de Resultados do Relatório Selecionado */}
            <Box sx={sx.previewBox}>
              <Typography sx={sx.previewBoxTitle}>{previewData.titulo}</Typography>

              {loading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <Box key={i}>
                      <Skeleton variant="text" width="60%" height={18} />
                      <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1, mt: 0.8 }} />
                    </Box>
                  ))}
                </Box>
              ) : previewData.itens.length === 0 ? (
                <Typography sx={{ fontSize: "12.5px", color: "#94a3b8", py: 2, textAlign: "center" }}>
                  Nenhum registro encontrado para este relatório no período selecionado.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}>
                  {previewData.itens.map((item) => (
                    <Box key={item.id} sx={sx.metricRow}>
                      <Box sx={sx.metricRowHeader}>
                        <Typography sx={sx.metricLabel} noWrap>
                          {item.nome}
                        </Typography>
                        <Typography sx={sx.metricValue}>
                          {previewData.tipo === "status" ? `${item.valor} contrato(s)` : formatBRL(item.valor)}
                        </Typography>
                      </Box>
                      <Box sx={sx.progressTrack}>
                        <Box
                          sx={{
                            ...sx.progressBar,
                            width: `${item.pct || 0}%`,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* ── Tabela de Detalhamento dos Registros da Inteligência (100% REAIS) ── */}
        <Box sx={sx.detailCard}>
          <Box sx={sx.detailCardHeader}>
            <Box>
              <Typography sx={sx.detailCardTitle}>
                Detalhamento dos Dados • {RELATORIOS_CONFIG.find((r) => r.id === relatorioSelecionado)?.titulo}
              </Typography>
              <Typography sx={sx.detailCardSub}>
                Listagem analítica com registros reais correspondentes aos filtros aplicados.
              </Typography>
            </Box>

            <Typography sx={sx.detailCountBadge}>
              {contratosPaginados.total} registro{contratosPaginados.total !== 1 ? "s" : ""}
            </Typography>
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Box component="table" sx={sx.table}>
              <Box component="thead">
                <Box component="tr" sx={sx.thRow}>
                  <Box component="th" sx={sx.th}>Contrato</Box>
                  <Box component="th" sx={sx.th}>Cliente</Box>
                  <Box component="th" sx={sx.th}>Valor Total</Box>
                  <Box component="th" sx={sx.th}>Recebido</Box>
                  <Box component="th" sx={sx.th}>Pendente</Box>
                  <Box component="th" sx={sx.th}>Status</Box>
                  <Box component="th" sx={sx.th}>Vigência</Box>
                </Box>
              </Box>

              <Box component="tbody">
                {loading ? (
                  [1, 2, 3].map((n) => (
                    <Box component="tr" key={n}>
                      <Box component="td" colSpan={7} sx={{ p: 1.5 }}>
                        <Skeleton variant="text" height={26} />
                      </Box>
                    </Box>
                  ))
                ) : contratosPaginados.itens.length === 0 ? (
                  <Box component="tr">
                    <Box component="td" colSpan={7} sx={sx.emptyTd}>
                      Nenhum contrato encontrado para os filtros selecionados.
                    </Box>
                  </Box>
                ) : (
                  contratosPaginados.itens.map((c) => {
                    const statusColor =
                      c.status === "ATIVO"
                        ? { bg: "#e7f9ef", color: "#1f9d55" }
                        : c.status === "INADIMPLENTE"
                        ? { bg: "#fdeceb", color: "#e0392b" }
                        : { bg: "#e8f0fe", color: "#2563eb" };

                    return (
                      <Box component="tr" key={c.id} sx={sx.tr}>
                        <Box component="td" sx={sx.tdBold}>
                          {c.numero || `CTR-${c.id}`}
                        </Box>
                        <Box component="td" sx={sx.td}>
                          {c.cliente_nome || "—"}
                        </Box>
                        <Box component="td" sx={sx.tdBold}>
                          {formatBRL(c.valor_total)}
                        </Box>
                        <Box component="td" sx={{ ...sx.td, color: "#1f9d55", fontWeight: 600 }}>
                          {formatBRL(c.recebido)}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            ...sx.td,
                            color: Number(c.pendente || 0) > 0 ? "#e0392b" : "#67728a",
                            fontWeight: 600,
                          }}
                        >
                          {formatBRL(c.pendente)}
                        </Box>
                        <Box component="td" sx={sx.td}>
                          <Box
                            sx={{
                              ...sx.statusChip,
                              bgcolor: statusColor.bg,
                              color: statusColor.color,
                            }}
                          >
                            {c.status}
                          </Box>
                        </Box>
                        <Box component="td" sx={sx.tdSub}>
                          {formatDate(c.data_inicio)} até {formatDate(c.data_fim)}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>

          {/* Paginação da Tabela */}
          {contratosPaginados.totalPaginas > 1 && (
            <Box sx={sx.paginationRow}>
              <Typography sx={sx.pageInfo}>
                Página {pagina} de {contratosPaginados.totalPaginas}
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
                  disabled={pagina >= contratosPaginados.totalPaginas}
                  onClick={() => setPagina((p) => Math.min(contratosPaginados.totalPaginas, p + 1))}
                  sx={{
                    ...sx.pageBtn,
                    opacity: pagina >= contratosPaginados.totalPaginas ? 0.4 : 1,
                    cursor: pagina >= contratosPaginados.totalPaginas ? "not-allowed" : "pointer",
                  }}
                >
                  <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Snackbar de Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: "8px" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
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

  /* ── Seção Grid & Preview ── */
  sectionContainer: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", lg: "1.2fr 0.8fr" },
    gap: 3,
    alignItems: "start",
  },

  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 1.8,
  },

  sectionSubtitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#182338",
    letterSpacing: "-0.01em",
  },

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
    gap: 2,
  },

  reportCard: {
    bgcolor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e3e7ee",
    p: 2.8,
    display: "flex",
    flexDirection: "column",
    gap: 1,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    transition: "all 0.18s ease-in-out",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
      borderColor: "#cbd5e1",
    },
  },

  reportCardActive: {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 1.5px #3b82f6, 0 4px 12px rgba(59, 130, 246, 0.12)",
    bgcolor: "#fcfdff",
  },

  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: "9px",
    bgcolor: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    mb: 0.5,
  },

  cardTitle: {
    fontSize: "14.5px",
    fontWeight: 700,
    color: "#182338",
    lineHeight: 1.3,
  },

  cardDesc: {
    fontSize: "12px",
    color: "#67728a",
    lineHeight: 1.45,
  },

  /* ── Card da Pré-visualização ── */
  previewCard: {
    bgcolor: "#fff",
    borderRadius: "14px",
    border: "1px solid #e3e7ee",
    p: 3,
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
    display: "flex",
    flexDirection: "column",
  },

  previewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1,
  },

  previewTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#182338",
  },

  exportBtn: {
    display: "flex",
    alignItems: "center",
    gap: 0.6,
    bgcolor: "#e8f0fe",
    color: "#2563eb",
    border: "none",
    borderRadius: "6px",
    px: 1.5,
    py: 0.65,
    fontSize: "11.5px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s",
    "&:hover": {
      bgcolor: "#dbeafe",
    },
  },

  divider: {
    height: "1px",
    bgcolor: "#f1f4f9",
    my: 2.2,
  },

  periodoLabel: {
    fontSize: "12px",
    color: "#475569",
    fontWeight: 600,
    mb: 0.8,
  },

  selectWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },

  periodoSelect: {
    width: "100%",
    height: 38,
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    px: 1.5,
    fontSize: "12.5px",
    fontWeight: 500,
    color: "#1e293b",
    bgcolor: "#fff",
    cursor: "pointer",
    outline: "none",
    appearance: "none",
    fontFamily: "inherit",
    "&:focus": {
      borderColor: "#3b82f6",
    },
  },

  selectArrow: {
    position: "absolute",
    right: 10,
    fontSize: 20,
    color: "#64748b",
    pointerEvents: "none",
  },

  previewBox: {
    bgcolor: "#f8fafc",
    border: "1px solid #edf2f7",
    borderRadius: "10px",
    p: 2.4,
  },

  previewBoxTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#182338",
    mb: 2,
  },

  metricRow: {
    display: "flex",
    flexDirection: "column",
    gap: 0.7,
  },

  metricRowHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1,
  },

  metricLabel: {
    fontSize: "12.5px",
    fontWeight: 500,
    color: "#334155",
  },

  metricValue: {
    fontSize: "12.5px",
    fontWeight: 700,
    color: "#0f172a",
  },

  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 4,
    bgcolor: "#e2e8f0",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: 4,
    bgcolor: "#3b82f6",
    transition: "width 0.4s ease",
  },

  /* ── Tabela de Detalhamento ── */
  detailCard: {
    bgcolor: "#fff",
    borderRadius: "14px",
    border: "1px solid #e3e7ee",
    p: 3,
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  },

  detailCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mb: 2.5,
    flexWrap: "wrap",
    gap: 1,
  },

  detailCardTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#182338",
  },

  detailCardSub: {
    fontSize: "12px",
    color: "#67728a",
    mt: 0.3,
  },

  detailCountBadge: {
    fontSize: "11.5px",
    fontWeight: 600,
    color: "#2563eb",
    bgcolor: "#eff6ff",
    px: 1.4,
    py: 0.5,
    borderRadius: "6px",
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
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    py: 1.2,
    px: 1.5,
  },

  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s",
    "&:hover": {
      bgcolor: "#f8fafc",
    },
  },

  td: {
    fontSize: "12.5px",
    color: "#334155",
    py: 1.5,
    px: 1.5,
  },

  tdBold: {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#0f172a",
    py: 1.5,
    px: 1.5,
  },

  tdSub: {
    fontSize: "11.5px",
    color: "#64748b",
    py: 1.5,
    px: 1.5,
  },

  emptyTd: {
    py: 4,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px",
  },

  statusChip: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: 700,
    borderRadius: "6px",
    px: 1.2,
    py: 0.35,
    letterSpacing: "0.02em",
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
