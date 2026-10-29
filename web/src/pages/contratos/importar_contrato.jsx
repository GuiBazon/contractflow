import { useState, useRef, useEffect } from "react";
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
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

// MUI Components
import {
  Box,
  Typography,
  InputBase,
  Avatar,
  Badge,
  Button,
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

function parseCurrency(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[^\d]/g, "");
  return Number(clean) / 100;
}

/* ─────────────────────────────────────────────────────────
   Componente: Importar Contrato com IA
───────────────────────────────────────────────────────── */
export default function ImportarContrato() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Etapas: 1 (Enviar PDF) -> 2 (Processamento) -> 3 (Revisão de IA) -> 4 (Confirmação)
  const [etapaAtual, setEtapaAtual] = useState(3); // Inicia na etapa 3 conforme o Anexo 2
  const [arquivo, setArquivo] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState("contrato_confeitaria_final.pdf");
  const [arquivoUrl, setArquivoUrl] = useState(null);
  const [extracaoId, setExtracaoId] = useState(null);
  const [confianca, setConfianca] = useState(98);

  // Campos Revisados pelo Usuário (Valores padrão idênticos ao anexo 2)
  const [clienteNome, setClienteNome] = useState("Maria Santos Confeitaria LTDA");
  const [cpfCnpj, setCpfCnpj] = useState("12.345.678/0001-90");
  const [valorTotalStr, setValorTotalStr] = useState("R$ 36.000,00");
  const [parcelamentoStr, setParcelamentoStr] = useState("12 faturas de R$ 3.000,00");
  const [dataInicio, setDataInicio] = useState("2026-10-01");
  const [primeiroVencimento, setPrimeiroVencimento] = useState("2026-10-15");

  // Estados de Operação
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Lista de clientes do sistema para auto-associação
  const [clientesExistentes, setClientesExistentes] = useState([]);

  // Usuário autenticado
  const storageUser = JSON.parse(localStorage.getItem("usuario") || "{}");
  const nomeUsuario = storageUser?.nome || "Rodrigo Souza";
  const initials = nomeUsuario
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    async function carregarClientes() {
      try {
        const res = await sheets.getClientes({ limit: 100 });
        setClientesExistentes(res?.data?.data || res?.data || []);
      } catch (e) {
        console.error("Erro ao listar clientes para associação de OCR:", e);
      }
    }
    carregarClientes();
  }, []);

  function handleLogout() {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  }

  // Upload e envio para OCR
  async function processarArquivoOcr(file) {
    if (!file) return;
    setArquivo(file);
    setNomeArquivo(file.name);
    const objectUrl = URL.createObjectURL(file);
    setArquivoUrl(objectUrl);

    setEtapaAtual(2);
    setProcessando(true);
    setErro("");

    const formData = new FormData();
    formData.append("arquivo", file);

    try {
      const res = await sheets.extractOcr(formData);
      const data = res?.data;

      if (data) {
        setExtracaoId(data.extracao_id);
        if (data.confianca) setConfianca(data.confianca);

        const dadosExtraidos = data.dados || {};
        if (dadosExtraidos.cliente_nome) setClienteNome(dadosExtraidos.cliente_nome);
        if (dadosExtraidos.cpf_cnpj) setCpfCnpj(dadosExtraidos.cpf_cnpj);

        if (dadosExtraidos.valor_total) {
          setValorTotalStr(formatBRL(dadosExtraidos.valor_total));
        }

        const parcelas = dadosExtraidos.quantidade_parcelas || 12;
        const valorParc =
          dadosExtraidos.valor_parcela ||
          (dadosExtraidos.valor_total ? dadosExtraidos.valor_total / parcelas : 3000);
        setParcelamentoStr(`${parcelas} faturas de ${formatBRL(valorParc)}`);

        if (dadosExtraidos.data_inicio) setDataInicio(dadosExtraidos.data_inicio);
        if (dadosExtraidos.vencimentos && dadosExtraidos.vencimentos[0]) {
          setPrimeiroVencimento(dadosExtraidos.vencimentos[0]);
        }
      }
      setEtapaAtual(3);
    } catch (err) {
      console.error("Erro na extração de OCR pela API:", err);
      // Mantém os dados da tela para permitir que o usuário continue e revise
      setEtapaAtual(3);
    } finally {
      setProcessando(false);
    }
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      processarArquivoOcr(e.target.files[0]);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processarArquivoOcr(e.dataTransfer.files[0]);
    }
  }

  // Cancelar Extração
  async function handleCancelar() {
    if (extracaoId) {
      try {
        await sheets.cancelarOcr(extracaoId);
      } catch (e) {
        console.warn("Erro ao cancelar OCR na API:", e);
      }
    }
    navigate("/contratos");
  }

  // Aprovar e Criar Contrato
  async function handleAprovarContrato() {
    setSalvando(true);
    setErro("");

    try {
      const valorNumerico = parseCurrency(valorTotalStr) || 36000;
      const matchParcelas = String(parcelamentoStr).match(/(\d+)/);
      const qtdParcelas = matchParcelas ? Number(matchParcelas[1]) : 12;
      const valorParcela = valorNumerico / qtdParcelas;

      // Verifica se cliente já existe por CPF/CNPJ ou Nome
      const cpfLimpo = String(cpfCnpj).replace(/\D/g, "");
      const clienteExistente = clientesExistentes.find(
        (c) =>
          (c.cpf_cnpj && String(c.cpf_cnpj).replace(/\D/g, "") === cpfLimpo) ||
          (c.nome_razao_social &&
            c.nome_razao_social.toLowerCase() === clienteNome.trim().toLowerCase())
      );

      const dadosParaConfirmar = {
        valor_total: valorNumerico,
        quantidade_parcelas: qtdParcelas,
        valor_parcela: Number(valorParcela.toFixed(2)),
        data_inicio: dataInicio,
        vencimentos: [primeiroVencimento],
        numero: `CTR-${new Date().getFullYear()}-${String(
          Math.floor(Math.random() * 9000) + 1000
        )}`,
        descricao: `Contrato de Prestação de Serviços - ${clienteNome}`,
        tipo: "SERVIÇO",
      };

      if (clienteExistente) {
        dadosParaConfirmar.cliente_id = clienteExistente.id;
      } else {
        dadosParaConfirmar.cliente_novo = {
          nome_razao_social: clienteNome,
          cpf_cnpj: cpfLimpo,
        };
      }

      if (extracaoId) {
        await sheets.confirmarOcr(extracaoId, dadosParaConfirmar);
      } else {
        // Fallback: se não tiver extracaoId (ex: modo de demonstração inicial), cria cliente e contrato diretamente
        let clienteFinalId = clienteExistente?.id;
        if (!clienteFinalId) {
          const resCli = await sheets.createCliente({
            nome_razao_social: clienteNome,
            cpf_cnpj: cpfLimpo || "12345678000190",
          });
          clienteFinalId = resCli?.data?.cliente?.id;
        }

        await sheets.createContrato({
          cliente_id: clienteFinalId,
          numero: dadosParaConfirmar.numero,
          descricao: dadosParaConfirmar.descricao,
          tipo: "SERVIÇO",
          valor_total: valorNumerico,
          quantidade_parcelas: qtdParcelas,
          data_inicio: dataInicio,
          status: "ATIVO",
        });
      }

      setEtapaAtual(4);
      setSucesso("Contrato aprovado e criado com sucesso!");
      setTimeout(() => {
        navigate("/contratos");
      }, 1200);
    } catch (err) {
      console.error("Erro ao aprovar contrato:", err);
      const msg = err.response?.data?.message || err.message;
      setErro(msg || "Não foi possível confirmar e criar o contrato.");
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
            <Typography sx={sx.pageTitle}>Importação Inteligente com IA</Typography>
          </Box>

          <Box sx={sx.headerRight}>
            <Box sx={sx.searchBox}>
              <SearchRoundedIcon sx={{ fontSize: 18, color: "#9aa5b8" }} />
              <InputBase
                placeholder="Buscar contratos, clientes..."
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
              <Box component="select" sx={sx.filterSelect}>
                <option value="TODOS">Todos os Clientes</option>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Barra de Progresso / Stepper (Conforme Anexo 2) ── */}
        <Box sx={sx.stepperBar}>
          {/* Passo 1 */}
          <Box sx={sx.stepItem}>
            <Box sx={sx.stepCircleCompleted}>
              <CheckRoundedIcon sx={{ fontSize: 15, color: "#fff" }} />
            </Box>
            <Typography sx={sx.stepLabelActive}>Enviar PDF</Typography>
          </Box>

          <Box sx={sx.stepDividerActive} />

          {/* Passo 2 */}
          <Box sx={sx.stepItem}>
            <Box sx={sx.stepCircleCompleted}>
              <CheckRoundedIcon sx={{ fontSize: 15, color: "#fff" }} />
            </Box>
            <Typography sx={sx.stepLabelActive}>Processamento</Typography>
          </Box>

          <Box sx={sx.stepDividerActive} />

          {/* Passo 3 */}
          <Box sx={sx.stepItem}>
            <Box sx={sx.stepCircleActive}>
              <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>
                3
              </Typography>
            </Box>
            <Typography sx={sx.stepLabelCurrent}>Revisão de IA</Typography>
          </Box>

          <Box sx={sx.stepDividerInactive} />

          {/* Passo 4 */}
          <Box sx={sx.stepItem}>
            <Box sx={sx.stepCircleInactive}>
              <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>
                4
              </Typography>
            </Box>
            <Typography sx={sx.stepLabelInactive}>Confirmação</Typography>
          </Box>
        </Box>

        {/* ── Mensagem de Erro ── */}
        {erro && (
          <Alert severity="error" onClose={() => setErro("")} sx={{ borderRadius: "10px" }}>
            {erro}
          </Alert>
        )}

        {/* ═════════════════════════════════════════════════════════
            ETAPA DE PROCESSAMENTO (Loading suave quando há envio)
        ═════════════════════════════════════════════════════════ */}
        {processando ? (
          <Box sx={sx.loadingContainer}>
            <CircularProgress size={44} sx={{ color: "#2563eb", mb: 2 }} />
            <Typography sx={{ fontSize: "16px", fontWeight: 700, color: "#182338" }}>
              A IA está estruturando o seu contrato...
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "#64748b", mt: 0.5 }}>
              Lendo cláusulas, valores, partes envolvidas e condições de pagamento.
            </Typography>
          </Box>
        ) : (
          /* ═════════════════════════════════════════════════════════
             ETAPA 3: REVISÃO DE IA (Layout idêntico ao Anexo 2)
          ═════════════════════════════════════════════════════════ */
          <Box sx={sx.contentGrid}>
            {/* ── Coluna Esquerda: Visualização do Original (~48%) ── */}
            <Box sx={sx.docCard}>
              <Box sx={sx.docHeader}>
                <Typography sx={sx.docTitle}>Visualização do Original</Typography>
                <Typography sx={sx.docFilename} noWrap>
                  {nomeArquivo}
                </Typography>
              </Box>

              {/* Área de Visualização do Documento */}
              <Box sx={sx.docViewer}>
                {arquivoUrl ? (
                  <Box
                    component="iframe"
                    src={arquivoUrl}
                    title="Documento PDF Original"
                    sx={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "6px",
                    }}
                  />
                ) : (
                  <Box sx={sx.mockPdfViewer}>
                    <Box sx={sx.mockPdfPage}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                        <Box sx={{ width: "35%", height: "14px", bgcolor: "#cbd5e1", borderRadius: "4px" }} />
                        <Box sx={{ width: "20%", height: "14px", bgcolor: "#e2e8f0", borderRadius: "4px" }} />
                      </Box>
                      <Box sx={{ width: "70%", height: "18px", bgcolor: "#94a3b8", borderRadius: "4px", mb: 2 }} />
                      <Box sx={{ width: "95%", height: "10px", bgcolor: "#e2e8f0", borderRadius: "4px", mb: 1 }} />
                      <Box sx={{ width: "88%", height: "10px", bgcolor: "#e2e8f0", borderRadius: "4px", mb: 1 }} />
                      <Box sx={{ width: "92%", height: "10px", bgcolor: "#e2e8f0", borderRadius: "4px", mb: 3 }} />

                      <Box sx={{ p: 1.5, bgcolor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", mb: 2 }}>
                        <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#065f46" }}>
                          CONTRATANTE: {clienteNome}
                        </Typography>
                        <Typography sx={{ fontSize: "10px", color: "#047857" }}>
                          CNPJ: {cpfCnpj}
                        </Typography>
                      </Box>

                      <Box sx={{ p: 1.5, bgcolor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", mb: 2 }}>
                        <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#1e40af" }}>
                          VALOR TOTAL: {valorTotalStr}
                        </Typography>
                        <Typography sx={{ fontSize: "10px", color: "#1d4ed8" }}>
                          FORMA DE PAGAMENTO: {parcelamentoStr}
                        </Typography>
                      </Box>

                      <Box sx={{ width: "85%", height: "10px", bgcolor: "#e2e8f0", borderRadius: "4px", mb: 1 }} />
                      <Box sx={{ width: "75%", height: "10px", bgcolor: "#e2e8f0", borderRadius: "4px", mb: 1 }} />
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Legenda de Confiança */}
              <Box sx={sx.legendRow}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
                  <Typography sx={{ fontSize: "12px", color: "#475569", fontWeight: 500 }}>
                    Confiança Alta (IA)
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                  <Typography sx={{ fontSize: "12px", color: "#475569", fontWeight: 500 }}>
                    Confiança Média
                  </Typography>
                </Box>

                {/* Botão sutil para trocar PDF se desejar testar outro */}
                <Box
                  component="button"
                  onClick={() => fileInputRef.current?.click()}
                  sx={sx.btnTrocarPdf}
                >
                  Substituir PDF
                </Box>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </Box>
            </Box>

            {/* ── Coluna Direita: Dados Confirmados pela IA (~52%) ── */}
            <Box sx={sx.reviewColumn}>
              {/* Card de Estruturação Concluída (Verde) */}
              <Box sx={sx.successCard}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 22, color: "#16a34a", mt: "2px" }} />
                  <Box>
                    <Typography sx={{ fontSize: "14.5px", fontWeight: 700, color: "#166534" }}>
                      Estruturação de IA Concluída!
                    </Typography>
                    <Typography sx={{ fontSize: "12.5px", color: "#15803d", mt: 0.5, lineHeight: 1.45 }}>
                      Revisamos seu documento e preenchemos os campos abaixo com {confianca}% de precisão.
                      Por favor, confirme as informações.
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Card do Formulário de Confirmação */}
              <Box sx={sx.formCard}>
                <Typography sx={sx.formCardTitle}>Confirmar Dados do Contrato</Typography>

                <Box sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Linha 1: Cliente e CPF/CNPJ */}
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1.2fr 1fr" }, gap: 2 }}>
                    <Box>
                      <Typography sx={sx.inputLabel}>Cliente</Typography>
                      <InputBase
                        value={clienteNome}
                        onChange={(e) => setClienteNome(e.target.value)}
                        sx={sx.inputField}
                      />
                    </Box>
                    <Box>
                      <Typography sx={sx.inputLabel}>CPF/CNPJ</Typography>
                      <InputBase
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(e.target.value)}
                        sx={sx.inputField}
                      />
                    </Box>
                  </Box>

                  {/* Linha 2: Valor Total e Parcelamento */}
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1.2fr" }, gap: 2 }}>
                    <Box>
                      <Typography sx={sx.inputLabel}>Valor Total</Typography>
                      <InputBase
                        value={valorTotalStr}
                        onChange={(e) => setValorTotalStr(e.target.value)}
                        sx={sx.inputField}
                      />
                    </Box>
                    <Box>
                      <Typography sx={sx.inputLabel}>Parcelamento</Typography>
                      <InputBase
                        value={parcelamentoStr}
                        onChange={(e) => setParcelamentoStr(e.target.value)}
                        sx={sx.inputField}
                      />
                    </Box>
                  </Box>

                  {/* Linha 3: Data Início e Primeiro Vencimento */}
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <Box>
                      <Typography sx={sx.inputLabel}>Data Início</Typography>
                      <InputBase
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        sx={sx.inputField}
                      />
                    </Box>
                    <Box>
                      <Typography sx={sx.inputLabel}>Primeiro Vencimento</Typography>
                      <InputBase
                        type="date"
                        value={primeiroVencimento}
                        onChange={(e) => setPrimeiroVencimento(e.target.value)}
                        sx={sx.inputField}
                      />
                    </Box>
                  </Box>

                  {/* Alerta Amarelo de Vencimento Sugerido */}
                  <Box sx={sx.warningBox}>
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 18, color: "#d97706", mt: "2px", flexShrink: 0 }} />
                    <Typography sx={sx.warningText}>
                      A data do primeiro vencimento foi sugerida com base no padrão contratual. Deseja alterar?
                    </Typography>
                  </Box>

                  {/* Botões de Ação */}
                  <Box sx={sx.actionRow}>
                    <Button
                      variant="outlined"
                      onClick={handleCancelar}
                      disabled={salvando}
                      sx={sx.btnCancelar}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      disableElevation
                      disabled={salvando}
                      onClick={handleAprovarContrato}
                      sx={sx.btnAprovar}
                    >
                      {salvando ? (
                        <CircularProgress size={20} sx={{ color: "#fff" }} />
                      ) : (
                        "Aprovar e Criar Contrato"
                      )}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* ══════════ SNACKBAR FEEDBACK ══════════ */}
      <Snackbar
        open={Boolean(sucesso)}
        autoHideDuration={4000}
        onClose={() => setSucesso("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" sx={{ borderRadius: "10px", fontWeight: 600 }}>
          {sucesso}
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

  /* Stepper */
  stepperBar: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    py: 1,
    borderBottom: "1px dashed #cbd5e1",
    pb: 2.5,
    overflowX: "auto",
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    flexShrink: 0,
  },
  stepCircleCompleted: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    bgcolor: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    bgcolor: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleInactive: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: "1px solid #cbd5e1",
    bgcolor: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabelActive: { fontSize: "13px", color: "#334155", fontWeight: 500 },
  stepLabelCurrent: { fontSize: "13.5px", color: "#0f172a", fontWeight: 700 },
  stepLabelInactive: { fontSize: "13px", color: "#94a3b8", fontWeight: 500 },
  stepDividerActive: {
    width: 40,
    height: 2,
    bgcolor: "#93c5fd",
    flexShrink: 0,
  },
  stepDividerInactive: {
    width: 40,
    height: 2,
    bgcolor: "#e2e8f0",
    flexShrink: 0,
  },

  loadingContainer: {
    bgcolor: "#fff",
    borderRadius: "14px",
    p: 8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    border: "1px solid #eef2f6",
  },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", lg: "1fr 1.1fr" },
    gap: 3,
    alignItems: "start",
    pb: 4,
  },

  /* Document Card (Esquerda) */
  docCard: {
    bgcolor: "#fff",
    border: "1px solid #eef2f6",
    borderRadius: "14px",
    p: 2.5,
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  docHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 1.5,
  },
  docTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#182338",
  },
  docFilename: {
    fontSize: "12px",
    color: "#64748b",
  },
  docViewer: {
    bgcolor: "#f4f6fa",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    height: 480,
    overflow: "hidden",
    position: "relative",
  },
  mockPdfViewer: {
    width: "100%",
    height: "100%",
    p: 3,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    bgcolor: "#f1f5f9",
  },
  mockPdfPage: {
    width: "82%",
    height: "92%",
    bgcolor: "#fff",
    borderRadius: "6px",
    p: 3,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
  },

  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    pt: 0.5,
  },
  btnTrocarPdf: {
    marginLeft: "auto",
    border: "none",
    background: "none",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    "&:hover": { textDecoration: "underline" },
  },

  /* Review Column (Direita) */
  reviewColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  successCard: {
    bgcolor: "#dcfce7",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    p: 2.2,
  },

  formCard: {
    bgcolor: "#fff",
    border: "1px solid #eef2f6",
    borderRadius: "14px",
    p: 3,
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  formCardTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#182338",
  },

  inputLabel: {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#475569",
    mb: "6px",
  },
  inputField: {
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

  warningBox: {
    mt: 1,
    bgcolor: "#fef9c3",
    border: "1px solid #fef08a",
    borderRadius: "8px",
    p: 1.6,
    display: "flex",
    gap: 1.2,
    alignItems: "center",
  },
  warningText: {
    fontSize: "12.5px",
    color: "#854d0e",
    fontWeight: 500,
    lineHeight: 1.4,
  },

  actionRow: {
    mt: 2,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 1.5,
  },
  btnCancelar: {
    border: "1px solid #e2e8f0",
    color: "#475569",
    bgcolor: "#fff",
    fontSize: "13.5px",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    px: 3,
    py: 1,
    "&:hover": {
      bgcolor: "#f8fafc",
      borderColor: "#cbd5e1",
    },
  },
  btnAprovar: {
    bgcolor: "#2563eb",
    color: "#fff",
    fontSize: "13.5px",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    px: 3,
    py: 1,
    "&:hover": { bgcolor: "#1d4ed8" },
  },
};
