import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

// MUI Components
import {
  Box,
  Typography,
  InputBase,
  Avatar,
  Badge,
  CircularProgress,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
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
  { label: "Contratos", iconKey: "description", active: true, path: "/contratos" },
  { label: "Calendário", iconKey: "calendar", path: "/calendario" },
  { label: "Financeiro", iconKey: "money", path: "/financeiro" },
  { label: "Calculadora", iconKey: "calculate" },
  { label: "Relatórios", iconKey: "bar_chart", path: "/relatorios" },
  { label: "Configurações", iconKey: "settings" },
];

/* ─────────────────────────────────────────────────────────
   Helpers
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

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const data = `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
  return `${data} às ${hora}`;
}

function formatDateInput(dateStr) {
  if (!dateStr) return "";
  return typeof dateStr === "string" ? dateStr.split("T")[0] : "";
}

/* Duração aproximada da vigência, em meses */
function calcDuracaoMeses(inicio, fim) {
  if (!inicio || !fim) return 0;
  const a = new Date(inicio);
  const b = new Date(fim);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  let meses =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() >= a.getUTCDate()) meses += 1;
  return Math.max(0, meses);
}

function formatCpfCnpj(value) {
  if (!value) return "—";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }
  return value;
}

const STATUS_BADGES = {
  ATIVO: { label: "ATIVO", bg: "#e7f9ef", color: "#1f9d55" },
  VENCIDO: { label: "VENCIDO", bg: "#fdeceb", color: "#e0392b" },
  INADIMPLENTE: { label: "VENCIDO", bg: "#fdeceb", color: "#e0392b" },
  ENCERRADO: { label: "ENCERRADO", bg: "#f0f2f7", color: "#67728a" },
  CANCELADO: { label: "CANCELADO", bg: "#f0f2f7", color: "#67728a" },
  RASCUNHO: { label: "RASCUNHO", bg: "#fef3c7", color: "#d97706" },
  PENDENTE: { label: "RASCUNHO", bg: "#fef3c7", color: "#d97706" },
  EM_RENOVACAO: { label: "EM RENOVAÇÃO", bg: "#e8f0fe", color: "#2563eb" },
};

/* Eventos do histórico → ícone/cor da timeline */
const ACAO_LABELS = {
  CRIADO: "Contrato criado",
  STATUS: "Status alterado",
  ALTERADO: "Contrato atualizado",
  PARCELAS: "Parcelas geradas",
  PARCELA_ALTERADA: "Parcela alterada",
  DOCUMENTO: "Documento anexado",
};

const HISTORICO_VISUAL = {
  CRIADO: { color: "#2563eb", bg: "#e8f0fe", Icon: AddCircleOutlineRoundedIcon },
  STATUS: { color: "#16a34a", bg: "#dcfce7", Icon: CheckCircleOutlineRoundedIcon },
  ALTERADO: { color: "#2563eb", bg: "#e8f0fe", Icon: PlayCircleOutlineRoundedIcon },
  PARCELAS: { color: "#2563eb", bg: "#e8f0fe", Icon: PlayCircleOutlineRoundedIcon },
  PARCELA_ALTERADA: { color: "#2563eb", bg: "#e8f0fe", Icon: PlayCircleOutlineRoundedIcon },
  DOCUMENTO: { color: "#d97706", bg: "#fef3c7", Icon: CheckCircleOutlineRoundedIcon },
};

/* ─────────────────────────────────────────────────────────
   Componente Principal: Contratos
───────────────────────────────────────────────────────── */
export default function Contratos() {
  const navigate = useNavigate();
  const { id: rotaId } = useParams();

  // Estados de dados principais
  const [rawContratos, setRawContratos] = useState([]);
  const [rawClientes, setRawClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState("");

  // Filtros e busca
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS"); // "TODOS" | "ATIVOS" | "VENCIDOS" | "ENCERRADOS"
  const [clienteGeral, setClienteGeral] = useState("TODOS");

  // Visualização de Detalhes do Contrato
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState(
    rotaId ? Number(rotaId) : null
  );
  const [contratoDetalhe, setContratoDetalhe] = useState(null);
  const [parcelasDetalhe, setParcelasDetalhe] = useState([]);
  const [historicoDetalhe, setHistoricoDetalhe] = useState([]);
  const [documentosDetalhe, setDocumentosDetalhe] = useState([]);
  const [abaDetalhe, setAbaDetalhe] = useState("PARCELAS"); // "PARCELAS" | "PAGAMENTOS" | "DOCUMENTOS" | "TIMELINE"
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Modal Novo Contrato
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [salvandoContrato, setSalvandoContrato] = useState(false);
  const [erroModal, setErroModal] = useState("");
  const [novoContrato, setNovoContrato] = useState({
    cliente_id: "",
    numero: "",
    descricao: "",
    valor_total: "",
    total_parcelas: "12",
    data_inicio: new Date().toISOString().split("T")[0],
    data_fim: "",
    forma_pagamento: "BOLETO",
    observacoes: "",
  });

  // Modal Editar Contrato
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Feedback do sistema
  const [feedbackSuccess, setFeedbackSuccess] = useState("");

  // Usuário autenticado
  const storageUser = JSON.parse(localStorage.getItem("usuario") || "{}");
  const nomeUsuario = storageUser?.nome || "Rodrigo Souza";
  const initials = nomeUsuario
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  /* ── Sincroniza rota :id com estado interno ── */
  useEffect(() => {
    setContratoSelecionadoId(rotaId ? Number(rotaId) : null);
  }, [rotaId]);

  /* ── Carregar Lista de Contratos e Clientes ── */
  const carregarLista = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErro("");

    try {
      const [resContratos, resClientes] = await Promise.all([
        sheets.getContratos({ limit: 100 }),
        sheets.getClientes({ limit: 100 }),
      ]);

      const contratos = resContratos?.data?.data || resContratos?.data || [];
      const clientes = resClientes?.data?.data || resClientes?.data || [];

      setRawContratos(contratos);
      setRawClientes(clientes);
    } catch (err) {
      console.error("Erro ao carregar contratos:", err);
      const msg = err.response?.data?.message || err.message;
      setErro(msg || "Não foi possível carregar os contratos da API.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  /* ── Carregar Detalhes de um Contrato Específico ── */
  const carregarDetalhesContrato = useCallback(
    async (id) => {
      if (!id) {
        setContratoDetalhe(null);
        return;
      }
      setLoadingDetalhes(true);
      try {
        const [resContrato, resParcelas, resHist, resDocs] = await Promise.allSettled([
          sheets.getContratoById(id),
          sheets.getParcelas(id),
          sheets.getHistoricoContrato(id),
          sheets.getDocumentosContrato(id),
        ]);

        if (resContrato.status === "fulfilled") {
          setContratoDetalhe(resContrato.value.data);
          setEditForm(resContrato.value.data);
        } else {
          // Fallback buscando no array já carregado
          const encontrado = rawContratos.find((c) => Number(c.id) === Number(id));
          setContratoDetalhe(encontrado || null);
          setEditForm(encontrado || {});
        }

        if (resParcelas.status === "fulfilled") {
          setParcelasDetalhe(resParcelas.value.data?.data || resParcelas.value.data || []);
        } else {
          setParcelasDetalhe([]);
        }

        if (resHist.status === "fulfilled") {
          setHistoricoDetalhe(resHist.value.data || []);
        } else {
          setHistoricoDetalhe([]);
        }

        if (resDocs.status === "fulfilled") {
          const docs = resDocs.value.data;
          setDocumentosDetalhe(docs?.data || (Array.isArray(docs) ? docs : []));
        } else {
          setDocumentosDetalhe([]);
        }
      } catch (err) {
        console.error("Erro ao buscar detalhes do contrato:", err);
      } finally {
        setLoadingDetalhes(false);
      }
    },
    [rawContratos]
  );

  useEffect(() => {
    if (contratoSelecionadoId) {
      carregarDetalhesContrato(contratoSelecionadoId);
    } else {
      setContratoDetalhe(null);
    }
  }, [contratoSelecionadoId, carregarDetalhesContrato]);

  /* ── Logout ── */
  function handleLogout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  }

  /* ── Enriquecimento e Contadores de Contratos ── */
  const contratosProcessados = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return rawContratos.map((c) => {
      const totalParc = Number(c.total_parcelas || c.quantidade_parcelas || 0);
      const pagas = Number(c.parcelas_pagas || 0);
      const pct = totalParc > 0 ? Math.min(100, Math.round((pagas / totalParc) * 100)) : 0;

      let status = c.status || "ATIVO";
      if (status === "INADIMPLENTE") status = "VENCIDO";

      const encerradoOuCancelado = status === "ENCERRADO" || status === "CANCELADO";
      const fimVigencia = c.data_fim ? new Date(c.data_fim) : null;
      const vencido = Boolean(
        status === "VENCIDO" ||
          (!encerradoOuCancelado &&
            fimVigencia &&
            fimVigencia < hoje &&
            Number(c.pendente || 0) > 0)
      );

      return {
        ...c,
        statusLabel: status,
        vencido,
        parcelasPagas: pagas,
        totalParcelas: totalParc,
        progressoPercentual: Number.isFinite(pct) ? pct : 0,
      };
    });
  }, [rawContratos]);

  const contagemTodos = contratosProcessados.length;
  const contagemAtivos = contratosProcessados.filter((c) => c.statusLabel === "ATIVO").length;
  const contagemVencidos = contratosProcessados.filter((c) => c.vencido).length;
  const contagemEncerrados = contratosProcessados.filter(
    (c) => c.statusLabel === "ENCERRADO" || c.statusLabel === "CANCELADO"
  ).length;

  /* ── Filtro da Listagem ── */
  const contratosFiltrados = useMemo(() => {
    let list = [...contratosProcessados];

    // Filtro por Cliente
    if (clienteGeral && clienteGeral !== "TODOS") {
      list = list.filter((c) => Number(c.cliente_id) === Number(clienteGeral));
    }

    // Filtro de Pílula
    if (statusFilter === "ATIVOS") {
      list = list.filter((c) => c.statusLabel === "ATIVO");
    } else if (statusFilter === "VENCIDOS") {
      list = list.filter((c) => c.vencido);
    } else if (statusFilter === "ENCERRADOS") {
      list = list.filter(
        (c) => c.statusLabel === "ENCERRADO" || c.statusLabel === "CANCELADO"
      );
    }

    // Busca textual
    if (searchValue && searchValue.trim()) {
      const q = searchValue.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.numero && String(c.numero).toLowerCase().includes(q)) ||
          (c.descricao && c.descricao.toLowerCase().includes(q)) ||
          (c.cliente_nome && c.cliente_nome.toLowerCase().includes(q))
      );
    }

    return list;
  }, [contratosProcessados, clienteGeral, statusFilter, searchValue]);

  /* ── Ações no Detalhe do Contrato ── */
  async function handleEncerrarContrato() {
    if (!contratoDetalhe) return;
    if (contratoDetalhe.status === "ENCERRADO") {
      setFeedbackSuccess("Este contrato já está encerrado.");
      return;
    }
    if (
      !window.confirm(
        `Tem certeza que deseja encerrar o contrato #${contratoDetalhe.numero}?`
      )
    )
      return;

    try {
      await sheets.updateContratoStatus(contratoDetalhe.id, "ENCERRADO");
      setFeedbackSuccess("Contrato encerrado com sucesso!");
      await carregarDetalhesContrato(contratoDetalhe.id);
      await carregarLista(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert(msg || "Erro ao encerrar contrato.");
    }
  }

  async function handleSalvarEdicao(e) {
    e.preventDefault();
    if (!contratoDetalhe) return;

    // A API só aceita os campos abaixo e datas no formato YYYY-MM-DD.
    const payload = {
      descricao: editForm?.descricao || null,
      data_inicio: formatDateInput(editForm?.data_inicio) || null,
      data_fim: formatDateInput(editForm?.data_fim) || null,
      forma_pagamento: editForm?.forma_pagamento || null,
      observacoes: editForm?.observacoes || null,
    };

    try {
      await sheets.updateContrato(contratoDetalhe.id, payload);
      setFeedbackSuccess("Contrato atualizado com sucesso!");
      setModalEditarAberto(false);
      await carregarDetalhesContrato(contratoDetalhe.id);
      await carregarLista(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert(msg || "Erro ao salvar alterações no contrato.");
    }
  }

  /* ── Documentos: visualizar / baixar ── */
  async function handleAbrirDocumento(doc) {
    if (!contratoDetalhe || !doc?.id) return;
    try {
      const res = await sheets.downloadDocumento(contratoDetalhe.id, doc.id);
      const blob = new Blob([res.data], {
        type: doc.mime || res.headers?.["content-type"] || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert(msg || "Não foi possível abrir o documento.");
    }
  }

  function handleExportarPdf() {
    window.print();
  }

  /* ── Submissão do Modal Novo Contrato ── */
  async function handleCriarContrato(e) {
    e.preventDefault();
    setErroModal("");

    if (!novoContrato.cliente_id) {
      setErroModal("Por favor, selecione o cliente.");
      return;
    }
    if (!novoContrato.descricao.trim()) {
      setErroModal("A descrição / título do contrato é obrigatória.");
      return;
    }
    if (!novoContrato.valor_total) {
      setErroModal("O valor total do contrato é obrigatório.");
      return;
    }

    setSalvandoContrato(true);
    try {
      const numero =
        novoContrato.numero ||
        `CT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

      await sheets.createContrato({
        cliente_id: Number(novoContrato.cliente_id),
        numero,
        descricao: novoContrato.descricao.trim(),
        valor_total: Number(novoContrato.valor_total),
        quantidade_parcelas: Number(novoContrato.total_parcelas || 1),
        data_inicio: novoContrato.data_inicio,
        data_fim: novoContrato.data_fim || null,
        forma_pagamento: novoContrato.forma_pagamento,
        observacoes: novoContrato.observacoes || null,
        status: "ATIVO",
      });

      setFeedbackSuccess("Contrato criado com sucesso!");
      setModalNovoAberto(false);
      setNovoContrato({
        cliente_id: "",
        numero: "",
        descricao: "",
        valor_total: "",
        total_parcelas: "12",
        data_inicio: new Date().toISOString().split("T")[0],
        data_fim: "",
        forma_pagamento: "BOLETO",
        observacoes: "",
      });
      await carregarLista(true);
    } catch (err) {
      console.error("Erro ao criar contrato:", err);
      const msg = err.response?.data?.message || err.message;
      setErroModal(msg || "Erro ao criar contrato.");
    } finally {
      setSalvandoContrato(false);
    }
  }

  /* ── Cálculos dos KPIs da Tela 2 (Detalhes) ── */
  const kpisDetalhe = useMemo(() => {
    if (!contratoDetalhe) return null;

    const valorTotal = Number(
      contratoDetalhe.valor_total ||
        contratoDetalhe.financeiro?.valor_parcelas ||
        0
    );
    const totalParc = Number(
      contratoDetalhe.quantidade_parcelas ||
        contratoDetalhe.total_parcelas ||
        parcelasDetalhe.length ||
        0
    );

    const isPaga = (p) => p.status === "PAGA" || p.situacao === "PAGA";
    const pagas = parcelasDetalhe.filter(isPaga).length;
    const valorLiquidado =
      Number(contratoDetalhe.financeiro?.recebido) ||
      parcelasDetalhe
        .filter(isPaga)
        .reduce((s, p) => s + Number(p.valor || 0), 0);

    const valorParcela =
      parcelasDetalhe.length > 0
        ? Number(parcelasDetalhe[0].valor || 0)
        : totalParc > 0
          ? valorTotal / totalParc
          : valorTotal;

    const duracaoMeses =
      calcDuracaoMeses(contratoDetalhe.data_inicio, contratoDetalhe.data_fim) ||
      totalParc;

    // Próximo vencimento (primeira parcela ainda não liquidada)
    const proximaNaoPaga = parcelasDetalhe
      .filter((p) => !isPaga(p) && p.status !== "CANCELADA" && p.situacao !== "CANCELADA")
      .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))[0];

    const formaPagamento = contratoDetalhe.forma_pagamento
      ? contratoDetalhe.forma_pagamento.replace(/_/g, " ").toLowerCase()
      : "recorrente";

    return {
      valorTotal: formatBRL(valorTotal),
      duracaoTexto: `Contrato de ${duracaoMeses} ${duracaoMeses === 1 ? "mês" : "meses"}`,
      parcelasResumo:
        totalParc > 0
          ? `${totalParc}x de ${formatBRL(valorParcela)}`
          : "Sem parcelas",
      formaCobranca: `Faturamento ${formaPagamento}`,
      statusParcelas: `Pagas ${pagas} / ${totalParc || parcelasDetalhe.length}`,
      liquidadoTexto: `${formatBRL(valorLiquidado)} liquidados`,
      proximoVencimento: proximaNaoPaga
        ? formatDate(proximaNaoPaga.data_vencimento)
        : "—",
      statusProxima: proximaNaoPaga
        ? proximaNaoPaga.situacao === "VENCIDA" ||
          new Date(proximaNaoPaga.data_vencimento) < new Date()
          ? "Parcela em atraso"
          : "Fatura gerada com sucesso"
        : "Todas as parcelas pagas",
    };
  }, [contratoDetalhe, parcelasDetalhe]);

  /* ── Eventos da timeline (histórico real da API) ── */
  const timelineEventos = useMemo(() => {
    if (historicoDetalhe.length > 0) {
      return historicoDetalhe.map((h) => ({
        id: `hist-${h.id}`,
        acao: h.acao,
        titulo: ACAO_LABELS[h.acao] || h.acao || "Evento",
        descricao: h.descricao,
        data: h.created_at,
        usuario: h.usuario_nome,
      }));
    }

    if (!contratoDetalhe) return [];

    const fallback = [];
    if (contratoDetalhe.created_at) {
      fallback.push({
        id: "fallback-criacao",
        acao: "CRIADO",
        titulo: "Contrato criado",
        descricao: `Contrato #${contratoDetalhe.numero} registrado no sistema`,
        data: contratoDetalhe.created_at,
        usuario: null,
      });
    }
    if (contratoDetalhe.data_inicio) {
      fallback.push({
        id: "fallback-vigencia",
        acao: "STATUS",
        titulo: "Vigência do contrato",
        descricao: `Período de ${formatDate(contratoDetalhe.data_inicio)} a ${formatDate(contratoDetalhe.data_fim)}`,
        data: contratoDetalhe.data_inicio,
        usuario: null,
      });
    }
    return fallback;
  }, [historicoDetalhe, contratoDetalhe]);

  /* ── Parcelas já liquidadas (aba Pagamentos) ── */
  const pagamentosDetalhe = useMemo(
    () =>
      parcelasDetalhe.filter(
        (p) =>
          Number(p.pago || 0) > 0 ||
          p.status === "PAGA" ||
          p.situacao === "PAGA"
      ),
    [parcelasDetalhe]
  );

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
                  onClick={() => {
                    if (item.path) {
                      setContratoSelecionadoId(null);
                      navigate(item.path);
                    }
                  }}
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
          <Box component="button" onClick={handleLogout} sx={sx.logoutBtn} title="Sair">
            <LogoutRoundedIcon sx={{ fontSize: 17 }} />
          </Box>
        </Box>
      </Box>

      {/* ══════════ CONTEÚDO PRINCIPAL ══════════ */}
      <Box sx={sx.main}>
        {/* ── Top Header ── */}
        <Box sx={sx.header}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {contratoSelecionadoId && (
              <Box
                component="button"
                onClick={() => {
                  setContratoSelecionadoId(null);
                  navigate("/contratos");
                }}
                sx={sx.btnVoltar}
                title="Voltar para a lista de contratos"
              >
                <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
            )}
            <Typography sx={sx.pageTitle}>
              {contratoSelecionadoId
                ? `Contrato #${contratoDetalhe?.numero || contratoSelecionadoId}`
                : "Contratos"}
            </Typography>
          </Box>

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
              sx={sx.iconBtn}
              onClick={() => {
                if (contratoSelecionadoId) carregarDetalhesContrato(contratoSelecionadoId);
                carregarLista(true);
              }}
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
                title="Filtrar por cliente"
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

        {/* ── Mensagem de Erro ── */}
        {erro && (
          <Box sx={sx.erroBox}>
            <Typography sx={{ fontSize: "13px", color: "#e0392b", flex: 1 }}>
              {erro}
            </Typography>
            <Box component="button" onClick={() => carregarLista(true)} sx={sx.retryBtn}>
              <RefreshRoundedIcon sx={{ fontSize: 16 }} /> Tentar novamente
            </Box>
          </Box>
        )}

        {/* ═════════════════════════════════════════════════════════
            TELA 1: LISTAGEM DE CONTRATOS (GRADE DE CARDS)
        ═════════════════════════════════════════════════════════ */}
        {!contratoSelecionadoId ? (
          <>
            {/* ── Barra de Ações & Pílulas de Filtro ── */}
            <Box sx={sx.actionsBar}>
              <Box sx={sx.pillGroup}>
                <Box
                  component="button"
                  onClick={() => setStatusFilter("TODOS")}
                  sx={{
                    ...sx.pill,
                    ...(statusFilter === "TODOS" ? sx.pillActive : sx.pillInactive),
                  }}
                >
                  Todos ({contagemTodos})
                </Box>
                <Box
                  component="button"
                  onClick={() => setStatusFilter("ATIVOS")}
                  sx={{
                    ...sx.pill,
                    ...(statusFilter === "ATIVOS" ? sx.pillActive : sx.pillInactive),
                  }}
                >
                  Ativos ({contagemAtivos})
                </Box>
                <Box
                  component="button"
                  onClick={() => setStatusFilter("VENCIDOS")}
                  sx={{
                    ...sx.pill,
                    ...(statusFilter === "VENCIDOS" ? sx.pillActive : sx.pillInactive),
                  }}
                >
                  Vencidos ({contagemVencidos})
                </Box>
                <Box
                  component="button"
                  onClick={() => setStatusFilter("ENCERRADOS")}
                  sx={{
                    ...sx.pill,
                    ...(statusFilter === "ENCERRADOS" ? sx.pillActive : sx.pillInactive),
                  }}
                >
                  Encerrados ({contagemEncerrados})
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<FileUploadRoundedIcon />}
                  onClick={() => navigate("/contratos/importar")}
                  sx={sx.btnImportar}
                >
                  Importar
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={<AddRoundedIcon />}
                  onClick={() => navigate("/contratos/novo")}
                  sx={sx.btnNovoContrato}
                >
                  Novo Contrato
                </Button>
              </Box>
            </Box>

            {/* ── Grid de Cards de Contratos ── */}
            <Box sx={sx.contractsGrid}>
              {loading ? (
                Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <Box key={i} sx={sx.contractCardSkeleton}>
                      <Skeleton variant="rounded" width="70px" height={22} sx={{ borderRadius: "6px" }} />
                      <Skeleton variant="text" width="90%" height={26} sx={{ mt: 1 }} />
                      <Skeleton variant="text" width="60%" height={18} sx={{ mt: 1 }} />
                      <Skeleton variant="text" width="75%" height={18} />
                      <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
                        <Skeleton variant="text" width="35%" height={24} />
                        <Skeleton variant="text" width="40%" height={28} />
                      </Box>
                    </Box>
                  ))
              ) : contratosFiltrados.length === 0 ? (
                <Box sx={sx.emptyState}>
                  <DescriptionRoundedIcon sx={{ fontSize: 44, color: "#9aa5b8", mb: 1 }} />
                  <Typography sx={{ fontSize: "15px", fontWeight: 600, color: "#182338" }}>
                    Nenhum contrato encontrado
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: "#67728a", mt: 0.5 }}>
                    Tente ajustar os filtros ou cadastrar um novo contrato.
                  </Typography>
                </Box>
              ) : (
                contratosFiltrados.map((item) => {
                  const badge = STATUS_BADGES[item.statusLabel] || STATUS_BADGES.ATIVO;

                  return (
                    <Box
                      key={item.id}
                      sx={sx.contractCard}
                      onClick={() => {
                        setContratoSelecionadoId(item.id);
                        navigate(`/contratos/${item.id}`);
                      }}
                    >
                      {/* Topo do Card */}
                      <Box sx={sx.cardTop}>
                        <Box
                          component="span"
                          sx={{
                            ...sx.cardStatusBadge,
                            bgcolor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </Box>
                        <Box
                          component="button"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          sx={sx.cardMenuBtn}
                        >
                          <MoreHorizRoundedIcon sx={{ fontSize: 18, color: "#8b97aa" }} />
                        </Box>
                      </Box>

                      {/* Título do Contrato */}
                      <Typography sx={sx.cardTitle} noWrap title={item.descricao}>
                        {item.descricao || `Contrato #${item.numero}`}
                      </Typography>

                      {/* Cliente */}
                      <Box sx={sx.cardMetaRow}>
                        <PersonOutlineRoundedIcon sx={{ fontSize: 16, color: "#8b97aa" }} />
                        <Typography sx={sx.cardMetaText} noWrap>
                          {item.cliente_nome || `Cliente ${item.cliente_id}`}
                        </Typography>
                      </Box>

                      {/* Vigência */}
                      <Box sx={sx.cardMetaRow}>
                        <CalendarTodayRoundedIcon sx={{ fontSize: 15, color: "#8b97aa" }} />
                        <Typography sx={sx.cardMetaText}>
                          Início: {formatDate(item.data_inicio)} | Fim: {formatDate(item.data_fim)}
                        </Typography>
                      </Box>

                      {/* Rodapé: Progresso e Valor Total */}
                      <Box sx={sx.cardFooter}>
                        <Box sx={{ width: "45%" }}>
                          <Box sx={sx.progressTrack}>
                            <Box
                              sx={{
                                ...sx.progressBar,
                                width: `${item.progressoPercentual}%`,
                              }}
                            />
                          </Box>
                          <Typography sx={sx.parcCountText}>
                            {item.parcelasPagas}/{item.totalParcelas} parcelas
                          </Typography>
                        </Box>

                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={sx.cardValor}>
                            {formatBRL(item.valor_total || item.valor_parcelas)}
                          </Typography>
                          <Typography sx={sx.cardValorLabel}>Valor Total</Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </>
        ) : (
          /* ═════════════════════════════════════════════════════════
             TELA 2: DETALHES DO CONTRATO
          ═════════════════════════════════════════════════════════ */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* ── Banner Superior do Contrato ── */}
            <Box sx={sx.detailBanner}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={sx.bannerDocIcon}>
                  <DescriptionRoundedIcon sx={{ fontSize: 28, color: "#2563eb" }} />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
                    <Typography sx={sx.bannerTitle}>
                      {contratoDetalhe?.descricao ||
                        (loadingDetalhes
                          ? "Carregando contrato..."
                          : "Contrato não encontrado")}
                    </Typography>
                    {contratoDetalhe && (
                      <Box
                        component="span"
                        sx={{
                          ...sx.cardStatusBadge,
                          bgcolor: (STATUS_BADGES[contratoDetalhe?.status] || STATUS_BADGES.ATIVO).bg,
                          color: (STATUS_BADGES[contratoDetalhe?.status] || STATUS_BADGES.ATIVO).color,
                        }}
                      >
                        {(STATUS_BADGES[contratoDetalhe?.status] || STATUS_BADGES.ATIVO).label}
                      </Box>
                    )}
                  </Box>
                  <Typography sx={sx.bannerSub}>
                    Contrato: <strong>#{contratoDetalhe?.numero || "—"}</strong> | Cliente:{" "}
                    <strong>{contratoDetalhe?.cliente_nome || "—"}</strong> | CPF/CNPJ:{" "}
                    {formatCpfCnpj(contratoDetalhe?.cliente_cpf_cnpj || contratoDetalhe?.cpf_cnpj)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                <Button
                  variant="outlined"
                  startIcon={<FileUploadRoundedIcon sx={{ transform: "rotate(180deg)" }} />}
                  sx={sx.btnActionSec}
                  onClick={handleExportarPdf}
                  disabled={!contratoDetalhe}
                >
                  Exportar PDF
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<BlockRoundedIcon />}
                  sx={sx.btnActionSec}
                  onClick={handleEncerrarContrato}
                  disabled={!contratoDetalhe || contratoDetalhe?.status === "ENCERRADO"}
                >
                  Encerrar
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={<EditRoundedIcon />}
                  sx={sx.btnActionPrim}
                  onClick={() => setModalEditarAberto(true)}
                  disabled={!contratoDetalhe}
                >
                  Editar
                </Button>
              </Box>
            </Box>

            {/* ── 4 Cards de Métricas (KPIs) ── */}
            <Box sx={sx.kpisGrid}>
              <Box sx={sx.kpiCard}>
                <Typography sx={sx.kpiLabel}>Valor Total</Typography>
                <Typography sx={sx.kpiValue}>{kpisDetalhe?.valorTotal || "R$ 0,00"}</Typography>
                <Typography sx={sx.kpiSub}>{kpisDetalhe?.duracaoTexto || "Contrato ativo"}</Typography>
              </Box>

              <Box sx={sx.kpiCard}>
                <Typography sx={sx.kpiLabel}>Parcelas</Typography>
                <Typography sx={sx.kpiValue}>{kpisDetalhe?.parcelasResumo || "—"}</Typography>
                <Typography sx={sx.kpiSub}>{kpisDetalhe?.formaCobranca || "Faturamento recorrente"}</Typography>
              </Box>

              <Box sx={sx.kpiCard}>
                <Typography sx={sx.kpiLabel}>Status Parcelas</Typography>
                <Typography sx={sx.kpiValue}>{kpisDetalhe?.statusParcelas || "0 / 0"}</Typography>
                <Typography sx={sx.kpiSub}>{kpisDetalhe?.liquidadoTexto || "R$ 0,00 liquidados"}</Typography>
              </Box>

              <Box sx={sx.kpiCard}>
                <Typography sx={sx.kpiLabel}>Próximo Vencimento</Typography>
                <Typography sx={sx.kpiValue}>{kpisDetalhe?.proximoVencimento || "—"}</Typography>
                <Typography sx={sx.kpiSub}>{kpisDetalhe?.statusProxima || "Fatura gerada"}</Typography>
              </Box>
            </Box>

            {/* ── Área Principal em 2 Colunas ── */}
            <Box sx={sx.detailContentColumns}>
              {/* Coluna Esquerda: Abas e Tabelas (~68%) */}
              <Box sx={sx.leftColumn}>
                {/* Abas */}
                <Box sx={sx.tabsBar}>
                  {[
                    { id: "PARCELAS", label: "Parcelas" },
                    { id: "PAGAMENTOS", label: "Pagamentos" },
                    { id: "DOCUMENTOS", label: "Documentos" },
                    { id: "TIMELINE", label: "Timeline" },
                  ].map((tab) => (
                    <Box
                      key={tab.id}
                      component="button"
                      onClick={() => setAbaDetalhe(tab.id)}
                      sx={{
                        ...sx.tabBtn,
                        ...(abaDetalhe === tab.id ? sx.tabBtnActive : {}),
                      }}
                    >
                      {tab.label}
                    </Box>
                  ))}
                </Box>

                {/* Conteúdo da Aba Parcelas */}
                {abaDetalhe === "PARCELAS" && (
                  <Box sx={sx.tableCard}>
                    <Box sx={{ overflowX: "auto" }}>
                      <Box component="table" sx={sx.table}>
                        <thead>
                          <tr>
                            <th style={sx.th}>PARCELA</th>
                            <th style={sx.th}>VALOR</th>
                            <th style={sx.th}>VENCIMENTO</th>
                            <th style={{ ...sx.th, textAlign: "center" }}>STATUS</th>
                            <th style={{ ...sx.th, textAlign: "center" }}>AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingDetalhes ? (
                            Array(5)
                              .fill(0)
                              .map((_, i) => (
                                <tr key={i}>
                                  <td style={sx.td}><Skeleton width={40} /></td>
                                  <td style={sx.td}><Skeleton width={80} /></td>
                                  <td style={sx.td}><Skeleton width={90} /></td>
                                  <td style={{ ...sx.td, textAlign: "center" }}><Skeleton width={60} sx={{ mx: "auto" }} /></td>
                                  <td style={{ ...sx.td, textAlign: "center" }}><Skeleton width={70} sx={{ mx: "auto" }} /></td>
                                </tr>
                              ))
                          ) : parcelasDetalhe.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ ...sx.td, textAlign: "center", padding: "30px 16px", color: "#8b97aa" }}>
                                Nenhuma parcela cadastrada para este contrato.
                              </td>
                            </tr>
                          ) : (
                            parcelasDetalhe.map((p, idx) => {
                              const situacao =
                                p.situacao ||
                                (p.status === "PAGA"
                                  ? "PAGA"
                                  : p.status === "CANCELADA"
                                    ? "CANCELADA"
                                    : new Date(p.data_vencimento) < new Date()
                                      ? "VENCIDA"
                                      : "PENDENTE");
                              const isPaga = situacao === "PAGA";
                              const isCancelada = situacao === "CANCELADA";
                              const isAtrasada = situacao === "VENCIDA";
                              const statusLabel = isPaga
                                ? "PAGO"
                                : isCancelada
                                  ? "CANCELADA"
                                  : isAtrasada
                                    ? "ATRASADA"
                                    : "EM ABERTO";
                              const statusBg = isPaga
                                ? "#e7f9ef"
                                : isCancelada
                                  ? "#f0f2f7"
                                  : isAtrasada
                                    ? "#fdeceb"
                                    : "#e8f0fe";
                              const statusColor = isPaga
                                ? "#1f9d55"
                                : isCancelada
                                  ? "#67728a"
                                  : isAtrasada
                                    ? "#e0392b"
                                    : "#2563eb";

                              return (
                                <tr key={p.id || idx} style={sx.tr}>
                                  <td style={sx.tdNumeroParcela}>#{p.numero || idx + 1}</td>
                                  <td style={sx.tdValor}>{formatBRL(p.valor)}</td>
                                  <td style={sx.tdSecundario}>{formatDate(p.data_vencimento)}</td>
                                  <td style={{ ...sx.td, textAlign: "center" }}>
                                    <Box
                                      component="span"
                                      sx={{
                                        ...sx.statusChip,
                                        bgcolor: statusBg,
                                        color: statusColor,
                                      }}
                                    >
                                      {statusLabel}
                                    </Box>
                                  </td>
                                  <td style={{ ...sx.td, textAlign: "center" }}>
                                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                                      <Box component="button" sx={sx.iconActionBtn} title="Imprimir recibo">
                                        <PrintRoundedIcon sx={{ fontSize: 16 }} />
                                      </Box>
                                      <Box component="button" sx={sx.iconActionBtn} title="Enviar por e-mail">
                                        <MailOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                      </Box>
                                      <Box component="button" sx={sx.iconActionBtn} title="Mais opções">
                                        <MoreVertRoundedIcon sx={{ fontSize: 16 }} />
                                      </Box>
                                    </Box>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Conteúdo da Aba Pagamentos */}
                {abaDetalhe === "PAGAMENTOS" && (
                  <Box sx={sx.tableCard}>
                    <Box sx={{ p: 3, textAlign: "center", color: "#67728a" }}>
                      <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
                        Registro de Liquidações e Pagamentos
                      </Typography>
                      <Typography sx={{ fontSize: "12.5px", mt: 0.5 }}>
                        Todas as baixas e liquidações deste contrato são registradas automaticamente.
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Conteúdo da Aba Documentos */}
                {abaDetalhe === "DOCUMENTOS" && (
                  <Box sx={sx.tableCard}>
                    <Box sx={{ p: 3, textAlign: "center", color: "#67728a" }}>
                      <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
                        Documentação Jurídica do Contrato
                      </Typography>
                      <Typography sx={{ fontSize: "12.5px", mt: 0.5 }}>
                        Consulte na barra lateral direita os anexos originais e relatórios vinculados.
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Conteúdo da Aba Timeline */}
                {abaDetalhe === "TIMELINE" && (
                  <Box sx={sx.tableCard}>
                    <Box sx={{ p: 3, textAlign: "center", color: "#67728a" }}>
                      <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
                        Trilha de Auditoria e Eventos
                      </Typography>
                      <Typography sx={{ fontSize: "12.5px", mt: 0.5 }}>
                        Acompanhe o histórico completo de ações na linha do tempo à direita.
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Coluna Direita: Anexos e Histórico (~32%) */}
              <Box sx={sx.rightColumn}>
                {/* Card Anexos e Documentos */}
                <Box sx={sx.sideCard}>
                  <Typography sx={sx.sideCardTitle}>Anexos e Documentos</Typography>
                  <Box sx={sx.docItem}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                      <PictureAsPdfRoundedIcon sx={{ fontSize: 24, color: "#e0392b" }} />
                      <Box>
                        <Typography sx={sx.docName} noWrap>
                          {documentosDetalhe[0]?.nome_arquivo || "contrato_servico_final.pdf"}
                        </Typography>
                        <Typography sx={sx.docSub}>PDF assinado eletronicamente</Typography>
                      </Box>
                    </Box>
                    <Box component="button" sx={sx.iconActionBtn} title="Visualizar documento">
                      <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                    </Box>
                  </Box>
                </Box>

                {/* Card Histórico do Contrato (Timeline) */}
                <Box sx={sx.sideCard}>
                  <Typography sx={sx.sideCardTitle}>Histórico do Contrato</Typography>

                  <Box sx={sx.timelineList}>
                    {/* Item 1 */}
                    <Box sx={sx.timelineItem}>
                      <Box sx={sx.timelineIconWrapBlue}>
                        <AddCircleOutlineRoundedIcon sx={{ fontSize: 15, color: "#2563eb" }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={sx.timelineEventTitle}>Criado no sistema</Typography>
                        <Typography sx={sx.timelineEventSub}>
                          01/01/2026 às 14:32 por Rodrigo Souza
                        </Typography>
                      </Box>
                    </Box>

                    {/* Item 2 */}
                    <Box sx={sx.timelineItem}>
                      <Box sx={sx.timelineIconWrapGreen}>
                        <CheckCircleOutlineRoundedIcon sx={{ fontSize: 15, color: "#16a34a" }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={sx.timelineEventTitle}>Assinado eletronicamente</Typography>
                        <Typography sx={sx.timelineEventSub}>
                          02/01/2026 às 10:15 por Acme Corp (Assinatura digital)
                        </Typography>
                      </Box>
                    </Box>

                    {/* Item 3 */}
                    <Box sx={sx.timelineItem}>
                      <Box sx={sx.timelineIconWrapBlue}>
                        <PlayCircleOutlineRoundedIcon sx={{ fontSize: 15, color: "#2563eb" }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={sx.timelineEventTitle}>Iniciado faturamento recorrente</Typography>
                        <Typography sx={sx.timelineEventSub}>15/01/2026 por Sistema</Typography>
                      </Box>
                    </Box>

                    {/* Item 4 */}
                    <Box sx={sx.timelineItem}>
                      <Box sx={sx.timelineIconWrapRed}>
                        <ErrorOutlineRoundedIcon sx={{ fontSize: 15, color: "#dc2626" }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={sx.timelineEventTitle}>Fatura atrasada registrada</Typography>
                        <Typography sx={sx.timelineEventSub}>16/02/2026 por Painel de alertas</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* ══════════ MODAL NOVO CONTRATO ══════════ */}
      <Dialog
        open={modalNovoAberto}
        onClose={() => !salvandoContrato && setModalNovoAberto(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px", p: 1 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 700,
            color: "#182338",
          }}
        >
          Novo Contrato
          <Box
            component="button"
            onClick={() => setModalNovoAberto(false)}
            sx={{ border: "none", background: "none", cursor: "pointer", color: "#67728a" }}
          >
            <CloseRoundedIcon />
          </Box>
        </DialogTitle>

        <form onSubmit={handleCriarContrato}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {erroModal && (
              <Alert severity="error" sx={{ borderRadius: "8px", fontSize: "13px" }}>
                {erroModal}
              </Alert>
            )}

            <TextField
              select
              label="Cliente *"
              size="small"
              fullWidth
              value={novoContrato.cliente_id}
              onChange={(e) => setNovoContrato({ ...novoContrato, cliente_id: e.target.value })}
              required
            >
              {rawClientes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nome_razao_social}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Descrição / Objeto do Contrato *"
              placeholder="ex: Contrato de Prestação de Serviços Digitais"
              size="small"
              fullWidth
              value={novoContrato.descricao}
              onChange={(e) => setNovoContrato({ ...novoContrato, descricao: e.target.value })}
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Valor Total (R$) *"
                type="number"
                size="small"
                fullWidth
                value={novoContrato.valor_total}
                onChange={(e) => setNovoContrato({ ...novoContrato, valor_total: e.target.value })}
                required
              />
              <TextField
                label="Número de Parcelas *"
                type="number"
                size="small"
                fullWidth
                value={novoContrato.total_parcelas}
                onChange={(e) => setNovoContrato({ ...novoContrato, total_parcelas: e.target.value })}
                required
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Data de Início *"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={novoContrato.data_inicio}
                onChange={(e) => setNovoContrato({ ...novoContrato, data_inicio: e.target.value })}
                required
              />
              <TextField
                label="Data de Término"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={novoContrato.data_fim}
                onChange={(e) => setNovoContrato({ ...novoContrato, data_fim: e.target.value })}
              />
            </Box>

            <TextField
              select
              label="Forma de Pagamento"
              size="small"
              fullWidth
              value={novoContrato.forma_pagamento}
              onChange={(e) => setNovoContrato({ ...novoContrato, forma_pagamento: e.target.value })}
            >
              <MenuItem value="BOLETO">Boleto Bancário</MenuItem>
              <MenuItem value="PIX">PIX</MenuItem>
              <MenuItem value="CARTAO">Cartão de Crédito</MenuItem>
              <MenuItem value="TRANSFERENCIA">Transferência Bancária</MenuItem>
            </TextField>

            <TextField
              label="Observações"
              size="small"
              multiline
              rows={2}
              fullWidth
              value={novoContrato.observacoes}
              onChange={(e) => setNovoContrato({ ...novoContrato, observacoes: e.target.value })}
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setModalNovoAberto(false)}
              disabled={salvandoContrato}
              sx={{ color: "#67728a", textTransform: "none", fontWeight: 600 }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={salvandoContrato}
              sx={{
                bgcolor: "#2563eb",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                px: 3,
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              {salvandoContrato ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                "Criar Contrato"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ══════════ MODAL EDITAR CONTRATO ══════════ */}
      <Dialog
        open={modalEditarAberto}
        onClose={() => setModalEditarAberto(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#182338" }}>
          Editar Contrato #{contratoDetalhe?.numero}
        </DialogTitle>
        <form onSubmit={handleSalvarEdicao}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Descrição / Título"
              size="small"
              fullWidth
              value={editForm?.descricao || ""}
              onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Data de Início"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={editForm?.data_inicio ? editForm.data_inicio.split("T")[0] : ""}
                onChange={(e) => setEditForm({ ...editForm, data_inicio: e.target.value })}
              />
              <TextField
                label="Data de Término"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={editForm?.data_fim ? editForm.data_fim.split("T")[0] : ""}
                onChange={(e) => setEditForm({ ...editForm, data_fim: e.target.value })}
              />
            </Box>
            <TextField
              label="Observações"
              size="small"
              multiline
              rows={2}
              fullWidth
              value={editForm?.observacoes || ""}
              onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setModalEditarAberto(false)} sx={{ color: "#67728a" }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              sx={{ bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" } }}
            >
              Salvar Alterações
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ══════════ SNACKBAR DE FEEDBACK ══════════ */}
      <Snackbar
        open={Boolean(feedbackSuccess)}
        autoHideDuration={4000}
        onClose={() => setFeedbackSuccess("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setFeedbackSuccess("")} severity="success" sx={{ width: "100%", borderRadius: "8px" }}>
          {feedbackSuccess}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* =========================================================
   ESTILOS (Consistência absoluta com Dashboard e Clientes)
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
  btnVoltar: {
    border: "1px solid #e2e8f0",
    bgcolor: "#fff",
    borderRadius: "8px",
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#67728a",
    transition: "all 0.15s ease",
    "&:hover": { bgcolor: "#f1f5f9", color: "#182338" },
  },
  pageTitle: { fontSize: "24px", fontWeight: 700, color: "#182338", letterSpacing: "-0.01em" },
  headerRight: { display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    bgcolor: "#fff",
    border: "1px solid #e3e7ee",
    borderRadius: "8px",
    px: 1.5,
    height: 38,
    width: 270,
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
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    flexShrink: 0,
  },
  filterWrap: { display: "flex", alignItems: "center", gap: 0.9, flexShrink: 0 },
  filterLabel: { fontSize: "12.5px", color: "#67728a" },
  filterSelect: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#2563eb",
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
    "&:hover": { bgcolor: "#dde9fd" },
  },

  erroBox: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    bgcolor: "#fff5f5",
    border: "1px solid #fcc",
    borderRadius: "10px",
    px: 2.5,
    py: 1.5,
  },
  retryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 0.5,
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#e0392b",
    fontSize: "12px",
    fontWeight: 600,
    p: 0,
    "&:hover": { textDecoration: "underline" },
  },

  /* ── Barra de Ações & Pílulas ── */
  actionsBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 2,
    mt: 0.5,
  },
  pillGroup: { display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" },
  pill: {
    border: "none",
    cursor: "pointer",
    borderRadius: "20px",
    px: 2.2,
    py: 0.9,
    fontSize: "13px",
    fontWeight: 600,
    transition: "all 0.15s ease",
    fontFamily: "inherit",
  },
  pillActive: {
    bgcolor: "#2563eb",
    color: "#ffffff",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
  },
  pillInactive: {
    bgcolor: "#ffffff",
    color: "#475569",
    border: "1px solid #e2e8f0",
    "&:hover": { bgcolor: "#f8fafc", color: "#1e293b" },
  },
  btnImportar: {
    border: "1px solid #e2e8f0",
    color: "#475569",
    bgcolor: "#ffffff",
    textTransform: "none",
    fontSize: "13.5px",
    fontWeight: 600,
    borderRadius: "8px",
    px: 2,
    py: 0.85,
    "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1" },
  },
  btnNovoContrato: {
    bgcolor: "#2563eb",
    color: "#ffffff",
    textTransform: "none",
    fontSize: "13.5px",
    fontWeight: 600,
    borderRadius: "8px",
    px: 2.2,
    py: 0.9,
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
    "&:hover": { bgcolor: "#1d4ed8" },
  },

  /* ── Grid de Cards de Contratos ── */
  contractsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 2.2,
    "@media (max-width: 1400px)": { gridTemplateColumns: "repeat(3, 1fr)" },
    "@media (max-width: 1050px)": { gridTemplateColumns: "repeat(2, 1fr)" },
    "@media (max-width: 650px)": { gridTemplateColumns: "1fr" },
  },
  contractCard: {
    bgcolor: "#ffffff",
    border: "1px solid #eef1f6",
    borderRadius: "12px",
    p: 2.2,
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
    display: "flex",
    flexDirection: "column",
    gap: 1.2,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
      borderColor: "#dbe2ee",
    },
  },
  contractCardSkeleton: {
    bgcolor: "#ffffff",
    border: "1px solid #eef1f6",
    borderRadius: "12px",
    p: 2.2,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardStatusBadge: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  cardMenuBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    p: 0.5,
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": { bgcolor: "#f1f5f9" },
  },
  cardTitle: {
    fontSize: "14.5px",
    fontWeight: 700,
    color: "#182338",
    lineHeight: 1.3,
    mt: 0.3,
  },
  cardMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: 0.9,
    mt: 0.2,
  },
  cardMetaText: {
    fontSize: "12.5px",
    color: "#67728a",
  },
  cardFooter: {
    mt: "auto",
    pt: 1.8,
    borderTop: "1px solid #edf1f7",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  progressTrack: {
    width: "100%",
    height: 5,
    bgcolor: "#e2e8f0",
    borderRadius: "4px",
    overflow: "hidden",
    mb: 0.6,
  },
  progressBar: {
    height: "100%",
    bgcolor: "#2563eb",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  parcCountText: {
    fontSize: "11.5px",
    color: "#67728a",
    fontWeight: 500,
  },
  cardValor: {
    fontSize: "14.5px",
    fontWeight: 700,
    color: "#182338",
    lineHeight: 1.1,
  },
  cardValorLabel: {
    fontSize: "11px",
    color: "#8b97aa",
    mt: 0.2,
  },
  emptyState: {
    gridColumn: "1 / -1",
    p: 6,
    textAlign: "center",
    bgcolor: "#fff",
    borderRadius: "12px",
    border: "1px solid #eef1f6",
  },

  /* ── Estilos da Tela 2: Detalhes do Contrato ── */
  detailBanner: {
    bgcolor: "#ffffff",
    border: "1px solid #eef1f6",
    borderRadius: "12px",
    p: 2.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 2,
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  },
  bannerDocIcon: {
    width: 48,
    height: 48,
    borderRadius: "12px",
    bgcolor: "#e8f0fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#182338",
  },
  bannerSub: {
    fontSize: "13px",
    color: "#67728a",
    mt: 0.3,
  },
  btnActionSec: {
    border: "1px solid #e2e8f0",
    color: "#475569",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "13px",
    borderRadius: "8px",
    px: 1.8,
    py: 0.7,
    "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1" },
  },
  btnActionPrim: {
    bgcolor: "#2563eb",
    color: "#ffffff",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "13px",
    borderRadius: "8px",
    px: 2.2,
    py: 0.7,
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
    "&:hover": { bgcolor: "#1d4ed8" },
  },

  /* ── 4 KPIs ── */
  kpisGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 2,
    "@media (max-width: 900px)": { gridTemplateColumns: "repeat(2, 1fr)" },
    "@media (max-width: 550px)": { gridTemplateColumns: "1fr" },
  },
  kpiCard: {
    bgcolor: "#ffffff",
    border: "1px solid #eef1f6",
    borderRadius: "12px",
    p: 2.2,
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  },
  kpiLabel: {
    fontSize: "12px",
    color: "#67728a",
    fontWeight: 500,
  },
  kpiValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#182338",
    mt: 0.5,
    mb: 0.3,
  },
  kpiSub: {
    fontSize: "11.5px",
    color: "#8b97aa",
  },

  /* ── Layout em 2 Colunas ── */
  detailContentColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 2.5,
    alignItems: "start",
    "@media (max-width: 1100px)": { gridTemplateColumns: "1fr" },
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 1.5,
  },
  tabsBar: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    borderBottom: "1px solid #e2e8f0",
  },
  tabBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "13.5px",
    fontWeight: 600,
    color: "#67728a",
    pb: 1.2,
    pt: 0.5,
    px: 1,
    borderBottom: "2px solid transparent",
    transition: "all 0.15s ease",
    "&:hover": { color: "#182338" },
  },
  tabBtnActive: {
    color: "#2563eb",
    borderBottom: "2px solid #2563eb",
  },

  /* ── Tabela de Parcelas ── */
  tableCard: {
    bgcolor: "#ffffff",
    border: "1px solid #eef1f6",
    borderRadius: "12px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "14px 18px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#8b97aa",
    borderBottom: "1px solid #edf1f7",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #edf1f7",
    transition: "background-color 0.15s ease",
    "&:hover": { backgroundColor: "#f9fbfe" },
  },
  td: {
    padding: "14px 18px",
    fontSize: "13px",
    color: "#182338",
    whiteSpace: "nowrap",
  },
  tdNumeroParcela: {
    padding: "14px 18px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#182338",
  },
  tdValor: {
    padding: "14px 18px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#182338",
  },
  tdSecundario: {
    padding: "14px 18px",
    fontSize: "12.5px",
    color: "#475569",
  },
  statusChip: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
  },
  iconActionBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#67728a",
    p: 0.5,
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": { color: "#182338", bgcolor: "#f1f5f9" },
  },

  /* ── Coluna Direita ── */
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 2.2,
  },
  sideCard: {
    bgcolor: "#ffffff",
    border: "1px solid #eef1f6",
    borderRadius: "12px",
    p: 2.5,
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  },
  sideCardTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#182338",
    mb: 2,
  },
  docItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    p: 1.5,
    border: "1px solid #eef1f6",
    borderRadius: "8px",
    bgcolor: "#fcfdfe",
  },
  docName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#182338",
    maxWidth: "180px",
  },
  docSub: {
    fontSize: "11px",
    color: "#8b97aa",
  },

  /* ── Timeline ── */
  timelineList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  timelineItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 1.5,
  },
  timelineIconWrapBlue: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    bgcolor: "#e8f0fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    mt: 0.2,
  },
  timelineIconWrapGreen: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    bgcolor: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    mt: 0.2,
  },
  timelineIconWrapRed: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    bgcolor: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    mt: 0.2,
  },
  timelineEventTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#182338",
  },
  timelineEventSub: {
    fontSize: "11.5px",
    color: "#67728a",
    mt: 0.2,
  },
};
