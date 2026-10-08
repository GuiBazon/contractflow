/* =========================================================
   DADOS MOCKADOS — Dashboard "Visão Geral"
   Substitua cada export por chamadas à API quando disponível.
========================================================= */

export const KPIS = [
  {
    id: "contratos-ativos",
    label: "Contratos Ativos",
    value: "47",
    change: "+12% este mês",
    tone: "positive",
    iconKey: "description",
  },
  {
    id: "clientes-atendidos",
    label: "Clientes Atendidos",
    value: "128",
    change: "+8 novos clientes",
    tone: "positive",
    iconKey: "people",
  },
  {
    id: "recebido-mes",
    label: "Recebido este mês",
    value: "R$ 84.500,00",
    change: "+15.4% vs meta",
    tone: "positive",
    iconKey: "money",
  },
  {
    id: "inadimplencia",
    label: "Inadimplência Geral",
    value: "8.2%",
    change: "Atenção necessária",
    tone: "warning",
    iconKey: "warning",
  },
];

export const FLUXO_FINANCEIRO = [
  { mes: "Mar", receitas: 58, despesas: 22 },
  { mes: "Abr", receitas: 64, despesas: 30 },
  { mes: "Mai", receitas: 60, despesas: 26 },
  { mes: "Jun", receitas: 78, despesas: 42 },
  { mes: "Jul", receitas: 92, despesas: 48 },
  { mes: "Ago", receitas: 74, despesas: 40 },
];

export const STATUS_CONTRATOS = [
  { label: "Ativos",             value: 32, color: "#3f7ff2" },
  { label: "Inadimplentes",      value: 9,  color: "#ef4444" },
  { label: "Renovação pendente", value: 6,  color: "#f5a623" },
];

export const PROXIMOS_VENCIMENTOS = [
  { cliente: "Acme Corporation Corp",    valor: "R$ 12.500,00", data: "12/09/2026", status: "EM ABERTO" },
  { cliente: "Mariana Vasconcelos LTDA", valor: "R$ 4.200,00",  data: "15/09/2026", status: "EM DIA"    },
  { cliente: "Global Solutions S/A",     valor: "R$ 8.900,00",  data: "18/09/2026", status: "ATRASADO"  },
  { cliente: "TechPrime Sistemas",       valor: "R$ 3.100,00",  data: "20/09/2026", status: "EM ABERTO" },
  { cliente: "Studio Design Criativo",   valor: "R$ 5.500,00",  data: "24/09/2026", status: "RASCUNHO"  },
];

export const ATIVIDADES_RECENTES = [
  { id: 1, texto: "Contrato criado para Global Solutions", tempo: "Há 10 minutos", iconKey: "add",    color: "#3f7ff2" },
  { id: 2, texto: "Pagamento recebido de Acme Corp",       tempo: "Há 2 horas",   iconKey: "check",  color: "#22c55e" },
  { id: 3, texto: "Fatura em atraso para TechPrime",       tempo: "Há 1 dia",     iconKey: "error",  color: "#ef4444" },
  { id: 4, texto: "Contrato renovado para Mariana V.",     tempo: "Há 2 dias",    iconKey: "renew",  color: "#f5a623" },
  { id: 5, texto: "Novo cliente cadastrado no sistema",    tempo: "Há 3 dias",    iconKey: "person", color: "#8b97aa" },
];

export const STATUS_COLORS = {
  "EM ABERTO": { bg: "#e8f0fe", color: "#3f7ff2"  },
  "EM DIA":    { bg: "#e7f9ef", color: "#1f9d55"  },
  ATRASADO:    { bg: "#fdeceb", color: "#e0392b"  },
  RASCUNHO:    { bg: "#fdf3e0", color: "#c8850f"  },
};

export const USUARIO_LOGADO = {
  nome:     "Rodrigo Souza",
  cargo:    "Administrador",
  initials: "RS",
};
