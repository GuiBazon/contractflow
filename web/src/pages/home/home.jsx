import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import sheets from "../../axios/axios";
import { Box, Button, Typography, CircularProgress } from "@mui/material";

function Home() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  useEffect(() => {
    sheets
      .getContratos()
      .then((res) => setContratos(res.data?.data || []))
      .catch(() =>
        setErro("Não foi possível carregar os contratos da API.")
      )
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("auth");
    navigate("/");
  }

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5">
          Olá, {usuario.nome || "usuário"} ({usuario.perfil || "-"})
        </Typography>
        <Button variant="outlined" onClick={logout}>
          Sair
        </Button>
      </Box>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Meus contratos (dados reais da API)
      </Typography>

      {loading && <CircularProgress />}
      {erro && <Typography color="error">{erro}</Typography>}
      {!loading && !erro && contratos.length === 0 && (
        <Typography>Nenhum contrato encontrado.</Typography>
      )}
      {!loading &&
        !erro &&
        contratos.map((c) => (
          <Box
            key={c.id}
            sx={{ border: "1px solid #ddd", borderRadius: 2, p: 2, mb: 2 }}
          >
            <Typography variant="subtitle1">
              {c.numero} — {c.cliente_nome || `Cliente ${c.cliente_id}`}
            </Typography>
            <Typography variant="body2">
              Status: {c.status} | Total: R$ {c.valor_total} | Recebido: R${" "}
              {c.recebido ?? "-"} | Pendente: R$ {c.pendente ?? "-"}
            </Typography>
          </Box>
        ))}
    </Box>
  );
}

export default Home;
