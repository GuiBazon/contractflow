import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { getToken, limparSessao } from './storage';

const API_URL = 'http://10.89.240.66:8080/api';

export { API_URL };

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
  if (error.response) {
    if (error.response.data && error.response.data.message) {
      return error.response.data.message;
    }
    if (error.response.status === 404) {
      return 'Recurso não encontrado no servidor.';
    }
    if (error.response.status >= 500) {
      return 'Erro interno do servidor. Tente novamente mais tarde.';
    }
  }
  if (error.isAxiosError || (error.code && /^(ERR_|ECONN)/.test(error.code))) {
    return 'Não foi possível conectar ao servidor. Verifique se a API está ligada e se o celular está conectado à mesma rede.';
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

  generateParcelas: (contratoId, dados) =>
    apiClient.post(`/contratos/${contratoId}/parcelas`, dados).then((res) => res.data),

  updateParcela: (contratoId, parcelaId, dados) =>
    apiClient.patch(`/parcelas/${contratoId}/parcelas/${parcelaId}`, dados).then((res) => res.data),

  listPagamentos: (contratoId, params = {}) =>
    apiClient.get(`/pagamentos/${contratoId}/pagamentos`, { params }).then((res) => res.data),

  createPagamento: (contratoId, dados) =>
    apiClient.post(`/pagamentos/${contratoId}/pagamentos`, dados).then((res) => res.data),

  listReceitas: (params = {}) =>
    apiClient.get('/receitas', { params }).then((res) => res.data),

  listDocumentos: (contratoId) =>
    apiClient.get(`/documentos/${contratoId}/documentos`).then((res) => res.data),

  baixarDocumento: async ({ contratoId, documentoId, nome, mime }) => {
    if (!API_URL) {
      throw new Error(MENSAGEM_API_NAO_CONFIGURADA);
    }

    const token = await getToken();
    if (!token) {
      throw new Error('Sessão expirada. Entre novamente para visualizar o documento.');
    }
    if (!FileSystem.cacheDirectory) {
      throw new Error('Não foi possível acessar o armazenamento temporário do dispositivo.');
    }

    const extensao = extensaoDoDocumento(nome, mime);
    const idSeguro = String(documentoId).replace(/[^a-zA-Z0-9_-]/g, '') || 'arquivo';
    const destino = `${FileSystem.cacheDirectory}documento-${idSeguro}-${Date.now()}.${extensao}`;
    const url = `${API_URL}/documentos/${encodeURIComponent(contratoId)}/documentos/${encodeURIComponent(documentoId)}/arquivo`;

    let timer;
    let resultado;
    try {
      resultado = await Promise.race([
        FileSystem.downloadAsync(url, destino, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(
              Object.assign(
                new Error('Tempo esgotado ao baixar o documento. Verifique a conexão e tente novamente.'),
                { name: 'TimeoutError' }
              )
            );
          }, 45000);
        }),
      ]);
    } catch (error) {
      await FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => {});
      if (error && error.name === 'TimeoutError') throw error;
      throw new Error('Não foi possível baixar o documento. Verifique a conexão com a API.');
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (resultado.status === 401) {
      await FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => {});
      await limparSessao();
      throw new Error('Sessão expirada. Entre novamente para visualizar o documento.');
    }
    if (resultado.status === 404) {
      await FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => {});
      throw new Error('Documento não encontrado ou indisponível.');
    }
    if (resultado.status !== 200) {
      await FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => {});
      throw new Error('Não foi possível recuperar o documento no servidor.');
    }

    const cabecalhos = resultado.headers || {};
    return {
      uri: resultado.uri,
      mime:
        resultado.mimeType ||
        cabecalhos['content-type'] ||
        cabecalhos['Content-Type'] ||
        mime ||
        'application/octet-stream',
    };
  },

  deleteDocumento: (contratoId, documentoId) =>
    apiClient.delete(`/documentos/${contratoId}/documentos/${documentoId}`).then((res) => res.data),

  uploadDocumento: (contratoId, { uri, nome, mime, tipo = 'ANEXO', descricao }) => {
    const formData = new FormData();
    formData.append('arquivo', { uri, name: nome, type: mime });
    formData.append('tipo', tipo);
    if (descricao) formData.append('descricao', descricao);
    return apiClient
      .post(`/documentos/${contratoId}/documentos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })
      .then((res) => res.data);
  },

  ocrExtract: async ({ uri, nome, mime }) => {
    const formData = new FormData();
    formData.append('arquivo', { uri, name: nome, type: mime });
    return apiClient
      .post('/ocr/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })
      .then((res) => res.data);
  },

  ocrGet: (id) => apiClient.get(`/ocr/${id}`).then((res) => res.data),

  ocrUpdate: (id, dados) =>
    apiClient.patch(`/ocr/${id}`, { dados }).then((res) => res.data),

  ocrConfirmar: (id, dados) =>
    apiClient.post(`/ocr/${id}/confirmar`, { dados }).then((res) => res.data),

  async verificarSessao() {
    const token = await getToken();
    if (!token) return false;
    try {
      await apiClient.get('/clientes', { params: { limit: 1 } });
      return true;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await limparSessao();
        return false;
      }
      return true;
    }
  },

  async listTodasParcelas() {
    const contratosData = await this.listContratos({ limit: 100 });
    const contratosLista = contratosData.data || [];
    const detalhes = await Promise.all(
      contratosLista.map((c) => this.listParcelas(c.id).catch(() => ({ data: [] })))
    );
    const resultado = [];
    detalhes.forEach((p, i) => {
      const contrato = contratosLista[i];
      (p.data || []).forEach((parcela) => {
        resultado.push({
          ...parcela,
          contrato_id: contrato.id,
          contrato_numero: contrato.numero,
          cliente_nome: contrato.cliente_nome,
        });
      });
    });
    return resultado;
  },
};

const EXTENSAO_POR_MIME = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extensaoDoDocumento(nome, mime) {
  const extensao = (String(nome || '').split('.').pop() || '').toLowerCase();
  if (['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(extensao)) return extensao;
  return EXTENSAO_POR_MIME[String(mime || '').toLowerCase().split(';')[0]] || 'bin';
}

function normalizarErro(error) {
  return extrairMensagem(error, 'Ops, algo deu errado. Tente novamente.');
}

export { api, apiClient, normalizarErro };
