import { useState } from "react";
import api from "../../axios/axios";
import { useNavigate } from "react-router-dom";

import SnackBar from "../../components/snack_bar/snack_bar";

import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Visibility from "@mui/icons-material/Visibility";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";

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

function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState({
    email: localStorage.getItem("rememberedEmail") || "",
    senha: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    Boolean(localStorage.getItem("rememberedEmail"))
  );

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

    if (!usuario.email || !usuario.senha) {
      showAlert(
        "warning",
        "Preencha seu e-mail e sua senha."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.postLogin({
        email: usuario.email.trim().toLowerCase(),
        senha: usuario.senha,
      });

      const {
        token,
        usuario: {
          id,
          nome,
          email,
          perfil,
        },
      } = response.data;

      // Token JWT
      localStorage.setItem("token", token);

      // Dados do usuário autenticado
      localStorage.setItem(
        "usuario",
        JSON.stringify({
          id,
          nome,
          email,
          perfil,
        })
      );

      // Estado da autenticação
      localStorage.setItem("auth", "true");

      // Lembrar somente o e-mail
      if (rememberMe) {
        localStorage.setItem(
          "rememberedEmail",
          usuario.email.trim().toLowerCase()
        );
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      showAlert(
        "success",
        "Login realizado com sucesso!"
      );

      setTimeout(() => {
        navigate("/home");
      }, 800);
    } catch (error) {
      console.error("Erro no login:", error);

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

        <Box sx={styles.formWrapper}>

          {/* Logo */}
          <Box sx={styles.brand}>
            <Box sx={styles.brandIcon}>
              <DescriptionOutlined />
            </Box>

            <Box>
              <Typography sx={styles.brandName}>
                ContractFlow
              </Typography>

              <Typography sx={styles.brandSubtitle}>
                Organização, automação e controle.
              </Typography>
            </Box>
          </Box>

          {/* Título */}
          <Box sx={styles.heading}>
            <Typography sx={styles.title}>
              Bem-vindo de volta
            </Typography>

            <Typography sx={styles.description}>
              Acesse sua conta para continuar
              gerenciando seus contratos.
            </Typography>
          </Box>

          {/* Formulário */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={styles.form}
          >

            {/* E-mail */}
            <Box>
              <Typography sx={styles.label}>
                E-mail profissional
              </Typography>

              <TextField
                fullWidth
                type="email"
                name="email"
                placeholder="seuemail@empresa.com"
                value={usuario.email}
                onChange={onChange}
                autoComplete="email"
                disabled={loading}
                sx={styles.input}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={styles.inputIcon}>
                        @
                      </Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Senha */}
            <Box>
              <Typography sx={styles.label}>
                Senha
              </Typography>

              <TextField
                fullWidth
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="senha"
                placeholder="Digite sua senha"
                value={usuario.senha}
                onChange={onChange}
                autoComplete="current-password"
                disabled={loading}
                sx={styles.input}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (prev) => !prev
                          )
                        }
                        edge="end"
                        aria-label={
                          showPassword
                            ? "Ocultar senha"
                            : "Mostrar senha"
                        }
                      >
                        {showPassword ? (
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

            {/* Opções */}
            <Box sx={styles.options}>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    disabled={loading}
                    size="small"
                    sx={styles.checkbox}
                  />
                }
                label="Lembrar meu acesso"
                sx={styles.remember}
              />

              <Typography
                component="button"
                type="button"
                sx={styles.forgot}
                onClick={() =>
                  showAlert(
                    "info",
                    "A recuperação de senha estará disponível em breve."
                  )
                }
              >
                Esqueci minha senha
              </Typography>

            </Box>

            {/* Botão */}
            <Button
              type="submit"
              fullWidth
              disabled={loading}
              endIcon={
                !loading && (
                  <ArrowForwardRounded />
                )
              }
              sx={styles.button}
            >
              {loading ? (
                <CircularProgress
                  size={22}
                  sx={{ color: "#fff" }}
                />
              ) : (
                "Entrar"
              )}
            </Button>

          </Box>

          {/* Criar conta */}
          <Typography sx={styles.registerText}>
            Ainda não possui uma conta?{" "}
            <Box
              component="span"
              onClick={() =>
                navigate("/register")
              }
              sx={styles.registerLink}
            >
              Criar conta
            </Box>
          </Typography>

        </Box>

      </Box>

      {/* =========================
          LADO DIREITO
      ========================== */}
      <Box sx={styles.rightSide}>

        <Box sx={styles.rightContent}>

          <Box sx={styles.rightIcon}>
            <AutoAwesomeOutlined />
          </Box>

          <Typography sx={styles.rightTitle}>
            Contratos que viram
            <br />
            decisões.
          </Typography>

          <Typography sx={styles.rightDescription}>
            Centralize documentos, clientes,
            parcelas e pagamentos em um
            único lugar.
          </Typography>

          {/* Card */}
          <Box sx={styles.featureCard}>

            <Typography sx={styles.featureLabel}>
              GESTÃO INTELIGENTE
            </Typography>

            <Typography sx={styles.featureTitle}>
              Tudo sob controle.
            </Typography>

            <Box sx={styles.flow}>

              <Box sx={styles.flowItem}>
                <DescriptionOutlined />
                <Typography>
                  Contratos
                </Typography>
              </Box>

              <Typography sx={styles.arrow}>
                →
              </Typography>

              <Box sx={styles.flowItem}>
                <Typography sx={styles.flowSymbol}>
                  $
                </Typography>

                <Typography>
                  Parcelas
                </Typography>
              </Box>

              <Typography sx={styles.arrow}>
                →
              </Typography>

              <Box sx={styles.flowItem}>
                <Typography sx={styles.check}>
                  ✓
                </Typography>

                <Typography>
                  Pagamentos
                </Typography>
              </Box>

            </Box>

          </Box>

          <Typography sx={styles.securityText}>
            🔒 Seus dados são protegidos e
            acessados somente por você.
          </Typography>

        </Box>

      </Box>

    </Box>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    backgroundColor: "#f7f9fc",
    fontFamily: "Roboto, sans-serif",
  },

  /* =========================
     ESQUERDO
  ========================== */

  leftSide: {
    width: "55%",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f9fc",
    px: {
      xs: 3,
      sm: 6,
      md: 10,
    },
    py: 5,
  },

  formWrapper: {
    width: "100%",
    maxWidth: "480px",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    mb: 7,
  },

  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#24458f",
    color: "#fff",

    "& svg": {
      fontSize: 23,
    },
  },

  brandName: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#203f82",
    lineHeight: 1.1,
  },

  brandSubtitle: {
    fontSize: "12px",
    color: "#7b879d",
    mt: 0.4,
  },

  heading: {
    mb: 4,
  },

  title: {
    fontSize: {
      xs: "28px",
      md: "32px",
    },
    fontWeight: 700,
    color: "#182338",
    mb: 1,
  },

  description: {
    fontSize: "14px",
    color: "#758198",
    lineHeight: 1.6,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 2.2,
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

  options: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mt: -0.5,
  },

  remember: {
    "& .MuiFormControlLabel-label": {
      fontSize: "12px",
      color: "#68758a",
    },
  },

  checkbox: {
    color: "#c3cad6",

    "&.Mui-checked": {
      color: "#3f7ff2",
    },
  },

  forgot: {
    border: 0,
    background: "none",
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "12px",
    color: "#3978e8",

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

  registerText: {
    textAlign: "center",
    fontSize: "12px",
    color: "#7b8799",
    mt: 3,
  },

  registerLink: {
    color: "#3478ed",
    fontWeight: 600,
    cursor: "pointer",

    "&:hover": {
      textDecoration: "underline",
    },
  },

  /* =========================
     DIREITO
  ========================== */

  rightSide: {
    width: "45%",
    minHeight: "100vh",
    background:
      "linear-gradient(145deg, #203f82 0%, #294e9d 100%)",
    display: {
      xs: "none",
      md: "flex",
    },
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",

    "&::before": {
      content: '""',
      position: "absolute",
      width: "400px",
      height: "400px",
      borderRadius: "50%",
      background:
        "rgba(255,255,255,0.035)",
      top: "-160px",
      right: "-120px",
    },

    "&::after": {
      content: '""',
      position: "absolute",
      width: "300px",
      height: "300px",
      borderRadius: "50%",
      background:
        "rgba(255,255,255,0.025)",
      bottom: "-130px",
      left: "-100px",
    },
  },

  rightContent: {
    width: "78%",
    maxWidth: "500px",
    position: "relative",
    zIndex: 1,
  },

  rightIcon: {
    width: 48,
    height: 48,
    borderRadius: "12px",
    backgroundColor:
      "rgba(255,255,255,0.1)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    mb: 3,

    "& svg": {
      fontSize: 24,
    },
  },

  rightTitle: {
    color: "#fff",
    fontSize: {
      md: "34px",
      lg: "40px",
    },
    fontWeight: 700,
    lineHeight: 1.15,
    mb: 2,
  },

  rightDescription: {
    color: "rgba(255,255,255,0.72)",
    fontSize: "14px",
    lineHeight: 1.7,
    maxWidth: "400px",
    mb: 5,
  },

  featureCard: {
    backgroundColor:
      "rgba(255,255,255,0.09)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: 3,
    backdropFilter: "blur(10px)",
  },

  featureLabel: {
    color: "#9fbaf4",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "1px",
    mb: 1,
  },

  featureTitle: {
    color: "#fff",
    fontSize: "22px",
    fontWeight: 600,
    mb: 3,
  },

  flow: {
    display: "flex",
    alignItems: "center",
    gap: {
      md: 1,
      lg: 1.5,
    },
  },

  flowItem: {
    display: "flex",
    alignItems: "center",
    gap: 0.8,
    color: "#fff",
    fontSize: "12px",

    "& svg": {
      fontSize: 18,
      color: "#b8cdf9",
    },
  },

  flowSymbol: {
    width: 18,
    height: 18,
    borderRadius: "5px",
    backgroundColor:
      "rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#b8cdf9",
    fontWeight: 700,
  },

  arrow: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "20px",
  },

  check: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    backgroundColor: "#5d91f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
  },

  securityText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "11px",
    mt: 4,
  },
};

export default Login;