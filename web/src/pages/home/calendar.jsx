import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIos from "@mui/icons-material/ArrowForwardIos";
import sheets from "../../axios/axios";
import {
  CATEGORIAS,
  CHAVE_EVENTOS,
  CORES_SITUACAO,
  DIAS_SEMANA,
  MESES,
  agruparPorData,
  combinarContratosComParcelas,
  corEvento,
  criarGradeMes,
  dataLocal,
  dataValida,
  extrairVencimentos,
  filtrarEventos,
  formatarMoeda,
  lerEventosPessoais,
  mesclarEventos,
  normalizarEventoPessoal,
  resumoVencimentos,
} from "../../utils/calendar";

const ROTULOS_SITUACAO = {
  PAGA: "Paga",
  PENDENTE: "Pendente",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

const formularioVazio = (data) => ({
  titulo: "", data, horario: "", descricao: "", categoria: "Outros",
});

function Calendar() {
  const navigate = useNavigate();
  const hoje = new Date();
  const hojeStr = dataLocal(hoje);

  const [mes, setMes] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [selecionada, setSelecionada] = useState(hojeStr);
  const [eventos, setEventos] = useState(() =>
    lerEventosPessoais(localStorage.getItem(CHAVE_EVENTOS))
  );
  const [form, setForm] = useState(formularioVazio(hojeStr));
  const [editando, setEditando] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("Todas");

  const [vencimentos, setVencimentos] = useState([]);
  const [carregandoVencimentos, setCarregandoVencimentos] = useState(true);
  const [erroVencimentos, setErroVencimentos] = useState("");
  const [mostrarVencimentos, setMostrarVencimentos] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_EVENTOS, JSON.stringify(eventos));
    } catch {
      console.error("Não foi possível salvar os eventos.");
    }
  }, [eventos]);

  // Vencimentos vêm das parcelas dos contratos do usuário (RF29/RN15).
  useEffect(() => {
    let ativo = true;

    async function carregarVencimentos() {
      setCarregandoVencimentos(true);
      setErroVencimentos("");

      try {
        const resposta = await sheets.getContratos({ limit: 100 });
        const contratos = Array.isArray(resposta.data?.data) ? resposta.data.data : [];

        const respostas = await Promise.allSettled(
          contratos.map((contrato) => sheets.getParcelas(contrato.id))
        );
        if (!ativo) return;

        const completos = combinarContratosComParcelas(contratos, respostas);
        const falhas = respostas.filter((resposta) => resposta.status === "rejected").length;

        setVencimentos(extrairVencimentos(completos));
        if (falhas > 0) {
          setErroVencimentos(
            `Não foi possível carregar as parcelas de ${falhas} contrato(s). Os demais vencimentos estão disponíveis.`
          );
        }
      } catch {
        if (!ativo) return;
        setErroVencimentos(
          "Não foi possível carregar os vencimentos da API. Seus compromissos locais continuam disponíveis."
        );
      } finally {
        if (ativo) setCarregandoVencimentos(false);
      }
    }

    carregarVencimentos();

    return () => {
      ativo = false;
    };
  }, []);

  const ano = mes.getFullYear();
  const numeroMes = mes.getMonth();

  const grade = useMemo(() => criarGradeMes(ano, numeroMes), [ano, numeroMes]);
  const todosEventos = useMemo(
    () => mesclarEventos(eventos, vencimentos, { mostrarVencimentos }),
    [eventos, vencimentos, mostrarVencimentos]
  );
  const eventosPorData = useMemo(() => agruparPorData(todosEventos), [todosEventos]);
  const listaDia = useMemo(
    () => filtrarEventos(eventosPorData.get(selecionada) || [], { pesquisa, filtro }),
    [eventosPorData, selecionada, pesquisa, filtro]
  );
  const resumo = useMemo(() => resumoVencimentos(vencimentos), [vencimentos]);

  const totalNoMes = useMemo(() => {
    const prefixo = `${ano}-${String(numeroMes + 1).padStart(2, "0")}`;
    return todosEventos.filter((evento) => evento.data.startsWith(prefixo)).length;
  }, [todosEventos, ano, numeroMes]);

  const filtrosAtivos = pesquisa.trim() !== "" || filtro !== "Todas";

  function selecionar(data) {
    const [novoAno, novoMes] = data.split("-").map(Number);

    if (novoAno !== ano || novoMes - 1 !== numeroMes) {
      setMes(new Date(novoAno, novoMes - 1, 1));
    }

    setSelecionada(data);
    if (!aberto) setForm(formularioVazio(data));
  }

  function irParaMes(deslocamento) {
    const novoMes = new Date(ano, numeroMes + deslocamento, 1);
    setMes(novoMes);
    setSelecionada(dataLocal(novoMes));
  }

  function irParaHoje() {
    const agora = new Date();
    setMes(new Date(agora.getFullYear(), agora.getMonth(), 1));
    setSelecionada(dataLocal(agora));
    if (!aberto) setForm(formularioVazio(dataLocal(agora)));
  }

  function fecharFormulario() {
    setAberto(false);
    setEditando(null);
    setForm(formularioVazio(selecionada));
  }

  function salvar(event) {
    event.preventDefault();

    const titulo = form.titulo.trim();
    if (!titulo || !dataValida(form.data)) return;

    const evento = normalizarEventoPessoal({
      ...form,
      titulo,
      descricao: form.descricao.trim(),
      id: editando || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });

    setEventos((anteriores) =>
      editando
        ? anteriores.map((item) => (item.id === editando ? evento : item))
        : [...anteriores, evento]
    );

    const [novoAno, novoMes] = form.data.split("-").map(Number);
    setMes(new Date(novoAno, novoMes - 1, 1));
    setSelecionada(form.data);
    setAberto(false);
    setEditando(null);
    setForm(formularioVazio(form.data));
  }

  function editar(evento) {
    if (evento.tipo !== "compromisso") return;

    setForm({
      titulo: evento.titulo,
      data: evento.data,
      horario: evento.horario || "",
      descricao: evento.descricao || "",
      categoria: evento.categoria || "Outros",
    });
    setEditando(evento.id);
    setAberto(true);
  }

  function excluir(id) {
    if (window.confirm("Deseja excluir este compromisso?")) {
      setEventos((anteriores) => anteriores.filter((evento) => evento.id !== id));
    }
  }

  const resumos = [
    { rotulo: "A vencer", valor: resumo.pendente, cor: CORES_SITUACAO.PENDENTE },
    { rotulo: "Vencido", valor: resumo.vencido, cor: CORES_SITUACAO.VENCIDA },
    { rotulo: "Pago", valor: resumo.pago, cor: CORES_SITUACAO.PAGA },
  ];

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 4 }, color: "#172033" }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate("/home")}>
        Voltar para início
      </Button>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", my: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Calendário</Typography>
          <Typography color="text.secondary">
            Acompanhe seus compromissos e os vencimentos dos contratos.
          </Typography>
        </Box>
        <Button onClick={irParaHoje}>Hoje</Button>
      </Box>

      {!carregandoVencimentos && vencimentos.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          {resumos.map((item) => (
            <Box
              key={item.rotulo}
              sx={{ p: 2, borderRadius: 2, border: "1px solid #e0e5ee", borderLeft: `4px solid ${item.cor}` }}
            >
              <Typography variant="body2" color="text.secondary">{item.rotulo}</Typography>
              <Typography variant="h6" fontWeight={700}>{formatarMoeda(item.valor)}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {erroVencimentos && (
        <Alert severity="warning" sx={{ mb: 3 }}>{erroVencimentos}</Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
        <Box sx={{ p: 2, border: "1px solid #e0e5ee", borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {MESES[numeroMes]} de {ano}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalNoMes} {totalNoMes === 1 ? "item no mês" : "itens no mês"}
              </Typography>
            </Box>
            <Box>
              <IconButton aria-label="Mês anterior" onClick={() => irParaMes(-1)}>
                <ArrowBackIosNew fontSize="small" />
              </IconButton>
              <IconButton aria-label="Próximo mês" onClick={() => irParaMes(1)}>
                <ArrowForwardIos fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.5 }}>
            {DIAS_SEMANA.map((dia) => (
              <Typography key={dia} textAlign="center" fontWeight={700} color="text.secondary">
                {dia}
              </Typography>
            ))}

            {grade.map((celula) => {
              const marcadores = eventosPorData.get(celula.data) || [];
              const ehSelecionado = selecionada === celula.data;
              const ehHoje = celula.data === hojeStr;
              const rotulo = new Date(`${celula.data}T12:00:00`).toLocaleDateString("pt-BR");

              return (
                <ButtonBase
                  key={celula.data}
                  onClick={() => selecionar(celula.data)}
                  aria-label={`${rotulo}, ${marcadores.length} ${marcadores.length === 1 ? "item" : "itens"}`}
                  aria-pressed={ehSelecionado}
                  sx={{
                    minWidth: 0,
                    minHeight: 52,
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                    opacity: celula.noMes ? 1 : 0.45,
                    backgroundColor: ehSelecionado ? "#24458f" : "transparent",
                    color: ehSelecionado ? "#fff" : "#172033",
                    border: ehHoje ? "1px solid #24458f" : "1px solid transparent",
                  }}
                >
                  {celula.dia}
                  <Box sx={{ display: "flex", gap: 0.3 }}>
                    {marcadores.slice(0, 3).map((evento) => (
                      <Box
                        key={evento.id}
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          bgcolor: ehSelecionado ? "#fff" : corEvento(evento),
                        }}
                      />
                    ))}
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={mostrarVencimentos}
                  onChange={(event) => setMostrarVencimentos(event.target.checked)}
                  size="small"
                />
              }
              label="Mostrar vencimentos"
            />
            {carregandoVencimentos && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Carregando vencimentos...
                </Typography>
              </Box>
            )}
          </Box>

          {mostrarVencimentos && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1 }}>
              {Object.entries(ROTULOS_SITUACAO).map(([situacao, rotulo]) => (
                <Box key={situacao} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: CORES_SITUACAO[situacao] }} />
                  <Typography variant="caption" color="text.secondary">{rotulo}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ p: 2, border: "1px solid #e0e5ee", borderRadius: 3, alignSelf: "start" }}>
          <Typography variant="h6" fontWeight={700}>Agenda do dia</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {new Date(`${selecionada}T12:00:00`).toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </Typography>

          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              setForm(formularioVazio(selecionada));
              setEditando(null);
              setAberto(true);
            }}
          >
            Novo compromisso
          </Button>

          {aberto && (
            <Box component="form" onSubmit={salvar} sx={{ display: "grid", gap: 1.5, my: 2 }}>
              <TextField
                label="Título"
                required
                value={form.titulo}
                slotProps={{ htmlInput: { maxLength: 100 } }}
                onChange={(event) => setForm({ ...form, titulo: event.target.value })}
              />
              <TextField
                label="Data"
                type="date"
                required
                value={form.data}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(event) => setForm({ ...form, data: event.target.value })}
              />
              <TextField
                label="Horário"
                type="time"
                value={form.horario}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(event) => setForm({ ...form, horario: event.target.value })}
              />
              <TextField
                select
                label="Categoria"
                value={form.categoria}
                onChange={(event) => setForm({ ...form, categoria: event.target.value })}
              >
                {Object.keys(CATEGORIAS).map((categoria) => (
                  <MenuItem key={categoria} value={categoria}>{categoria}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Descrição"
                multiline
                minRows={2}
                value={form.descricao}
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
              />
              <Button type="submit" variant="contained">Salvar</Button>
              {/* type="button" evita que o cancelamento envie o formulário e salve o evento */}
              <Button type="button" onClick={fecharFormulario}>Cancelar</Button>
            </Box>
          )}

          <TextField
            fullWidth
            size="small"
            label="Pesquisar"
            placeholder="Título, cliente ou contrato"
            value={pesquisa}
            onChange={(event) => setPesquisa(event.target.value)}
            sx={{ my: 2 }}
          />

          <TextField
            select
            fullWidth
            size="small"
            label="Filtro"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            sx={{ mb: 2 }}
          >
            {["Todas", "Compromissos", "Vencimentos", ...Object.keys(CATEGORIAS)].map((opcao) => (
              <MenuItem key={opcao} value={opcao}>{opcao}</MenuItem>
            ))}
          </TextField>

          {listaDia.length === 0 ? (
            <Typography color="text.secondary">
              {filtrosAtivos
                ? "Nenhum item corresponde aos filtros."
                : "Nenhum compromisso ou vencimento para este dia."}
            </Typography>
          ) : listaDia.map((evento) => (
            <Box
              key={evento.id}
              sx={{
                p: 1.5,
                my: 1,
                border: "1px solid #e0e5ee",
                borderLeft: `4px solid ${corEvento(evento)}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Typography fontWeight={700}>{evento.titulo}</Typography>
                {evento.tipo === "vencimento" && (
                  <Chip
                    size="small"
                    label={ROTULOS_SITUACAO[evento.situacao] || evento.situacao}
                    sx={{ bgcolor: corEvento(evento), color: "#fff", flexShrink: 0 }}
                  />
                )}
              </Box>
              <Typography variant="body2">
                {evento.tipo === "vencimento"
                  ? "Vencimento"
                  : evento.horario || "Sem horário"} · {evento.categoria}
              </Typography>
              {evento.descricao && (
                <Typography variant="body2" sx={{ mt: 1 }}>{evento.descricao}</Typography>
              )}
              {evento.tipo === "compromisso" && (
                <Box sx={{ mt: 0.5 }}>
                  <Button size="small" onClick={() => editar(evento)}>Editar</Button>
                  <Button size="small" color="error" onClick={() => excluir(evento.id)}>Excluir</Button>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default Calendar;
