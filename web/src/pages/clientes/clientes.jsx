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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
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
  { label: "Clientes", iconKey: "people", active: true, path: "/clientes" },
  { label: "Contratos", iconKey: "description", path: "/home" },
  { label: "Calendário", iconKey: "calendar" },
  { label: "Financeiro", iconKey: "money" },
  { label: "Calculadora", iconKey: "calculate" },
  { label: "Relatórios", iconKey: "bar_chart" },
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

const STATUS_BADGE = {
  ATIVO: { label: "ATIVO", bg: "#e7f9ef", color: "#1f9d55" },
  INADIMPLENTE: { label: "INADIMPLENTE", bg: "#fdeceb", color: "#e0392b" },
  INATIVO: { label: "INATIVO", bg: "#f0f2f7", color: "#67728a" },
};

/* ─────────────────────────────────────────────────────────
   Componente Principal: Clientes
───────────────────────────────────────────────────────── */
export default function Clientes() {
  const navigate = useNavigate();

  // Estados de dados
  const [rawClientes, setRawClientes] = useState([]);
  const [rawContratos, setRawContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState("");

  // Filtros e busca
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS"); // "TODOS" | "ATIVOS" | "INADIMPLENTES"
  const [clienteGeral, setClienteGeral] = useState("TODOS");

  // Paginação
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 8;

  // Modal Novo Cliente
  const [modalOpen, setModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [form, setForm] = useState({
    nome_razao_social: "",
    cpf_cnpj: "",
    email: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    observacoes: "",
  });

  // Usuário autenticado
  const storageUser = JSON.parse(localStorage.getItem("usuario") || "{}");
  const nomeUsuario = storageUser?.nome || "Rodrigo Souza";
  const initials = nomeUsuario
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  /* ── Carregar Dados da API ── */
  const carregarDados = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErro("");

    try {
      const [resClientes, resContratos] = await Promise.all([
        sheets.getClientes({ limit: 100 }),
        sheets.getContratos({ limit: 100 }),
      ]);

      const clientes = resClientes?.data?.data || resClientes?.data || [];
      const contratos = resContratos?.data?.data || resContratos?.data || [];

      setRawClientes(clientes);
      setRawContratos(contratos);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
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

  /* ── Processamento e Enriquecimento dos Clientes ── */
  const clientesEnriquecidos = useMemo(() => {
    return rawClientes.map((cli) => {
      const contratosDoCliente = rawContratos.filter(
        (c) => Number(c.cliente_id) === Number(cli.id)
      );

      const contratosAtivos = contratosDoCliente.filter(
        (c) => c.status === "ATIVO"
      ).length;

      const valorTotal = contratosDoCliente.reduce((sum, c) => {
        const val = Number(c.valor_total || c.valor_parcelas || 0);
        return sum + val;
      }, 0);

      const temInadimplencia = contratosDoCliente.some(
        (c) =>
          c.status === "INADIMPLENTE" ||
          (c.status === "ATIVO" && Number(c.pendente || 0) > 0)
      );

      let status = "INATIVO";
      if (temInadimplencia) {
        status = "INADIMPLENTE";
      } else if (contratosAtivos > 0) {
        status = "ATIVO";
      }

      return {
        ...cli,
        contratosAtivos,
        valorTotal,
        statusCalculado: status,
      };
    });
  }, [rawClientes, rawContratos]);

  /* ── Contagens para as Pílulas de Filtro ── */
  const totalGeral = clientesEnriquecidos.length;
  const totalAtivos = clientesEnriquecidos.filter(
    (c) => c.statusCalculado === "ATIVO"
  ).length;
  const totalInadimplentes = clientesEnriquecidos.filter(
    (c) => c.statusCalculado === "INADIMPLENTE"
  ).length;

  /* ── Filtros Aplicados ── */
  const clientesFiltrados = useMemo(() => {
    let lista = [...clientesEnriquecidos];

    // Filtro Dropdown do Topo
    if (clienteGeral && clienteGeral !== "TODOS") {
      lista = lista.filter((c) => Number(c.id) === Number(clienteGeral));
    }

    // Filtro pelas Pílulas
    if (statusFilter === "ATIVOS") {
      lista = lista.filter((c) => c.statusCalculado === "ATIVO");
    } else if (statusFilter === "INADIMPLENTES") {
      lista = lista.filter((c) => c.statusCalculado === "INADIMPLENTE");
    }

    // Filtro de Busca
    if (searchValue && searchValue.trim()) {
      const q = searchValue.trim().toLowerCase();
      lista = lista.filter(
        (c) =>
          (c.nome_razao_social &&
            c.nome_razao_social.toLowerCase().includes(q)) ||
          (c.cpf_cnpj && String(c.cpf_cnpj).replace(/\D/g, "").includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    return lista;
  }, [clientesEnriquecidos, clienteGeral, statusFilter, searchValue]);

  // Paginação Calculada
  const totalItens = clientesFiltrados.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina) || 1;
  const paginaValida = Math.min(pagina, totalPaginas);
  const inicioIndex = (paginaValida - 1) * itensPorPagina;
  const fimIndex = Math.min(inicioIndex + itensPorPagina, totalItens);
  const clientesPaginados = clientesFiltrados.slice(inicioIndex, fimIndex);

  /* ── Submissão do Modal de Novo Cliente ── */
  async function handleSalvarCliente(e) {
    e.preventDefault();
    setFormErro("");

    if (!form.nome_razao_social.trim()) {
      setFormErro("O Nome / Razão Social é obrigatório.");
      return;
    }
    if (!form.cpf_cnpj.trim()) {
      setFormErro("O CPF / CNPJ é obrigatório.");
      return;
    }

    setSalvando(true);
    try {
      await sheets.createCliente(form);
      setFormSuccess("Cliente cadastrado com sucesso!");
      setModalOpen(false);
      setForm({
        nome_razao_social: "",
        cpf_cnpj: "",
        email: "",
        telefone: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        observacoes: "",
      });
      await carregarDados(true);
    } catch (err) {
      console.error("Erro ao cadastrar cliente:", err);
      const msg = err.response?.data?.message || err.message;
      setFormErro(msg || "Erro ao salvar cliente. Verifique os dados.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Box sx={sx.page}>
      {/* ══════════ SIDEBAR ══════════ */}
      <Box sx={sx.sidebar}>
        <Box>
          <Box sx={sx.brand}>
            <Box sx={sx.brandIcon}>
              <LinkRoundedIcon
                sx={{ fontSize: 18, transform: "rotate(-45deg)" }}
              />
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
          <Typography sx={sx.pageTitle}>Clientes</Typography>

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
                <NotificationsRoundedIcon
                  sx={{ fontSize: 19, color: "#67728a" }}
                />
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

        {/* ── Mensagem de Erro ── */}
        {erro && (
          <Box sx={sx.erroBox}>
            <Typography sx={{ fontSize: "13px", color: "#e0392b", flex: 1 }}>
              {erro}
            </Typography>
            <Box
              component="button"
              onClick={() => carregarDados(true)}
              sx={sx.retryBtn}
            >
              <RefreshRoundedIcon sx={{ fontSize: 16 }} /> Tentar novamente
            </Box>
          </Box>
        )}

        {/* ── Barra de Ações & Pílulas de Filtro ── */}
        <Box sx={sx.actionsBar}>
          <Box sx={sx.pillGroup}>
            <Box
              component="button"
              onClick={() => {
                setStatusFilter("TODOS");
                setPagina(1);
              }}
              sx={{
                ...sx.pill,
                ...(statusFilter === "TODOS" ? sx.pillActive : sx.pillInactive),
              }}
            >
              Todos ({totalGeral})
            </Box>

            <Box
              component="button"
              onClick={() => {
                setStatusFilter("ATIVOS");
                setPagina(1);
              }}
              sx={{
                ...sx.pill,
                ...(statusFilter === "ATIVOS"
                  ? sx.pillActive
                  : sx.pillInactive),
              }}
            >
              Ativos ({totalAtivos})
            </Box>

            <Box
              component="button"
              onClick={() => {
                setStatusFilter("INADIMPLENTES");
                setPagina(1);
              }}
              sx={{
                ...sx.pill,
                ...(statusFilter === "INADIMPLENTES"
                  ? sx.pillActive
                  : sx.pillInactive),
              }}
            >
              Inadimplentes ({totalInadimplentes})
            </Box>
          </Box>

          <Button
            variant="contained"
            disableElevation
            onClick={() => setModalOpen(true)}
            startIcon={<AddRoundedIcon />}
            sx={sx.btnNovoCliente}
          >
            Novo Cliente
          </Button>
        </Box>

        {/* ── Tabela de Clientes ── */}
        <Box sx={sx.tableCard}>
          <Box sx={{ overflowX: "auto" }}>
            <Box component="table" sx={sx.table}>
              <thead>
                <tr>
                  <th style={sx.th}>NOME</th>
                  <th style={sx.th}>CPF/CNPJ</th>
                  <th style={sx.th}>E-MAIL</th>
                  <th style={{ ...sx.th, textAlign: "center" }}>
                    CONTRATOS ATIVOS
                  </th>
                  <th style={{ ...sx.th, textAlign: "right" }}>VALOR TOTAL</th>
                  <th style={{ ...sx.th, textAlign: "center" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i}>
                        <td style={sx.td}>
                          <Skeleton variant="text" width="160px" height={22} />
                        </td>
                        <td style={sx.td}>
                          <Skeleton variant="text" width="120px" height={22} />
                        </td>
                        <td style={sx.td}>
                          <Skeleton variant="text" width="140px" height={22} />
                        </td>
                        <td style={{ ...sx.td, textAlign: "center" }}>
                          <Skeleton
                            variant="text"
                            width="30px"
                            height={22}
                            sx={{ mx: "auto" }}
                          />
                        </td>
                        <td style={{ ...sx.td, textAlign: "right" }}>
                          <Skeleton
                            variant="text"
                            width="90px"
                            height={22}
                            sx={{ ml: "auto" }}
                          />
                        </td>
                        <td style={{ ...sx.td, textAlign: "center" }}>
                          <Skeleton
                            variant="rounded"
                            width="70px"
                            height={24}
                            sx={{ mx: "auto", borderRadius: "6px" }}
                          />
                        </td>
                      </tr>
                    ))
                ) : clientesPaginados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        ...sx.td,
                        textAlign: "center",
                        padding: "40px 16px",
                        color: "#8b97aa",
                      }}
                    >
                      Nenhum cliente encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  clientesPaginados.map((cli) => {
                    const badge =
                      STATUS_BADGE[cli.statusCalculado] || STATUS_BADGE.INATIVO;

                    return (
                      <tr key={cli.id} style={sx.tr}>
                        <td style={sx.tdNome}>
                          {cli.nome_razao_social || "Sem nome"}
                        </td>
                        <td style={sx.tdSecundario}>
                          {formatCpfCnpj(cli.cpf_cnpj)}
                        </td>
                        <td style={sx.tdSecundario}>
                          {cli.email || "—"}
                        </td>
                        <td style={sx.tdContratos}>
                          {cli.contratosAtivos}
                        </td>
                        <td style={sx.tdValor}>
                          {formatBRL(cli.valorTotal)}
                        </td>
                        <td style={{ ...sx.td, textAlign: "center" }}>
                          <Box
                            component="span"
                            sx={{
                              ...sx.statusChip,
                              bgcolor: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </Box>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Box>
          </Box>

          {/* ── Rodapé da Tabela: Paginação ── */}
          <Box sx={sx.paginationRow}>
            <Typography sx={sx.paginationText}>
              {totalItens > 0
                ? `Mostrando ${inicioIndex + 1}-${fimIndex} de ${totalItens} clientes`
                : "Nenhum cliente"}
            </Typography>

            <Box sx={sx.pageButtons}>
              <Box
                component="button"
                disabled={paginaValida <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                sx={{
                  ...sx.btnNavPagina,
                  ...(paginaValida <= 1 ? sx.btnNavDisabled : {}),
                }}
              >
                Anterior
              </Box>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .slice(0, 5)
                .map((num) => (
                  <Box
                    component="button"
                    key={num}
                    onClick={() => setPagina(num)}
                    sx={{
                      ...sx.btnNumPagina,
                      ...(paginaValida === num
                        ? sx.btnNumPaginaActive
                        : sx.btnNumPaginaInactive),
                    }}
                  >
                    {num}
                  </Box>
                ))}

              <Box
                component="button"
                disabled={paginaValida >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                sx={{
                  ...sx.btnNavPagina,
                  ...(paginaValida >= totalPaginas ? sx.btnNavDisabled : {}),
                }}
              >
                Próximo
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ══════════ MODAL NOVO CLIENTE ══════════ */}
      <Dialog
        open={modalOpen}
        onClose={() => !salvando && setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "14px", p: 1 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
            fontWeight: 700,
            color: "#182338",
          }}
        >
          Novo Cliente
          <Box
            component="button"
            onClick={() => setModalOpen(false)}
            sx={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#67728a",
              "&:hover": { color: "#182338" },
            }}
          >
            <CloseRoundedIcon />
          </Box>
        </DialogTitle>

        <form onSubmit={handleSalvarCliente}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {formErro && (
              <Alert severity="error" sx={{ borderRadius: "8px", fontSize: "13px" }}>
                {formErro}
              </Alert>
            )}

            <TextField
              label="Nome / Razão Social *"
              size="small"
              fullWidth
              value={form.nome_razao_social}
              onChange={(e) =>
                setForm({ ...form, nome_razao_social: e.target.value })
              }
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="CPF ou CNPJ *"
                size="small"
                fullWidth
                value={form.cpf_cnpj}
                onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                placeholder="000.000.000-00 ou CNPJ"
                required
              />
              <TextField
                label="E-mail"
                size="small"
                type="email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Telefone"
                size="small"
                fullWidth
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
              <TextField
                label="CEP"
                size="small"
                fullWidth
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: e.target.value })}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 2 }}>
              <TextField
                label="Logradouro"
                size="small"
                fullWidth
                value={form.logradouro}
                onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
              />
              <TextField
                label="Número"
                size="small"
                fullWidth
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
              <TextField
                label="Bairro"
                size="small"
                fullWidth
                value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
              />
              <TextField
                label="Cidade"
                size="small"
                fullWidth
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
              <TextField
                label="UF"
                size="small"
                inputProps={{ maxLength: 2 }}
                fullWidth
                value={form.estado}
                onChange={(e) =>
                  setForm({ ...form, estado: e.target.value.toUpperCase() })
                }
              />
            </Box>

            <TextField
              label="Observações"
              size="small"
              multiline
              rows={2}
              fullWidth
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setModalOpen(false)}
              disabled={salvando}
              sx={{ color: "#67728a", textTransform: "none", fontWeight: 600 }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={salvando}
              sx={{
                bgcolor: "#2563eb",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                px: 3,
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              {salvando ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                "Salvar Cliente"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ══════════ SNACKBAR DE FEEDBACK ══════════ */}
      <Snackbar
        open={Boolean(formSuccess)}
        autoHideDuration={4000}
        onClose={() => setFormSuccess("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setFormSuccess("")}
          severity="success"
          sx={{ width: "100%", borderRadius: "8px" }}
        >
          {formSuccess}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* =========================================================
   ESTILOS (Alinhamento rigoroso com o Dashboard e Design System)
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
    gap: 2.5,
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
    fontSize: "24px",
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
      borderColor: "#2563eb",
      boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.2)",
    },
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
    flexShrink: 0,
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

  pillGroup: {
    display: "flex",
    alignItems: "center",
    gap: 1.2,
    flexWrap: "wrap",
  },

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
    "&:hover": {
      bgcolor: "#f8fafc",
      color: "#1e293b",
    },
  },

  btnNovoCliente: {
    bgcolor: "#2563eb",
    color: "#ffffff",
    textTransform: "none",
    fontSize: "13.5px",
    fontWeight: 600,
    borderRadius: "8px",
    px: 2.2,
    py: 0.9,
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
    "&:hover": {
      bgcolor: "#1d4ed8",
    },
  },

  /* ── Card da Tabela ── */
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
    "&:hover": {
      backgroundColor: "#f9fbfe",
    },
  },

  td: {
    padding: "16px 18px",
    fontSize: "13px",
    color: "#182338",
    whiteSpace: "nowrap",
  },

  tdNome: {
    padding: "16px 18px",
    fontSize: "13.5px",
    fontWeight: 700,
    color: "#182338",
    whiteSpace: "nowrap",
  },

  tdSecundario: {
    padding: "16px 18px",
    fontSize: "12.5px",
    color: "#475569",
    whiteSpace: "nowrap",
  },

  tdContratos: {
    padding: "16px 18px",
    fontSize: "13.5px",
    fontWeight: 700,
    color: "#182338",
    textAlign: "center",
    whiteSpace: "nowrap",
  },

  tdValor: {
    padding: "16px 18px",
    fontSize: "13.5px",
    fontWeight: 700,
    color: "#182338",
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  statusChip: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },

  /* ── Paginação ── */
  paginationRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderTop: "1px solid #edf1f7",
    flexWrap: "wrap",
    gap: 1.5,
  },

  paginationText: {
    fontSize: "12.5px",
    color: "#67728a",
  },

  pageButtons: {
    display: "flex",
    alignItems: "center",
    gap: 0.6,
  },

  btnNavPagina: {
    border: "1px solid #e2e8f0",
    bgcolor: "#ffffff",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 500,
    padding: "5px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s ease",
    "&:hover": {
      bgcolor: "#f8fafc",
      borderColor: "#cbd5e1",
    },
  },

  btnNavDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    "&:hover": {
      bgcolor: "#ffffff",
      borderColor: "#e2e8f0",
    },
  },

  btnNumPagina: {
    minWidth: "28px",
    height: "28px",
    padding: "0 6px",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "6px",
    border: "1px solid transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    transition: "all 0.15s ease",
  },

  btnNumPaginaActive: {
    bgcolor: "#2563eb",
    color: "#ffffff",
  },

  btnNumPaginaInactive: {
    bgcolor: "#ffffff",
    color: "#475569",
    border: "1px solid #e2e8f0",
    "&:hover": {
      bgcolor: "#f8fafc",
      borderColor: "#cbd5e1",
    },
  },
};
