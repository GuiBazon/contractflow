import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import sheets from "../../axios/axios";
import SnackBar from "../../components/snack_bar/snack_bar";
import Sidebar from "../../components/sidebar/sidebar";
import Header from "../../components/header/header";

import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";

import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────
function parseMoeda(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d,.-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function formatMoeda(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatarData(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("pt-BR");
}

// ─────────────────────────────────────────────────────────────────
//  Lógica de cálculo
// ─────────────────────────────────────────────────────────────────
function calcularSaldoDevedor(formulario) {
  const valorOriginal  = parseMoeda(formulario.valorOriginal);
  const numParcelas    = parseInt(formulario.numParcelas)    || 0;
  const parcelasPagas  = parseInt(formulario.parcelasPagas)  || 0;
  const taxaMensal     = parseMoeda(formulario.taxaJurosMensal) / 100;
  const multaPerc      = parseMoeda(formulario.multaAtraso)  / 100;
  const diasAtraso     = parseInt(formulario.diasAtraso)     || 0;

  if (valorOriginal <= 0 || numParcelas <= 0) return null;

  // 1. Valor da parcela
  const valorParcela = valorOriginal / numParcelas;

  // 2. Parcelas restantes
  const parcelasRestantes = Math.max(numParcelas - parcelasPagas, 0);

  // 3. Valor restante (principal)
  const valorRestante = valorParcela * parcelasRestantes;

  // 4. Multa por atraso (sobre o valor restante)
  const multa = parcelasRestantes > 0 ? valorRestante * multaPerc : 0;

  // 5. Juros pro-rata com base nos dias em atraso
  //    Taxa diária = (1 + taxaMensal)^(1/30) - 1
  let jurosAcumulados = 0;
  if (diasAtraso > 0 && taxaMensal > 0 && parcelasRestantes > 0) {
    const taxaDiaria = Math.pow(1 + taxaMensal, 1 / 30) - 1;
    jurosAcumulados = valorRestante * (Math.pow(1 + taxaDiaria, diasAtraso) - 1);
  }

  // 6. Correção monetária placeholder (IPCA aproximado = 0,3% a.m.)
  const correcaoMonetaria =
    formulario.tipoCalculo === "correcao_monetaria" && diasAtraso > 0
      ? valorRestante * (Math.pow(1.003, diasAtraso / 30) - 1)
      : 0;

  const totalAtualizado = valorRestante + multa + jurosAcumulados + correcaoMonetaria;

  return {
    valorParcela,
    parcelasRestantes,
    valorRestante,
    multa,
    jurosAcumulados,
    correcaoMonetaria,
    totalAtualizado,
  };
}

// ─────────────────────────────────────────────────────────────────
//  Componente
// ─────────────────────────────────────────────────────────────────
function Calculadora() {
  const navigate = useNavigate();

  // ── Alerta ──────────────────────────────────────────────────
  const [alert, setAlert] = useState({ open: false, severity: "", message: "" });

  const showAlert = (severity, message) => setAlert({ open: true, severity, message });
  const handleCloseAlert = () => setAlert((prev) => ({ ...prev, open: false }));

  // ── Formulário ───────────────────────────────────────────────
  const FORM_INIT = {
    tipoCalculo:       "saldo_devedor",
    valorOriginal:     "",
    numParcelas:       "",
    parcelasPagas:     "",
    taxaJurosMensal:   "",
    multaAtraso:       "",
    diasAtraso:        "",
  };

  const [formulario, setFormulario] = useState(FORM_INIT);
  const [loading, setLoading]       = useState(false);
  const [resultado, setResultado]   = useState(null);

  // ── Histórico ────────────────────────────────────────────────
  const [historico, setHistorico]   = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);

  useEffect(() => {
    setLoadingHist(true);
    sheets
      .getHistoricoSimulacoes()
      .then((res) => setHistorico(res.data?.data || res.data || []))
      .catch(() => {
        // API ainda não implementada — exibe lista vazia silenciosamente
        setHistorico([]);
      })
      .finally(() => setLoadingHist(false));
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  function onChange(e) {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  }

  function validar() {
    const { valorOriginal, numParcelas, parcelasPagas, taxaJurosMensal } = formulario;

    if (!valorOriginal) {
      showAlert("warning", "Informe o Valor Original do Contrato.");
      return false;
    }
    if (parseMoeda(valorOriginal) <= 0) {
      showAlert("warning", "O Valor Original deve ser maior que zero.");
      return false;
    }
    if (!numParcelas || parseInt(numParcelas) <= 0) {
      showAlert("warning", "Informe o Número de Parcelas (> 0).");
      return false;
    }
    if (parcelasPagas !== "" && parseInt(parcelasPagas) > parseInt(numParcelas)) {
      showAlert("warning", "Parcelas Pagas não pode ser maior que o total de parcelas.");
      return false;
    }
    if (!taxaJurosMensal && parseMoeda(taxaJurosMensal) < 0) {
      showAlert("warning", "A Taxa de Juros não pode ser negativa.");
      return false;
    }
    return true;
  }

  function handleCalcular() {
    if (!validar()) return;

    setLoading(true);
    // Cálculo local (lógica portada do mobile)
    setTimeout(() => {
      try {
        const res = calcularSaldoDevedor(formulario);
        setResultado(res);

        // Persiste no histórico local enquanto a API não existe
        const novoItem = {
          id: Date.now(),
          data: new Date().toISOString(),
          contrato: "—",
          tipo: formulario.tipoCalculo,
          valorOriginal: parseMoeda(formulario.valorOriginal),
          valorCalculado: res?.totalAtualizado ?? 0,
        };
        setHistorico((prev) => [novoItem, ...prev.slice(0, 19)]);

        showAlert("success", "Simulação calculada com sucesso!");
      } catch {
        showAlert("error", "Erro ao processar o cálculo.");
      } finally {
        setLoading(false);
      }
    }, 600);
  }

  function handleLimpar() {
    setFormulario(FORM_INIT);
    setResultado(null);
  }

  function handleExportarPDF() {
    showAlert("info", "Exportação para PDF estará disponível em breve.");
  }

  function handleAplicarContrato() {
    showAlert("info", "Integração com contratos estará disponível em breve.");
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <Box sx={styles.root}>
      <SnackBar
        open={alert.open}
        severity={alert.severity}
        message={alert.message}
        handleClose={handleCloseAlert}
      />

      {/* Sidebar */}
      <Sidebar />

      {/* Conteúdo */}
      <Box sx={styles.content}>
        <Header title="Calculadora Financeira" notificationCount={3} />

        <Box sx={styles.body}>
          {/* ══════════════════════════════════════════════════
              LINHA 1 — Formulário + Resultado
          ══════════════════════════════════════════════════ */}
          <Grid container spacing={2.5}>

            {/* ─────── Formulário ─────── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Box sx={styles.card}>
                {/* Header do card */}
                <Box sx={styles.cardHeader}>
                  <Box sx={styles.cardHeaderIcon}>
                    <CalculateRoundedIcon sx={{ fontSize: 18, color: "#3f7ff2" }} />
                  </Box>
                  <Box>
                    <Typography sx={styles.cardTitle}>Dados do Cálculo</Typography>
                    <Typography sx={styles.cardSubtitle}>Preencha os campos abaixo para simular</Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2.5, borderColor: "#f0f4fa" }} />

                {/* Campos */}
                <Box sx={styles.formGrid}>
                  {/* Tipo de Cálculo */}
                  <Box sx={styles.fieldGroup}>
                    <Typography sx={styles.label}>Tipo de Cálculo</Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        name="tipoCalculo"
                        value={formulario.tipoCalculo}
                        onChange={onChange}
                        disabled={loading}
                        sx={styles.select}
                      >
                        <MenuItem value="saldo_devedor">Saldo Devedor Atualizado</MenuItem>
                        <MenuItem value="parcelas_futuras">Parcelas Futuras</MenuItem>
                        <MenuItem value="correcao_monetaria">Correção Monetária</MenuItem>
                        <MenuItem value="refinanciamento">Refinanciamento</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Valor Original */}
                  <Box sx={styles.fieldGroup}>
                    <Typography sx={styles.label}>Valor Original do Contrato</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      name="valorOriginal"
                      placeholder="Ex: 50000,00"
                      value={formulario.valorOriginal}
                      onChange={onChange}
                      disabled={loading}
                      sx={styles.input}
                      InputProps={{
                        startAdornment: (
                          <Typography sx={styles.prefix}>R$</Typography>
                        ),
                      }}
                    />
                  </Box>

                  {/* Número de Parcelas + Parcelas Pagas */}
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <Box sx={styles.fieldGroup}>
                        <Typography sx={styles.label}>Nº de Parcelas</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          name="numParcelas"
                          placeholder="Ex: 24"
                          value={formulario.numParcelas}
                          onChange={onChange}
                          disabled={loading}
                          sx={styles.input}
                          inputProps={{ min: 1 }}
                        />
                      </Box>
                    </Grid>
                    <Grid size={6}>
                      <Box sx={styles.fieldGroup}>
                        <Typography sx={styles.label}>Parcelas Pagas</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          name="parcelasPagas"
                          placeholder="Ex: 6"
                          value={formulario.parcelasPagas}
                          onChange={onChange}
                          disabled={loading}
                          sx={styles.input}
                          inputProps={{ min: 0 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Taxa de Juros Mensal */}
                  <Box sx={styles.fieldGroup}>
                    <Typography sx={styles.label}>Taxa de Juros Mensal (%)</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      name="taxaJurosMensal"
                      placeholder="Ex: 1,5"
                      value={formulario.taxaJurosMensal}
                      onChange={onChange}
                      disabled={loading}
                      sx={styles.input}
                      InputProps={{
                        endAdornment: <Typography sx={styles.suffix}>% a.m.</Typography>,
                      }}
                    />
                  </Box>

                  {/* Multa + Dias em Atraso */}
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <Box sx={styles.fieldGroup}>
                        <Typography sx={styles.label}>Multa por Atraso (%)</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          name="multaAtraso"
                          placeholder="Ex: 2"
                          value={formulario.multaAtraso}
                          onChange={onChange}
                          disabled={loading}
                          sx={styles.input}
                          InputProps={{
                            endAdornment: <Typography sx={styles.suffix}>%</Typography>,
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid size={6}>
                      <Box sx={styles.fieldGroup}>
                        <Typography sx={styles.label}>Dias em Atraso</Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          name="diasAtraso"
                          placeholder="Ex: 30"
                          value={formulario.diasAtraso}
                          onChange={onChange}
                          disabled={loading}
                          sx={styles.input}
                          inputProps={{ min: 0 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Botões */}
                  <Box sx={styles.buttons}>
                    <Button
                      variant="contained"
                      onClick={handleCalcular}
                      disabled={loading}
                      startIcon={loading
                        ? <CircularProgress size={16} sx={{ color: "#fff" }} />
                        : <CalculateRoundedIcon />
                      }
                      sx={styles.btnPrimary}
                    >
                      {loading ? "Calculando..." : "Calcular"}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={handleLimpar}
                      disabled={loading}
                      startIcon={<CleaningServicesRoundedIcon />}
                      sx={styles.btnOutlined}
                    >
                      Limpar Campos
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* ─────── Resultado ─────── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Box sx={{ ...styles.card, height: "100%" }}>
                <Box sx={styles.cardHeader}>
                  <Box sx={{ ...styles.cardHeaderIcon, backgroundColor: resultado ? "#edfaf3" : "#f5f7fb" }}>
                    <AccountBalanceRoundedIcon sx={{ fontSize: 18, color: resultado ? "#22c55e" : "#aab8cc" }} />
                  </Box>
                  <Box>
                    <Typography sx={styles.cardTitle}>Resultado da Simulação</Typography>
                    <Typography sx={styles.cardSubtitle}>Valores calculados em tempo real</Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2.5, borderColor: "#f0f4fa" }} />

                {!resultado ? (
                  <Box sx={styles.emptyResult}>
                    <Box sx={styles.emptyIcon}>
                      <CalculateRoundedIcon sx={{ fontSize: 36, color: "#c8d6e8" }} />
                    </Box>
                    <Typography sx={styles.emptyTitle}>Aguardando Simulação</Typography>
                    <Typography sx={styles.emptyText}>
                      Preencha os dados do formulário ao lado e clique em <strong>Calcular</strong> para visualizar os resultados.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {/* Saldo devedor em destaque */}
                    <Box sx={styles.highlightBox}>
                      <Typography sx={styles.highlightLabel}>SALDO DEVEDOR ATUALIZADO</Typography>
                      <Typography sx={styles.highlightValue}>
                        {formatMoeda(resultado.totalAtualizado)}
                      </Typography>
                      <Chip
                        icon={<TrendingUpRoundedIcon sx={{ fontSize: "14px !important" }} />}
                        label="Simulação Calculada"
                        size="small"
                        sx={styles.highlightChip}
                      />
                    </Box>

                    {/* Breakdown */}
                    <Box sx={styles.breakdown}>
                      <BreakdownRow
                        icon={<ReceiptLongRoundedIcon />}
                        label="Valor Restante das Parcelas"
                        value={formatMoeda(resultado.valorRestante)}
                        sub={`${resultado.parcelasRestantes} parcelas de ${formatMoeda(resultado.valorParcela)}`}
                        color="#3f7ff2"
                      />

                      <BreakdownRow
                        icon={<TrendingUpRoundedIcon />}
                        label="Juros Acumulados"
                        value={formatMoeda(resultado.jurosAcumulados)}
                        sub={`Base pro-rata sobre ${formulario.diasAtraso || 0} dias`}
                        color="#f59e0b"
                      />

                      <BreakdownRow
                        icon={<WarningAmberRoundedIcon />}
                        label="Multa por Atraso"
                        value={formatMoeda(resultado.multa)}
                        sub={`${formulario.multaAtraso || 0}% sobre o valor restante`}
                        color="#ef4444"
                      />

                      {resultado.correcaoMonetaria > 0 && (
                        <BreakdownRow
                          icon={<AccountBalanceRoundedIcon />}
                          label="Correção Monetária (IPCA ~0,3% a.m.)"
                          value={formatMoeda(resultado.correcaoMonetaria)}
                          sub="Aplicada sobre o valor restante"
                          color="#8b5cf6"
                        />
                      )}

                      <Divider sx={{ my: 1.5, borderColor: "#f0f4fa" }} />

                      {/* Total */}
                      <Box sx={styles.totalRow}>
                        <Typography sx={styles.totalLabel}>TOTAL ATUALIZADO</Typography>
                        <Typography sx={styles.totalValue}>
                          {formatMoeda(resultado.totalAtualizado)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Botões de ação */}
                    <Box sx={styles.resultActions}>
                      <Button
                        variant="outlined"
                        startIcon={<PictureAsPdfRoundedIcon />}
                        onClick={handleExportarPDF}
                        sx={styles.btnOutlined}
                        fullWidth
                      >
                        Exportar PDF
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<AssignmentTurnedInRoundedIcon />}
                        onClick={handleAplicarContrato}
                        sx={styles.btnPrimary}
                        fullWidth
                      >
                        Aplicar ao Contrato
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* ══════════════════════════════════════════════════
              LINHA 2 — Histórico
          ══════════════════════════════════════════════════ */}
          <Box sx={{ ...styles.card, mt: 2.5 }}>
            <Box sx={styles.cardHeader}>
              <Box sx={styles.cardHeaderIcon}>
                <ReceiptLongRoundedIcon sx={{ fontSize: 18, color: "#3f7ff2" }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={styles.cardTitle}>Histórico de Simulações</Typography>
                <Typography sx={styles.cardSubtitle}>Últimas simulações realizadas nesta sessão</Typography>
              </Box>
              <Chip
                label={`${historico.length} registros`}
                size="small"
                sx={styles.countChip}
              />
            </Box>

            <Divider sx={{ mb: 0, borderColor: "#f0f4fa" }} />

            {loadingHist ? (
              <Box sx={styles.loadingCenter}>
                <CircularProgress size={28} sx={{ color: "#3f7ff2" }} />
              </Box>
            ) : historico.length === 0 ? (
              <Box sx={styles.emptyResult}>
                <Box sx={styles.emptyIcon}>
                  <ReceiptLongRoundedIcon sx={{ fontSize: 32, color: "#c8d6e8" }} />
                </Box>
                <Typography sx={styles.emptyTitle}>Nenhuma simulação ainda</Typography>
                <Typography sx={styles.emptyText}>
                  As simulações realizadas aparecerão aqui.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["Data", "Contrato", "Tipo", "Valor Original", "Valor Calculado", "Ação"].map((col) => (
                        <TableCell key={col} sx={styles.thCell}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historico.map((row, idx) => (
                      <TableRow key={row.id || idx} sx={styles.tableRow}>
                        <TableCell sx={styles.tdCell}>{formatarData(row.data || row.createdAt)}</TableCell>
                        <TableCell sx={styles.tdCell}>{row.contrato || "—"}</TableCell>
                        <TableCell sx={styles.tdCell}>
                          <Chip
                            label={TIPO_LABELS[row.tipo] || row.tipo}
                            size="small"
                            sx={{
                              ...styles.tipoChip,
                              ...(TIPO_COLORS[row.tipo] || {}),
                            }}
                          />
                        </TableCell>
                        <TableCell sx={styles.tdCell}>{formatMoeda(row.valorOriginal)}</TableCell>
                        <TableCell sx={{ ...styles.tdCell, fontWeight: 600, color: "#182338" }}>
                          {formatMoeda(row.valorCalculado)}
                        </TableCell>
                        <TableCell sx={styles.tdCell}>
                          <Tooltip title="Ver detalhes">
                            <IconButton
                              size="small"
                              sx={styles.viewBtn}
                              onClick={() => showAlert("info", "Detalhes da simulação em breve.")}
                            >
                              <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Sub-componente: Linha de breakdown
// ─────────────────────────────────────────────────────────────────
function BreakdownRow({ icon, label, value, sub, color }) {
  return (
    <Box sx={bStyles.row}>
      <Box sx={{ ...bStyles.icon, color }}>
        {icon}
      </Box>
      <Box sx={bStyles.info}>
        <Typography sx={bStyles.label}>{label}</Typography>
        {sub && <Typography sx={bStyles.sub}>{sub}</Typography>}
      </Box>
      <Typography sx={{ ...bStyles.value, color }}>{value}</Typography>
    </Box>
  );
}

const bStyles = {
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 1.5,
    py: 1.2,
    borderBottom: "1px solid #f6f8fc",
  },
  icon: {
    mt: 0.2,
    "& svg": { fontSize: 18 },
  },
  info: { flex: 1 },
  label: { fontSize: "13px", color: "#182338", fontWeight: 500 },
  sub: { fontSize: "11px", color: "#9baaba", mt: 0.2 },
  value: { fontSize: "14px", fontWeight: 700, flexShrink: 0 },
};

// ─────────────────────────────────────────────────────────────────
//  Labels e cores dos tipos de cálculo
// ─────────────────────────────────────────────────────────────────
const TIPO_LABELS = {
  saldo_devedor:      "Saldo Devedor",
  parcelas_futuras:   "Parc. Futuras",
  correcao_monetaria: "Correção Mon.",
  refinanciamento:    "Refinanciamento",
};

const TIPO_COLORS = {
  saldo_devedor:      { backgroundColor: "#eff6ff", color: "#3f7ff2" },
  parcelas_futuras:   { backgroundColor: "#f0fdf4", color: "#22c55e" },
  correcao_monetaria: { backgroundColor: "#fef9c3", color: "#ca8a04" },
  refinanciamento:    { backgroundColor: "#faf5ff", color: "#8b5cf6" },
};

// ─────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f7f9fc",
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },

  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },

  body: {
    flex: 1,
    p: 3,
    overflowY: "auto",
  },

  // ── Cards ──
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    border: "1px solid #eaeff6",
    p: 3,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    mb: 1.5,
  },

  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: "10px",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  cardTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#182338",
  },

  cardSubtitle: {
    fontSize: "12px",
    color: "#9baaba",
    mt: 0.2,
  },

  // ── Formulário ──
  formGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  fieldGroup: {},

  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#27344b",
    mb: 0.7,
  },

  input: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#fff",
      borderRadius: "9px",
      height: "40px",

      "& fieldset": { borderColor: "#dce2eb" },
      "&:hover fieldset": { borderColor: "#aebbd0" },
      "&.Mui-focused fieldset": { borderColor: "#3f7ff2", borderWidth: "1.5px" },
    },

    "& input": { fontSize: "13px" },
  },

  select: {
    borderRadius: "9px",
    backgroundColor: "#fff",
    height: "40px",
    fontSize: "13px",

    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dce2eb" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#aebbd0" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3f7ff2", borderWidth: "1.5px" },
  },

  prefix: {
    fontSize: "13px",
    color: "#8b97aa",
    fontWeight: 600,
    mr: 0.5,
    lineHeight: 1,
  },

  suffix: {
    fontSize: "11px",
    color: "#8b97aa",
    fontWeight: 500,
    ml: 0.5,
    lineHeight: 1,
  },

  buttons: {
    display: "flex",
    gap: 1.5,
    mt: 0.5,
  },

  btnPrimary: {
    flex: 1,
    height: "42px",
    borderRadius: "10px",
    backgroundColor: "#3f7ff2",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    textTransform: "none",
    boxShadow: "0 4px 12px rgba(63,127,242,0.22)",

    "&:hover": {
      backgroundColor: "#316fe0",
      boxShadow: "0 6px 16px rgba(63,127,242,0.3)",
    },

    "&.Mui-disabled": {
      backgroundColor: "#9dbbf5",
      color: "#fff",
    },
  },

  btnOutlined: {
    flex: 1,
    height: "42px",
    borderRadius: "10px",
    borderColor: "#d0daea",
    color: "#4a5e78",
    fontSize: "13px",
    fontWeight: 600,
    textTransform: "none",

    "&:hover": {
      borderColor: "#3f7ff2",
      color: "#3f7ff2",
      backgroundColor: "#f0f6ff",
    },
  },

  // ── Resultado ──
  emptyResult: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    py: 6,
    px: 3,
    textAlign: "center",
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    backgroundColor: "#f5f8fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    mb: 2,
  },

  emptyTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#4a5e78",
    mb: 0.8,
  },

  emptyText: {
    fontSize: "13px",
    color: "#9baaba",
    maxWidth: "280px",
    lineHeight: 1.6,
  },

  highlightBox: {
    background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3f7ff2 100%)",
    borderRadius: "14px",
    p: 2.5,
    mb: 2.5,
    textAlign: "center",
    position: "relative",
    overflow: "hidden",

    "&::before": {
      content: '""',
      position: "absolute",
      width: "200px",
      height: "200px",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.05)",
      top: "-80px",
      right: "-60px",
    },
  },

  highlightLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "1.5px",
    mb: 0.5,
  },

  highlightValue: {
    color: "#fff",
    fontSize: "32px",
    fontWeight: 800,
    lineHeight: 1.1,
    mb: 1.5,
    letterSpacing: "-0.5px",
  },

  highlightChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.9)",
    fontSize: "11px",
    fontWeight: 600,
    border: "1px solid rgba(255,255,255,0.2)",

    "& .MuiChip-icon": { color: "rgba(255,255,255,0.8)" },
  },

  breakdown: {
    mb: 2,
  },

  totalRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    py: 1,
  },

  totalLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#9baaba",
    letterSpacing: "1px",
  },

  totalValue: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#182338",
  },

  resultActions: {
    display: "flex",
    gap: 1.5,
    mt: 2,
  },

  // ── Histórico ──
  countChip: {
    backgroundColor: "#f0f5ff",
    color: "#3f7ff2",
    fontSize: "11px",
    fontWeight: 600,
    height: "24px",
    ml: "auto",
  },

  loadingCenter: {
    display: "flex",
    justifyContent: "center",
    py: 4,
  },

  thCell: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#9baaba",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    backgroundColor: "#f8fafd",
    borderBottom: "1px solid #eaeff6",
    py: 1.5,
    px: 2,
  },

  tdCell: {
    fontSize: "13px",
    color: "#4a5e78",
    borderBottom: "1px solid #f5f8fd",
    py: 1.5,
    px: 2,
  },

  tableRow: {
    "&:hover": {
      backgroundColor: "#fafcff",
    },
    "&:last-child td": {
      borderBottom: "none",
    },
  },

  tipoChip: {
    fontSize: "11px",
    fontWeight: 600,
    height: "22px",
    borderRadius: "6px",
  },

  viewBtn: {
    width: 28,
    height: 28,
    borderRadius: "8px",
    backgroundColor: "#f0f5ff",
    color: "#3f7ff2",

    "&:hover": {
      backgroundColor: "#dbeafe",
    },
  },
};

export default Calculadora;
