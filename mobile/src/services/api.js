import axios from 'axios';
import { getToken, limparSessao } from './storage';

const API_URL = 'http://10.0.2.2:3000/api';

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

  register: (nome, email, senha, perfil) =>
    apiClient.post('/auth/register', { nome, email, senha, perfil }).then((res) => res.data),

  listClientes: () => apiClient.get('/clientes').then((res) => res.data),

  getCliente: (id) => apiClient.get(`/clientes/${id}`).then((res) => res.data),

  createCliente: (dados) => apiClient.post('/clientes', dados).then((res) => res.data),

  updateCliente: (id, dados) => apiClient.put(`/clientes/${id}`, dados).then((res) => res.data),

  deleteCliente: (id) => apiClient.delete(`/clientes/${id}`).then((res) => res.data),
};

function normalizarErro(error) {
  return extrairMensagem(error, 'Ops, algo deu errado. Tente novamente.');
}

export { api, apiClient, normalizarErro };
