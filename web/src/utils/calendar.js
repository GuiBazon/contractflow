// Regras de data, eventos e vencimentos usadas pelo calendário.
// Mantidas fora do componente para poderem ser testadas sem DOM.

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const CATEGORIAS = {
  Estudos: "#3568c0",
  Trabalho: "#168568",
  Saúde: "#d45b63",
  Pessoal: "#8b5cc7",
  Outros: "#858b98",
};

// Cores por situação da parcela (mesma regra do backend: CANCELADA > PAGA >
// VENCIDA > PENDENTE).
export const CORES_SITUACAO = {
  PAGA: "#168568",
  PENDENTE: "#3568c0",
  VENCIDA: "#d45b63",
  CANCELADA: "#858b98",
};

export const CHAVE_EVENTOS = "calendar_eventos";

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor) {
  return formatadorMoeda.format(Number(valor) || 0);
}

// Formata uma Date no padrão aceito pelos inputs type="date" sem sofrer
// deslocamento de fuso (toISOString usa UTC).
export function dataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Valida formato e existência real da data (rejeita 2026-02-31, 2026-13-01...).
export function dataValida(valor) {
  if (typeof valor !== "string" || !FORMATO_DATA.test(valor)) return false;

  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);

  return (
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia
  );
}

// Aceita datas ISO completas vindas da API ("2026-10-05T00:00:00.000Z")
// e devolve somente a parte YYYY-MM-DD, ou null quando inválida.
export function normalizarData(valor) {
  if (typeof valor !== "string") return null;

  const data = valor.slice(0, 10);
  return dataValida(data) ? data : null;
}

// Grade do mês começando no domingo e terminando no sábado, incluindo os dias
// dos meses vizinhos necessários para completar as semanas.
export function criarGradeMes(ano, mes) {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const totalCelulas = Math.ceil((primeiroDiaSemana + totalDias) / 7) * 7;
  const celulas = [];

  for (let indice = 0; indice < totalCelulas; indice += 1) {
    const data = new Date(ano, mes, indice - primeiroDiaSemana + 1);

    celulas.push({
      data: dataLocal(data),
      dia: data.getDate(),
      noMes: data.getMonth() === mes,
    });
  }

  return celulas;
}

export function eventoPessoalValido(evento) {
  return Boolean(
    evento &&
      typeof evento.id === "string" &&
      typeof evento.titulo === "string" &&
      evento.titulo.trim() &&
      dataValida(evento.data)
  );
}

export function normalizarEventoPessoal(evento) {
  return {
    id: evento.id,
    tipo: "compromisso",
    titulo: evento.titulo.trim(),
    data: evento.data,
    horario: typeof evento.horario === "string" ? evento.horario : "",
    descricao: typeof evento.descricao === "string" ? evento.descricao : "",
    categoria: CATEGORIAS[evento.categoria] ? evento.categoria : "Outros",
  };
}

// Lê o JSON salvo no localStorage e descarta registros corrompidos/inválidos.
export function lerEventosPessoais(json) {
  try {
    const dados = JSON.parse(json || "[]");

    if (!Array.isArray(dados)) return [];

    return dados.filter(eventoPessoalValido).map(normalizarEventoPessoal);
  } catch {
    return [];
  }
}

export function ordenarEventos(eventos) {
  return [...eventos].sort((a, b) => {
    const porHorario = (a.horario || "").localeCompare(b.horario || "");
    if (porHorario !== 0) return porHorario;

    return (a.titulo || "").localeCompare(b.titulo || "", "pt-BR");
  });
}

export function filtrarEventos(eventos, { pesquisa = "", filtro = "Todas" } = {}) {
  const termo = pesquisa.trim().toLowerCase();

  const filtrados = eventos.filter((evento) => {
    if (filtro === "Vencimentos" && evento.tipo !== "vencimento") return false;
    if (filtro === "Compromissos" && evento.tipo !== "compromisso") return false;

    const filtroPorCategoria =
      !["Todas", "Vencimentos", "Compromissos"].includes(filtro);
    if (filtroPorCategoria && evento.categoria !== filtro) return false;

    if (!termo) return true;

    return [evento.titulo, evento.descricao, evento.cliente, evento.contrato]
      .some((valor) => String(valor || "").toLowerCase().includes(termo));
  });

  return ordenarEventos(filtrados);
}

export function agruparPorData(eventos) {
  const mapa = new Map();

  eventos.forEach((evento) => {
    const lista = mapa.get(evento.data) || [];
    lista.push(evento);
    mapa.set(evento.data, lista);
  });

  return mapa;
}

export function corEvento(evento) {
  if (evento.tipo === "vencimento") {
    return CORES_SITUACAO[evento.situacao] || CORES_SITUACAO.PENDENTE;
  }

  return CATEGORIAS[evento.categoria] || CATEGORIAS.Outros;
}

// Combina a lista de contratos com o resultado de Promise.allSettled das
// parcelas de cada contrato. Contratos cujas parcelas falharam ficam sem
// vencimentos em vez de derrubar a tela inteira.
export function combinarContratosComParcelas(contratos = [], respostas = []) {
  return contratos.map((contrato, indice) => {
    const resposta = respostas[indice];
    const parcelas =
      resposta?.status === "fulfilled" && Array.isArray(resposta.value?.data?.data)
        ? resposta.value.data.data
        : [];

    return { ...contrato, parcelas };
  });
}

// Transforma parcelas de contratos em eventos do calendário (RF29/RN15:
// os vencimentos alimentam o calendário).
export function extrairVencimentos(contratos = []) {
  const eventos = [];

  contratos.forEach((contrato) => {
    const parcelas = Array.isArray(contrato?.parcelas) ? contrato.parcelas : [];

    parcelas.forEach((parcela) => {
      const data = normalizarData(parcela?.data_vencimento);
      if (!data) return;

      const situacao = String(parcela.situacao || parcela.status || "PENDENTE").toUpperCase();
      const valor = Number(parcela.valor) || 0;
      const numeroContrato = contrato.numero || `Contrato ${contrato.id}`;
      const cliente = contrato.cliente_nome || "Cliente não informado";

      eventos.push({
        id: `vencimento-${contrato.id}-${parcela.id}`,
        tipo: "vencimento",
        titulo: `Parcela ${parcela.numero ?? "-"} · ${numeroContrato}`,
        data,
        horario: "",
        descricao: `${cliente} · ${formatarMoeda(valor)}`,
        categoria: "Vencimentos",
        situacao: CORES_SITUACAO[situacao] ? situacao : "PENDENTE",
        valor,
        contratoId: contrato.id,
        contrato: numeroContrato,
        cliente: contrato.cliente_nome || "",
      });
    });
  });

  return eventos;
}

export function resumoVencimentos(eventos = []) {
  return eventos.reduce(
    (resumo, evento) => {
      if (evento.tipo !== "vencimento") return resumo;

      if (evento.situacao === "PAGA") resumo.pago += evento.valor;
      else if (evento.situacao === "VENCIDA") resumo.vencido += evento.valor;
      else if (evento.situacao === "CANCELADA") resumo.cancelado += evento.valor;
      else resumo.pendente += evento.valor;

      return resumo;
    },
    { pago: 0, pendente: 0, vencido: 0, cancelado: 0 }
  );
}

export function mesclarEventos(
  pessoais = [],
  vencimentos = [],
  { mostrarVencimentos = true } = {}
) {
  return [...pessoais, ...(mostrarVencimentos ? vencimentos : [])];
}
