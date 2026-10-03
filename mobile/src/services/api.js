import axios from "axios";
import { Platform } from "react-native";
import { getToken, limparSessao, salvarUsuario } from "./storage";
import { voltarAoLogin } from "../navigation/navigationRef";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:8080/api"
    : "http://127.0.0.1:8080/api");

export { API_URL };

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !/\/auth\/(login|register)$/.test(error.config?.url || "")
    ) {
      limparSessao().finally(voltarAoLogin);
    }
    return Promise.reject(error);
  },
);

function extrairMensagem(error, fallback) {
  if (error.response) {
    if (error.response.data && error.response.data.message) {
      return error.response.data.message;
    }
    if (error.response.status === 404) {
      return "Recurso não encontrado no servidor.";
    }
    if (error.response.status >= 500) {
      return "Erro interno do servidor. Tente novamente mais tarde.";
    }
  }
  if (error.isAxiosError || (error.code && /^(ERR_|ECONN)/.test(error.code))) {
    return "Não foi possível conectar ao servidor. Verifique se a API está ligada e se o celular está conectado à mesma rede.";
  }
  if (error.message) {
    return error.message;
  }
  return fallback;
}

const api = {
  login: (email, senha) =>
    apiClient.post("/auth/login", { email, senha }).then((res) => res.data),

  register: (nome, email, senha) =>
    apiClient
      .post("/auth/register", { nome, email, senha })
      .then((res) => res.data),

  listClientes: (busca = "", page = 1) =>
    apiClient
      .get("/clientes", { params: { q: busca || undefined, page, limit: 50 } })
      .then((res) => res.data),

  getCliente: (id) => apiClient.get(`/clientes/${id}`).then((res) => res.data),

  createCliente: (dados) =>
    apiClient.post("/clientes", dados).then((res) => res.data),

  updateCliente: (id, dados) =>
    apiClient.put(`/clientes/${id}`, dados).then((res) => res.data),

  deleteCliente: (id) =>
    apiClient.delete(`/clientes/${id}`).then((res) => res.data),

  listContratos: (params = {}) =>
    apiClient.get("/contratos", { params }).then((res) => res.data),

  getContrato: (id) =>
    apiClient.get(`/contratos/${id}`).then((res) => res.data),

  createContrato: (dados) =>
    apiClient.post("/contratos", dados).then((res) => res.data),

  updateContrato: (id, dados) =>
    apiClient.put(`/contratos/${id}`, dados).then((res) => res.data),

  deleteContrato: (id) =>
    apiClient.delete(`/contratos/${id}`).then((res) => res.data),

  updateContratoStatus: (id, status) =>
    apiClient
      .patch(`/contratos/${id}/status`, { status })
      .then((res) => res.data),

  getHistorico: (id) =>
    apiClient.get(`/contratos/${id}/historico`).then((res) => res.data),

  listParcelas: (contratoId, filtro) =>
    apiClient
      .get(`/parcelas/${contratoId}/parcelas`, { params: { filtro } })
      .then((res) => res.data),

  generateParcelas: (contratoId, dados) =>
    apiClient
      .post(`/contratos/${contratoId}/parcelas`, dados)
      .then((res) => res.data),

  updateParcela: (contratoId, parcelaId, dados) =>
    apiClient
      .patch(`/parcelas/${contratoId}/parcelas/${parcelaId}`, dados)
      .then((res) => res.data),

  listPagamentos: (contratoId, params = {}) =>
    apiClient
      .get(`/pagamentos/${contratoId}/pagamentos`, { params })
      .then((res) => res.data),

  createPagamento: (contratoId, dados) =>
    apiClient
      .post(`/pagamentos/${contratoId}/pagamentos`, dados)
      .then((res) => res.data),

  listReceitas: (params = {}) =>
    apiClient.get("/receitas", { params }).then((res) => res.data),

  listDocumentos: (contratoId) =>
    apiClient
      .get(`/documentos/${contratoId}/documentos`)
      .then((res) => res.data),

  deleteDocumento: (contratoId, documentoId) =>
    apiClient
      .delete(`/documentos/${contratoId}/documentos/${documentoId}`)
      .then((res) => res.data),

  uploadDocumento: async (
    contratoId,
    { uri, nome, mime, file, tipo = "ANEXO", descricao },
  ) => {
    const data = await arquivoMultipart({ uri, nome, mime, file });
    data.append("tipo", tipo);
    if (descricao) data.append("descricao", descricao);
    return apiClient
      .post(
        "/contratos/" + contratoId + "/documentos",
        data,
        multipartOptions(60000),
      )
      .then((res) => res.data);
  },
  ocrExtract: async (asset) => {
    const data = await arquivoMultipart(asset);
    return apiClient
      .post("/ocr/extract", data, multipartOptions(660000))
      .then((res) => res.data);
  },

  ocrGet: (id) => apiClient.get(`/ocr/${id}`).then((res) => res.data),
  ocrCancel: (id) => apiClient.delete(`/ocr/${id}`).then((res) => res.data),

  ocrUpdate: (id, dados) =>
    apiClient.patch(`/ocr/${id}`, { dados }).then((res) => res.data),

  ocrConfirmar: (id, dados) =>
    apiClient.post(`/ocr/${id}/confirmar`, { dados }).then((res) => res.data),

  me: () => apiClient.get("/auth/me").then((res) => res.data),
  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      await limparSessao();
      voltarAoLogin();
    }
  },
  mudarSenha: (dados) =>
    apiClient.patch("/auth/password", dados).then((res) => res.data),
  dashboard: (params = {}) =>
    apiClient.get("/dashboard", { params }).then((res) => res.data),
  listRecebiveis: (params = {}) =>
    apiClient.get("/recebiveis", { params }).then((res) => res.data),
  listDespesas: (params = {}) =>
    apiClient.get("/despesas", { params }).then((res) => res.data),
  getDespesa: (id) => apiClient.get("/despesas/" + id).then((res) => res.data),
  createDespesa: (dados) =>
    apiClient.post("/despesas", dados).then((res) => res.data),
  updateDespesa: (id, dados) =>
    apiClient.put("/despesas/" + id, dados).then((res) => res.data),
  deleteDespesa: (id) =>
    apiClient.delete("/despesas/" + id).then((res) => res.data),
  alertas: (params = {}) =>
    apiClient.get("/alertas", { params }).then((res) => res.data),
  relatorio: (tipo, params = {}) =>
    apiClient.get("/relatorios/" + tipo, { params }).then((res) => res.data),
  calcular: (tipo, dados) =>
    apiClient.post("/calculadora/" + tipo, dados).then((res) => res.data),
  renovar: (id, dados) =>
    apiClient
      .post("/contratos/" + id + "/renovar", dados)
      .then((res) => res.data),
  listUsuarios: (params = {}) =>
    apiClient.get("/usuarios", { params }).then((res) => res.data),
  getUsuario: (id) => apiClient.get("/usuarios/" + id).then((res) => res.data),
  documentos: (params = {}) =>
    apiClient.get("/documentos", { params }).then((res) => res.data),
  updateUsuario: (id, dados) =>
    apiClient.put("/usuarios/" + id, dados).then((res) => res.data),
  async verificarSessao() {
    if (!(await getToken())) return false;
    try {
      const data = await this.me();
      await salvarUsuario(data.usuario);
      return true;
    } catch (error) {
      if (error.response?.status === 401) await limparSessao();
      return false;
    }
  },
  async calendario(params) {
    const first = await apiClient.get("/calendario", {
      params: { ...params, page: 1, limit: 1000 },
    });
    const result = first.data;
    for (let page = 2; page <= result.paginacao.totalPages; page++) {
      const next = await apiClient.get("/calendario", {
        params: { ...params, page, limit: 1000 },
      });
      result.data.push(...next.data.data);
    }
    return result;
  },
  async listTodosClientes() {
    const first = await this.listClientes("", 1);
    const result = first.data;
    for (let page = 2; page <= first.paginacao.totalPages; page++)
      result.push(...(await this.listClientes("", page)).data);
    return result;
  },
};

function multipartOptions(timeout) {
  return {
    timeout,
    headers: {
      "Content-Type": Platform.OS === "web" ? undefined : "multipart/form-data",
    },
  };
}
async function arquivoMultipart({ uri, nome, mime, file }) {
  const data = new FormData();
  if (Platform.OS === "web") {
    const blob = file || (await fetch(uri).then((response) => response.blob()));
    if (blob.size > 10 * 1024 * 1024)
      throw new Error("Arquivo deve ter até 10 MB.");
    data.append("arquivo", blob, nome);
  } else data.append("arquivo", { uri, name: nome, type: mime });
  return data;
}

function normalizarErro(error) {
  return extrairMensagem(error, "Ops, algo deu errado. Tente novamente.");
}

export { api, apiClient, normalizarErro };
