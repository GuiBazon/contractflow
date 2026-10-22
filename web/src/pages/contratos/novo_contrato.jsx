import { useState, useEffect, useMemo, useRef } from "react";
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
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

// MUI Components
import {
  Box,
  Typography,
  InputBase,
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
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
  { label: "Financeiro", iconKey: "money" },
  { label: "Calculadora", iconKey: "calculate" },
  { label: "Relatórios", iconKey: "bar_chart" },
  { label: "Configurações", iconKey: "settings" },
];

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function formatBRL(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseCurrencyInput(value) {
  if (!value) return 0;
  const clean = String(value).replace(/[^\d]/g, "");
  return Number(clean) / 100;
}

function calcDuracaoMeses(inicio, fim) {
  if (!inicio || !fim) return 12;
  const a = new Date(inicio);
  const b = new Date(fim);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 12;
  let meses =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() >= a.getUTCDate()) meses += 1;
  return Math.max(1, meses);
}

/* ─────────────────────────────────────────────────────────
   Componente: Novo Contrato
───────────────────────────────────────────────────────── */
export default function NovoContrato() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Estados de dados
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [clienteGeral, setClienteGeral] = useState("TODOS");

  // Formulário do Contrato
  const [clienteId, setClienteId] = useState("");
  const [titulo, setTitulo] = useState("Contrato de Licença de Software ERP e Consultoria");
  const [valorTotalStr, setValorTotalStr] = useState("48.000,00");
  const [numeroParcelas, setNumeroParcelas] = useState(12);
  const [dataInicio, setDataInicio] = useState("2026-10-01");
  const [dataTermino, setDataTermino] = useState("2027-09-30");
  const [periodicidade, setPeriodicidade] = useState("Mensal");
  const [multaAtraso, setMultaAtraso] = useState("2.0");
  const [jurosMensais, setJurosMensais] = useState("1.0");
  const [observacoes, setObservacoes] = useState(
    "As notas fiscais devem ser enviadas sempre até o dia 25 de cada mês."
  );

  // Arquivo PDF
  const [arquivoPdf, setArquivoPdf] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estados de Envio
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState("");
  const [sucessoMsg, setSucessoMsg] = useState("");

  // Modal Novo Cliente Rápido
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [novoClienteForm, setNovoClienteForm] = useState({
    nome_razao_social: "",
    cpf_cnpj: "",
    email: "",
    telefone: "",
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

  // Carregar Clientes da API
  useEffect(() => {
    async function carregar() {
      try {
        setLoadingClientes(true);
        const res = await sheets.getClientes({ limit: 100 });
        const list = res?.data?.data || res?.data || [];
        setClientes(list);
        if (list.length > 0 && !clienteId) {
          setClienteId(list[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
      } finally {
        setLoadingClientes(false);
      }
    }
    carregar();
  }, []);

  function handleLogout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  }

  // Cálculos do Resumo
  const valorTotalNum = useMemo(() => {
    return parseCurrencyInput(valorTotalStr);
  }, [valorTotalStr]);

  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => Number(c.id) === Number(clienteId));
  }, [clientes, clienteId]);

  const valorParcelaCalc = useMemo(() => {
    const qtd = Number(numeroParcelas) || 1;
    return valorTotalNum / qtd;
  }, [valorTotalNum, numeroParcelas]);

  const vigenciaMeses = useMemo(() => {
    return calcDuracaoMeses(dataInicio, dataTermino);
  }, [dataInicio, dataTermino]);

  // Manipulação de Arquivo PDF
  function handleFileSelect(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErroMsg("Por favor, selecione um arquivo em formato PDF.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErroMsg("O arquivo excede o limite máximo de 15MB.");
      return;
    }
    setArquivoPdf(file);
    setErroMsg("");
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  // Criação de Novo Cliente Rápido
  async function handleSalvarNovoCliente(e) {
    e.preventDefault();
    if (!novoClienteForm.nome_razao_social.trim()) {
      setErroMsg("Nome / Razão Social é obrigatório.");
      return;
    }
    if (!novoClienteForm.cpf_cnpj.trim()) {
      setErroMsg("CPF/CNPJ é obrigatório.");
      return;
    }

    try {
      setSalvandoCliente(true);
      const res = await sheets.createCliente(novoClienteForm);
      const novoId = res?.data?.cliente?.id;
      // Recarrega lista
      const resClientes = await sheets.getClientes({ limit: 100 });
      const list = resClientes?.data?.data || resClientes?.data || [];
      setClientes(list);
      if (novoId) {
        setClienteId(novoId);
      }
      setModalClienteAberto(false);
      setNovoClienteForm({
        nome_razao_social: "",
        cpf_cnpj: "",
        email: "",
        telefone: "",
      });
      setSucessoMsg("Cliente cadastrado com sucesso!");
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setErroMsg(msg || "Erro ao cadastrar novo cliente.");
    } finally {
      setSalvandoCliente(false);
    }
  }

  // Submissão do Contrato
  async function handleSubmitContrato(status = "ATIVO") {
    setErroMsg("");
    if (!clienteId) {
      setErroMsg("Selecione um cliente para vincular ao contrato.");
      return;
    }
    if (!titulo.trim()) {
      setErroMsg("Informe o título do contrato.");
      return;
    }
    if (valorTotalNum <= 0) {
      setErroMsg("Informe um valor total válido para o contrato.");
      return;
    }
    if (!dataInicio) {
      setErroMsg("Informe a data de início do contrato.");
      return;
    }

    setSalvando(true);
    try {
      const numeroContrato = `CTR-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9000) + 1000
      )}`;

      const payload = {
        cliente_id: Number(clienteId),
        numero: numeroContrato,
        descricao: titulo.trim(),
        tipo: "SERVIÇO",
        valor_total: Number(valorTotalNum.toFixed(2)),
        quantidade_parcelas: Number(numeroParcelas) || 1,
        data_inicio: dataInicio,
        data_fim: dataTermino || null,
        forma_pagamento: "BOLETO",
        multa_percentual: Number(multaAtraso) || 0,
        juros_percentual: Number(jurosMensais) || 0,
        observacoes: observacoes || null,
        status: status, // ATIVO ou PENDENTE
      };

      const resContrato = await sheets.createContrato(payload);
      const contratoCriado = resContrato?.data?.contrato;

      // Se há PDF anexado no passo 04, faz upload
      if (arquivoPdf && contratoCriado?.id) {
        try {
          const formData = new FormData();
          formData.append("arquivo", arquivoPdf);
          formData.append("tipo", "ORIGINAL");
          formData.append("descricao", "Contrato assinado em PDF");
          await sheets.uploadDocumentoContrato(contratoCriado.id, formData);
        } catch (errUpload) {
          console.warn("Aviso: Contrato criado, mas erro no upload do PDF:", errUpload);
        }
      }

      setSucessoMsg(
        status === "ATIVO"
          ? "Contrato criado com sucesso!"
          : "Contrato salvo como rascunho com sucesso!"
      );
      setTimeout(() => {
        navigate("/contratos");
      }, 1000);
    } catch (err) {
      console.error("Erro ao salvar contrato:", err);
      const msg = err.response?.data?.message || err.message;
      setErroMsg(msg || "Não foi possível criar o contrato. Verifique os campos.");
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              component="button"
              onClick={() => navigate("/contratos")}
              sx={sx.btnVoltar}
              title="Voltar para contratos"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Typography sx={sx.pageTitle}>Novo Contrato</Typography>
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
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_razao_social}
                  </option>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Alertas ── */}
        {erroMsg && (
          <Alert severity="error" onClose={() => setErroMsg("")} sx={{ borderRadius: "10px" }}>
            {erroMsg}
          </Alert>
        )}

        {/* ── Grid Principal de 2 Colunas (Formulário + Resumo) ── */}
        <Box sx={sx.contentGrid}>
          {/* Coluna Esquerda: Formulário Estruturado (~68%) */}
          <Box sx={sx.formColumn}>
            {/* 01 Dados do Cliente */}
            <Box sx={sx.cardSection}>
              <Box sx={sx.sectionHeader}>
                <Typography sx={sx.sectionNumber}>01</Typography>
                <Typography sx={sx.sectionTitle}>Dados do Cliente</Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography sx={sx.fieldLabel}>
                  Selecione o Cliente <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                <Box sx={{ display: "flex", gap: 1.5, mt: 0.8, alignItems: "center" }}>
                  <Box
                    component="select"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    sx={sx.customSelect}
                  >
                    {loadingClientes ? (
                      <option>Carregando clientes...</option>
                    ) : (
                      clientes.map((cli) => (
                        <option key={cli.id} value={cli.id}>
                          {cli.nome_razao_social}
                        </option>
                      ))
                    )}
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => setModalClienteAberto(true)}
                    sx={sx.btnNovoClienteModal}
                  >
                    Novo Cliente
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* 02 Dados do Contrato */}
            <Box sx={sx.cardSection}>
              <Box sx={sx.sectionHeader}>
                <Typography sx={sx.sectionNumber}>02</Typography>
                <Typography sx={sx.sectionTitle}>Dados do Contrato</Typography>
              </Box>

              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography sx={sx.fieldLabel}>
                    Título do Contrato <span style={{ color: "#ef4444" }}>*</span>
                  </Typography>
                  <InputBase
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Contrato de Prestação de Serviços de TI"
                    sx={sx.customInput}
                  />
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <Box>
                    <Typography sx={sx.fieldLabel}>
                      Valor Total <span style={{ color: "#ef4444" }}>*</span>
                    </Typography>
                    <Box sx={sx.inputWithPrefix}>
                      <Typography sx={sx.prefix}>R$</Typography>
                      <InputBase
                        value={valorTotalStr}
                        onChange={(e) => setValorTotalStr(e.target.value)}
                        placeholder="0,00"
                        sx={sx.inputInsidePrefix}
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography sx={sx.fieldLabel}>
                      Número de Parcelas <span style={{ color: "#ef4444" }}>*</span>
                    </Typography>
                    <InputBase
                      type="number"
                      value={numeroParcelas}
                      onChange={(e) => setNumeroParcelas(Math.max(1, Number(e.target.value)))}
                      placeholder="12"
                      sx={sx.customInput}
                      inputProps={{ min: 1, max: 120 }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <Box>
                    <Typography sx={sx.fieldLabel}>
                      Data de Início <span style={{ color: "#ef4444" }}>*</span>
                    </Typography>
                    <InputBase
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      sx={sx.customInput}
                    />
                  </Box>

                  <Box>
                    <Typography sx={sx.fieldLabel}>
                      Data de Término <span style={{ color: "#ef4444" }}>*</span>
                    </Typography>
                    <InputBase
                      type="date"
                      value={dataTermino}
                      onChange={(e) => setDataTermino(e.target.value)}
                      sx={sx.customInput}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography sx={sx.fieldLabel}>Periodicidade de Faturamento</Typography>
                  <Box
                    component="select"
                    value={periodicidade}
                    onChange={(e) => setPeriodicidade(e.target.value)}
                    sx={sx.customSelect}
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Bimestral">Bimestral</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                    <option value="Única">Parcela Única</option>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* 03 Condições Financeiras */}
            <Box sx={sx.cardSection}>
              <Box sx={sx.sectionHeader}>
                <Typography sx={sx.sectionNumber}>03</Typography>
                <Typography sx={sx.sectionTitle}>Condições Financeiras</Typography>
              </Box>

              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <Box>
                    <Typography sx={sx.fieldLabel}>Multa por Atraso (%)</Typography>
                    <InputBase
                      value={multaAtraso}
                      onChange={(e) => setMultaAtraso(e.target.value)}
                      placeholder="2.0 %"
                      sx={sx.customInput}
                    />
                  </Box>

                  <Box>
                    <Typography sx={sx.fieldLabel}>Juros Mensais (%)</Typography>
                    <InputBase
                      value={jurosMensais}
                      onChange={(e) => setJurosMensais(e.target.value)}
                      placeholder="1.0 %"
                      sx={sx.customInput}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography sx={sx.fieldLabel}>Observações de Faturamento</Typography>
                  <InputBase
                    multiline
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: As notas fiscais devem ser enviadas sempre até o dia 25 de cada mês."
                    sx={sx.customInputMultiline}
                  />
                </Box>
              </Box>
            </Box>

            {/* 04 Documento do Contrato */}
            <Box sx={sx.cardSection}>
              <Box sx={sx.sectionHeader}>
                <Typography sx={sx.sectionNumber}>04</Typography>
                <Typography sx={sx.sectionTitle}>Documento do Contrato</Typography>
              </Box>

              <Box
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                sx={{
                  ...sx.dropzone,
                  borderColor: isDragging ? "#2563eb" : "#93c5fd",
                  bgcolor: isDragging ? "#eff6ff" : "#f8fbff",
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <CloudUploadOutlinedIcon sx={{ fontSize: 38, color: "#3b82f6", mb: 1 }} />
                <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                  Arraste o contrato em formato PDF aqui
                </Typography>
                <Typography sx={{ fontSize: "12px", color: "#64748b", mt: 0.3, mb: 2 }}>
                  ou clique para buscar do seu computador (Limite de 15MB)
                </Typography>

                <Button
                  variant="contained"
                  disableElevation
                  onClick={() => fileInputRef.current?.click()}
                  sx={sx.btnSelectFile}
                >
                  Selecionar Arquivo
                </Button>

                {arquivoPdf && (
                  <Box sx={sx.selectedFileCard}>
                    <PictureAsPdfRoundedIcon sx={{ fontSize: 24, color: "#ef4444" }} />
                    <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }} noWrap>
                        {arquivoPdf.name}
                      </Typography>
                      <Typography sx={{ fontSize: "11px", color: "#64748b" }}>
                        {(arquivoPdf.size / (1024 * 1024)).toFixed(2)} MB • PDF Pronto para envio
                      </Typography>
                    </Box>
                    <Box
                      component="button"
                      onClick={() => setArquivoPdf(null)}
                      sx={sx.btnRemoveFile}
                      title="Remover arquivo"
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Coluna Direita: Resumo do Contrato (~32%) */}
          <Box sx={sx.summaryColumn}>
            <Box sx={sx.summaryCard}>
              <Typography sx={sx.summaryTitle}>Resumo do Contrato</Typography>

              <Box sx={sx.summaryList}>
                <Box sx={sx.summaryRow}>
                  <Typography sx={sx.summaryLabel}>Cliente:</Typography>
                  <Typography sx={sx.summaryValue} noWrap>
                    {clienteSelecionado?.nome_razao_social || "Selecione o cliente"}
                  </Typography>
                </Box>

                <Box sx={sx.summaryRow}>
                  <Typography sx={sx.summaryLabel}>Valor Total:</Typography>
                  <Typography sx={sx.summaryValue}>
                    {formatBRL(valorTotalNum)}
                  </Typography>
                </Box>

                <Box sx={sx.summaryRow}>
                  <Typography sx={sx.summaryLabel}>Parcelamento:</Typography>
                  <Typography sx={sx.summaryValue}>
                    {numeroParcelas}x de {formatBRL(valorParcelaCalc)}
                  </Typography>
                </Box>

                <Box sx={sx.summaryRow}>
                  <Typography sx={sx.summaryLabel}>Vigência:</Typography>
                  <Typography sx={sx.summaryValue}>{vigenciaMeses} meses</Typography>
                </Box>

                <Box sx={sx.summaryRow}>
                  <Typography sx={sx.summaryLabel}>Periodicidade:</Typography>
                  <Typography sx={sx.summaryValue}>{periodicidade}</Typography>
                </Box>
              </Box>

              {/* Box Informativo Azul */}
              <Box sx={sx.infoBox}>
                <InfoOutlinedIcon sx={{ fontSize: 18, color: "#2563eb", mt: "2px", flexShrink: 0 }} />
                <Typography sx={sx.infoText}>
                  Suas faturas recorrentes serão geradas automaticamente 5 dias antes de cada vencimento.
                </Typography>
              </Box>

              {/* Botões de Ação */}
              <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Button
                  variant="contained"
                  disableElevation
                  disabled={salvando}
                  onClick={() => handleSubmitContrato("ATIVO")}
                  sx={sx.btnCriarContrato}
                >
                  {salvando ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                  ) : (
                    "Criar Contrato"
                  )}
                </Button>

                <Button
                  variant="outlined"
                  disabled={salvando}
                  onClick={() => handleSubmitContrato("PENDENTE")}
                  sx={sx.btnSalvarRascunho}
                >
                  Salvar como Rascunho
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ══════════ MODAL NOVO CLIENTE RÁPIDO ══════════ */}
      <Dialog
        open={modalClienteAberto}
        onClose={() => !salvandoCliente && setModalClienteAberto(false)}
        maxWidth="xs"
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
          Novo Cliente
          <Box
            component="button"
            onClick={() => setModalClienteAberto(false)}
            sx={{ border: "none", background: "none", cursor: "pointer", color: "#67728a" }}
          >
            <CloseRoundedIcon />
          </Box>
        </DialogTitle>

        <form onSubmit={handleSalvarNovoCliente}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Nome / Razão Social *"
              size="small"
              fullWidth
              value={novoClienteForm.nome_razao_social}
              onChange={(e) =>
                setNovoClienteForm({ ...novoClienteForm, nome_razao_social: e.target.value })
              }
              required
            />
            <TextField
              label="CPF / CNPJ *"
              size="small"
              fullWidth
              value={novoClienteForm.cpf_cnpj}
              onChange={(e) =>
                setNovoClienteForm({ ...novoClienteForm, cpf_cnpj: e.target.value })
              }
              required
            />
            <TextField
              label="E-mail"
              type="email"
              size="small"
              fullWidth
              value={novoClienteForm.email}
              onChange={(e) =>
                setNovoClienteForm({ ...novoClienteForm, email: e.target.value })
              }
            />
            <TextField
              label="Telefone"
              size="small"
              fullWidth
              value={novoClienteForm.telefone}
              onChange={(e) =>
                setNovoClienteForm({ ...novoClienteForm, telefone: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setModalClienteAberto(false)}
              disabled={salvandoCliente}
              sx={{ color: "#67728a", textTransform: "none" }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={salvandoCliente}
              sx={{
                bgcolor: "#2563eb",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                px: 2.5,
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              {salvandoCliente ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Cadastrar Cliente"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ══════════ SNACKBAR FEEDBACK ══════════ */}
      <Snackbar
        open={Boolean(sucessoMsg)}
        autoHideDuration={4000}
        onClose={() => setSucessoMsg("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" sx={{ borderRadius: "10px", fontWeight: 600 }}>
          {sucessoMsg}
        </Alert>
      </Snackbar>
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

  formColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 2.5,
  },

  cardSection: {
    bgcolor: "#fff",
    border: "1px solid #eef2f6",
    borderRadius: "14px",
    p: { xs: 2.5, sm: 3 },
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 1.2,
  },
  sectionNumber: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#2563eb",
    letterSpacing: "-0.01em",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#182338",
  },

  fieldLabel: {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#475569",
    mb: "6px",
  },

  customInput: {
    bgcolor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    px: 1.5,
    py: 0.8,
    fontSize: "13.5px",
    color: "#1e293b",
    width: "100%",
    "&:focus-within": {
      borderColor: "#2563eb",
      boxShadow: "0 0 0 3px rgba(37,99,235,0.1)",
    },
  },

  customInputMultiline: {
    bgcolor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    px: 1.5,
    py: 1,
    fontSize: "13.5px",
    color: "#1e293b",
    width: "100%",
    "&:focus-within": {
      borderColor: "#2563eb",
      boxShadow: "0 0 0 3px rgba(37,99,235,0.1)",
    },
  },

  customSelect: {
    bgcolor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    px: "12px",
    py: "10px",
    fontSize: "13.5px",
    color: "#1e293b",
    width: "100%",
    outline: "none",
    cursor: "pointer",
    "&:focus": {
      borderColor: "#2563eb",
    },
  },

  inputWithPrefix: {
    display: "flex",
    alignItems: "center",
    bgcolor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    px: 1.5,
    py: 0.8,
    "&:focus-within": {
      borderColor: "#2563eb",
      boxShadow: "0 0 0 3px rgba(37,99,235,0.1)",
    },
  },
  prefix: {
    fontSize: "13.5px",
    fontWeight: 600,
    color: "#64748b",
    mr: 1,
  },
  inputInsidePrefix: {
    fontSize: "13.5px",
    color: "#1e293b",
    width: "100%",
  },

  btnNovoClienteModal: {
    border: "1px solid #e2e8f0",
    color: "#1e293b",
    bgcolor: "#fff",
    fontSize: "12.5px",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    px: 2,
    py: 0.9,
    flexShrink: 0,
    "&:hover": {
      bgcolor: "#f8fafc",
      borderColor: "#cbd5e1",
    },
  },

  dropzone: {
    mt: 2,
    border: "1.5px dashed #93c5fd",
    borderRadius: "12px",
    p: 4,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  btnSelectFile: {
    bgcolor: "#2563eb",
    color: "#fff",
    fontSize: "12.5px",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    px: 2.5,
    py: 0.8,
    "&:hover": { bgcolor: "#1d4ed8" },
  },
  selectedFileCard: {
    mt: 2.5,
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    bgcolor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    p: 1.5,
    width: "100%",
    maxWidth: 420,
  },
  btnRemoveFile: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#ef4444",
    p: 0.5,
    borderRadius: "4px",
    "&:hover": { bgcolor: "#fee2e2" },
  },

  summaryColumn: {
    position: { lg: "sticky" },
    top: { lg: "24px" },
  },
  summaryCard: {
    bgcolor: "#fff",
    border: "1px solid #eef2f6",
    borderRadius: "14px",
    p: 3,
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  summaryTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#182338",
    mb: 2.5,
  },
  summaryList: {
    display: "flex",
    flexDirection: "column",
    gap: 1.6,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 1,
  },
  summaryLabel: {
    fontSize: "13px",
    color: "#64748b",
  },
  summaryValue: {
    fontSize: "13.5px",
    fontWeight: 700,
    color: "#0f172a",
    textAlign: "right",
  },

  infoBox: {
    mt: 3,
    bgcolor: "#eff6ff",
    borderRadius: "10px",
    p: 1.8,
    display: "flex",
    gap: 1.2,
    border: "1px solid #dbeafe",
  },
  infoText: {
    fontSize: "12px",
    color: "#1e40af",
    lineHeight: 1.45,
  },

  btnCriarContrato: {
    bgcolor: "#2563eb",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    py: 1.2,
    "&:hover": { bgcolor: "#1d4ed8" },
  },
  btnSalvarRascunho: {
    border: "1px solid #e2e8f0",
    color: "#475569",
    bgcolor: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    py: 1.2,
    "&:hover": {
      bgcolor: "#f8fafc",
      borderColor: "#cbd5e1",
    },
  },
};
