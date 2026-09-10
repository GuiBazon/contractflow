import { useState } from "react";
import api from "../../axios/axios";
import { useNavigate } from "react-router-dom";

import SnackBar from "../../components/snack_bar/snack_bar";

import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Visibility from "@mui/icons-material/Visibility";
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";

import {
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";

const STEPS = [
  {
    numero: "1",
    titulo: "Crie sua conta em 1 minuto",
    descricao: "Sem cartão de crédito necessário.",
  },
  {
    numero: "2",
    titulo: "Importe seus contratos",
    descricao: "Faça upload e nós estruturamos as cobranças.",
  },
  {
    numero: "3",
    titulo: "Automatize seus recebíveis",
    descricao: "Acompanhe tudo em tempo real através do dashboard.",
  },
];

function Register() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState({
    nomeCompleto: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    nomeEmpresa: "",
    cnpj: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);

  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState({
    open: false,
    severity: "",
    message: "",
  });

  const showAlert = (severity, message) => {
    setAlert({
      open: true,
      severity,
      message,
    });
  };

  const handleCloseAlert = () => {
    setAlert((prev) => ({
      ...prev,
      open: false,
    }));
  };

  function onChange(event) {
    const { name, value } = event.target;

    setUsuario((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !usuario.nomeCompleto ||
      !usuario.email ||
      !usuario.senha ||
      !usuario.confirmarSenha ||
      !usuario.nomeEmpresa
    ) {
      showAlert("warning", "Preencha todos os campos obrigatórios.");
      return;
    }

    if (usuario.senha !== usuario.confirmarSenha) {
      showAlert("warning", "As senhas informadas não coincidem.");
      return;
    }

    if (!aceiteTermos) {
      showAlert(
        "warning",
        "Você precisa aceitar os Termos de Uso e a Política de Privacidade."
      );
      return;
    }

    setLoading(true);

    try {
      await api.postRegister({
        nome: usuario.nomeCompleto.trim(),
        email: usuario.email.trim().toLowerCase(),
        senha: usuario.senha,
        nomeEmpresa: usuario.nomeEmpresa.trim(),
        cnpj: usuario.cnpj.trim() || null,
      });

      showAlert("success", "Conta criada com sucesso!");

      setTimeout(() => {
        navigate("/");
      }, 800);
    } catch (error) {
      console.error("Erro no cadastro:", error);

      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Não foi possível conectar ao servidor.";

      showAlert("error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={styles.page}>
      <SnackBar
        open={alert.open}
        severity={alert.severity}
        message={alert.message}
        handleClose={handleCloseAlert}
      />

      {/* =========================
          LADO ESQUERDO
      ========================== */}
      <Box sx={styles.leftSide}>
        <Box sx={styles.leftContent}>
          {/* Logo */}
          <Box sx={styles.brand}>
            <Box sx={styles.brandIcon}>
              <AttachFileRounded />
            </Box>

            <Typography sx={styles.brandName}>ContractFlow</Typography>
          </Box>

          {/* Título */}
          <Typography sx={styles.leftTitle}>
            Pronto para impulsionar sua gestão contratual?
          </Typography>

          {/* Steps */}
          <Box sx={styles.steps}>
            {STEPS.map((step) => (
              <Box key={step.numero} sx={styles.stepItem}>
                <Box sx={styles.stepNumber}>{step.numero}</Box>

                <Box>
                  <Typography sx={styles.stepTitle}>{step.titulo}</Typography>
                  <Typography sx={styles.stepDescription}>
                    {step.descricao}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Rodapé */}
          <Typography sx={styles.support}>
            Precisa de ajuda? Fale com o suporte: contato@contractflow.com.br
          </Typography>
        </Box>
      </Box>

      {/* =========================
          LADO DIREITO
      ========================== */}
      <Box sx={styles.rightSide}>
        <Box sx={styles.card}>
          {/* Título */}
          <Box sx={styles.heading}>
            <Typography sx={styles.title}>Começar teste gratuito</Typography>
            <Typography sx={styles.description}>
              Experimente sem compromisso por 14 dias.
            </Typography>
          </Box>

          {/* Formulário */}
          <Box component="form" onSubmit={handleSubmit} sx={styles.form}>
            {/* Nome completo */}
            <Box>
              <Typography sx={styles.label}>Nome completo</Typography>

              <TextField
                fullWidth
                type="text"
                name="nomeCompleto"
                placeholder="Digite seu nome completo"
                value={usuario.nomeCompleto}
                onChange={onChange}
                autoComplete="name"
                disabled={loading}
                sx={styles.input}
              />
            </Box>

            {/* E-mail */}
            <Box>
              <Typography sx={styles.label}>E-mail corporativo</Typography>

              <TextField
                fullWidth
                type="email"
                name="email"
                placeholder="seuemail@suaempresa.com.br"
                value={usuario.email}
                onChange={onChange}
                autoComplete="email"
                disabled={loading}
                sx={styles.input}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={styles.inputIcon}>@</Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Senha / Confirmar senha */}
            <Box sx={styles.row}>
              <Box sx={styles.rowItem}>
                <Typography sx={styles.label}>Senha</Typography>

                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  name="senha"
                  placeholder="Crie uma senha"
                  value={usuario.senha}
                  onChange={onChange}
                  autoComplete="new-password"
                  disabled={loading}
                  sx={styles.input}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          onClick={() =>
                            setShowPassword((prev) => !prev)
                          }
                          edge="end"
                          aria-label={
                            showPassword ? "Ocultar senha" : "Mostrar senha"
                          }
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={styles.rowItem}>
                <Typography sx={styles.label}>Confirmar senha</Typography>

                <TextField
                  fullWidth
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmarSenha"
                  placeholder="Repita a senha"
                  value={usuario.confirmarSenha}
                  onChange={onChange}
                  autoComplete="new-password"
                  disabled={loading}
                  sx={styles.input}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          edge="end"
                          aria-label={
                            showConfirmPassword
                              ? "Ocultar senha"
                              : "Mostrar senha"
                          }
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>

            {/* Nome da empresa / CNPJ */}
            <Box sx={styles.row}>
              <Box sx={styles.rowItem}>
                <Typography sx={styles.label}>Nome da empresa</Typography>

                <TextField
                  fullWidth
                  type="text"
                  name="nomeEmpresa"
                  placeholder="Nome da sua empresa"
                  value={usuario.nomeEmpresa}
                  onChange={onChange}
                  autoComplete="organization"
                  disabled={loading}
                  sx={styles.input}
                />
              </Box>

              <Box sx={styles.rowItem}>
                <Typography sx={styles.label}>CNPJ (Opcional)</Typography>

                <TextField
                  fullWidth
                  type="text"
                  name="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={usuario.cnpj}
                  onChange={onChange}
                  disabled={loading}
                  sx={styles.input}
                />
              </Box>
            </Box>

            {/* Termos */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={aceiteTermos}
                  onChange={(event) =>
                    setAceiteTermos(event.target.checked)
                  }
                  disabled={loading}
                  size="small"
                  sx={styles.checkbox}
                />
              }
              label={
                <Typography sx={styles.termsLabel}>
                  Eu aceito os{" "}
                  <Box component="span" sx={styles.termsLink}>
                    Termos de Uso
                  </Box>{" "}
                  e a{" "}
                  <Box component="span" sx={styles.termsLink}>
                    Política de Privacidade
                  </Box>
                </Typography>
              }
              sx={styles.termsRow}
            />

            {/* Botão */}
            <Button
              type="submit"
              fullWidth
              disabled={loading}
              sx={styles.button}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "#fff" }} />
              ) : (
                "Criar minha conta gratuita"
              )}
            </Button>
          </Box>

          {/* Já possui conta */}
          <Typography sx={styles.loginText}>
            Já possui uma conta?{" "}
            <Box component="span" onClick={() => navigate("/")} sx={styles.loginLink}>
              Fazer login
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

const styles = {
  page: {
    height: "100dvh",
    display: "flex",
    backgroundColor: "#f7f9fc",
    fontFamily: "Roboto, sans-serif",
  },

  /* =========================
     ESQUERDO (marca / branding)
  ========================== */

  leftSide: {
    width: "45%",
    height: "100%",
    background: "linear-gradient(145deg, #203f82 0%, #294e9d 100%)",
    display: {
      xs: "none",
      md: "flex",
    },
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    px: {
      md: 6,
      lg: 8,
    },
    py: 5,

    "&::before": {
      content: '""',
      position: "absolute",
      width: "400px",
      height: "400px",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.035)",
      top: "-160px",
      right: "-120px",
    },

    "&::after": {
      content: '""',
      position: "absolute",
      width: "300px",
      height: "300px",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.025)",
      bottom: "-130px",
      left: "-100px",
    },
  },

  leftContent: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    justifyContent: "space-between",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
  },

  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#fff",

    "& svg": {
      fontSize: 22,
    },
  },

  brandName: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#fff",
  },

  leftTitle: {
    color: "#fff",
    fontSize: {
      md: "30px",
      lg: "34px",
    },
    fontWeight: 700,
    lineHeight: 1.25,
    maxWidth: "440px",
    mt: 8,
  },

  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    mt: 5,
  },

  stepItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 2,
  },

  stepNumber: {
    width: 26,
    height: 26,
    minWidth: 26,
    borderRadius: "50%",
    backgroundColor: "#5d91f5",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    mt: 0.2,
  },

  stepTitle: {
    color: "#fff",
    fontSize: "15px",
    fontWeight: 600,
    mb: 0.3,
  },

  stepDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  support: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "11px",
  },

  /* =========================
     DIREITO (formulário)
  ========================== */

  rightSide: {
    width: {
      xs: "100%",
      md: "55%",
    },
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflowY: "auto",
    backgroundColor: "#f7f9fc",
    px: {
      xs: 3,
      sm: 6,
    },
    py: 5,
  },

  card: {
    width: "100%",
    maxWidth: "460px",
    my: "auto",
    backgroundColor: "#fff",
    borderRadius: "16px",
    boxShadow: "0 10px 40px rgba(24, 35, 56, 0.08)",
    px: {
      xs: 3,
      sm: 5,
    },
    py: 5,
  },

  heading: {
    mb: 3.5,
  },

  title: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#182338",
    mb: 0.8,
  },

  description: {
    fontSize: "14px",
    color: "#758198",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 2.2,
  },

  row: {
    display: "flex",
    flexDirection: {
      xs: "column",
      sm: "row",
    },
    gap: 2,

    "& > *": {
      flex: 1,
    },
  },

  rowItem: {
    width: "100%",
  },

  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#27344b",
    mb: 0.8,
  },

  input: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#fff",
      borderRadius: "8px",
      height: "48px",

      "& fieldset": {
        borderColor: "#dce2eb",
      },

      "&:hover fieldset": {
        borderColor: "#aebbd0",
      },

      "&.Mui-focused fieldset": {
        borderColor: "#3f7ff2",
        borderWidth: "1.5px",
      },
    },

    "& input": {
      fontSize: "14px",
    },
  },

  inputIcon: {
    color: "#8b97aa",
    fontSize: "17px",
    fontWeight: 500,
  },

  termsRow: {
    mt: -0.5,
    alignItems: "flex-start",

    "& .MuiCheckbox-root": {
      pt: 0,
    },
  },

  checkbox: {
    color: "#c3cad6",

    "&.Mui-checked": {
      color: "#3f7ff2",
    },
  },

  termsLabel: {
    fontSize: "12px",
    color: "#68758a",
    lineHeight: 1.5,
  },

  termsLink: {
    display: "inline",
    color: "#3478ed",
    fontWeight: 600,
    cursor: "pointer",

    "&:hover": {
      textDecoration: "underline",
    },
  },

  button: {
    height: "48px",
    borderRadius: "8px",
    backgroundColor: "#3f7ff2",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    textTransform: "none",
    boxShadow: "0 4px 12px rgba(63, 127, 242, 0.18)",

    "&:hover": {
      backgroundColor: "#316fe0",
      boxShadow: "0 5px 15px rgba(63, 127, 242, 0.25)",
    },

    "&.Mui-disabled": {
      backgroundColor: "#9dbbf5",
      color: "#fff",
    },
  },

  loginText: {
    textAlign: "center",
    fontSize: "12px",
    color: "#7b8799",
    mt: 3,
  },

  loginLink: {
    color: "#3478ed",
    fontWeight: 600,
    cursor: "pointer",

    "&:hover": {
      textDecoration: "underline",
    },
  },
};

export default Register;
