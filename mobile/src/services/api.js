import axios from 'axios';
import { getToken, limparSessao } from './storage';

const API_URL = 'http://10.89.240.33:8080/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
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
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      limparSessao();
    }
    return Promise.reject(error);
  }
);

function extrairMensagem(error, fallback) {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return fallback;
}

const api = {
  login: (email, senha) =>
    apiClient.post('/auth/login', { email, senha }).then((res) => res.data),

  register: (nome, email, senha) =>
    apiClient.post('/auth/register', { nome, email, senha }).then((res) => res.data),

  listClientes: (busca = '', page = 1) =>
    apiClient.get('/clientes', { params: { q: busca || undefined, page, limit: 50 } }).then((res) => res.data),

  getCliente: (id) => apiClient.get(`/clientes/${id}`).then((res) => res.data),

  createCliente: (dados) => apiClient.post('/clientes', dados).then((res) => res.data),

  updateCliente: (id, dados) => apiClient.put(`/clientes/${id}`, dados).then((res) => res.data),

  deleteCliente: (id) => apiClient.delete(`/clientes/${id}`).then((res) => res.data),

  listContratos: (params = {}) =>
    apiClient.get('/contratos', { params }).then((res) => res.data),

  getContrato: (id) => apiClient.get(`/contratos/${id}`).then((res) => res.data),

  createContrato: (dados) => apiClient.post('/contratos', dados).then((res) => res.data),

  updateContrato: (id, dados) => apiClient.put(`/contratos/${id}`, dados).then((res) => res.data),

  deleteContrato: (id) => apiClient.delete(`/contratos/${id}`).then((res) => res.data),

  updateContratoStatus: (id, status) =>
    apiClient.patch(`/contratos/${id}/status`, { status }).then((res) => res.data),

  getHistorico: (id) => apiClient.get(`/contratos/${id}/historico`).then((res) => res.data),

  listParcelas: (contratoId, filtro) =>
    apiClient.get(`/parcelas/${contratoId}/parcelas`, { params: { filtro } }).then((res) => res.data),

  updateParcela: (contratoId, parcelaId, dados) =>
    apiClient.patch(`/parcelas/${contratoId}/parcelas/${parcelaId}`, dados).then((res) => res.data),

  listPagamentos: (contratoId, params = {}) =>
    apiClient.get(`/pagamentos/${contratoId}/pagamentos`, { params }).then((res) => res.data),

  createPagamento: (contratoId, dados) =>
    apiClient.post(`/pagamentos/${contratoId}/pagamentos`, dados).then((res) => res.data),

  listReceitas: (params = {}) =>
    apiClient.get('/receitas', { params }).then((res) => res.data),
};

function normalizarErro(error) {
  return extrairMensagem(error, 'Ops, algo deu errado. Tente novamente.');
}

export { api, apiClient, normalizarErro };
