import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  headers: {
    accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response) {
      const { status, data, config } = error.response;

      const url = config?.url || "";
      const isAuthEndpoint =
        url.includes("/auth/login") || url.includes("/auth/register");
      if (!isAuthEndpoint && status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        localStorage.removeItem("auth");

        localStorage.setItem(
          "logoutMessage",
          data?.message || "Sua sessão expirou."
        );

        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

const sheets = {
  // AUTENTICAÇÃO

  postLogin: (usuario) =>
    api.post("/auth/login", usuario),

  postRegister: (usuario) =>
    api.post("/auth/register", usuario),

  // CLIENTES

  getClientes: (params) =>
    api.get("/clientes", { params }),

  createCliente: (data) =>
    api.post("/clientes", data),

  updateCliente: (id, data) =>
    api.put("/clientes/" + id, data),

  deleteCliente: (id) =>
    api.delete("/clientes/" + id),

  //  CONTRATOS

  getContratos: (params) =>
    api.get("/contratos", { params }),

  getContratoById: (id) =>
    api.get("/contratos/" + id),

  createContrato: (data) =>
    api.post("/contratos", data),

  updateContrato: (id, data) =>
    api.put("/contratos/" + id, data),

  deleteContrato: (id) =>
    api.delete("/contratos/" + id),

  updateContratoStatus: (id, status) =>
    api.patch(`/contratos/${id}/status`, { status }),

  getHistoricoContrato: (id) =>
    api.get(`/contratos/${id}/historico`),

  getDocumentosContrato: (contratoId) =>
    api.get(`/documentos/${contratoId}/documentos`),

  uploadDocumentoContrato: (contratoId, formData) =>
    api.post(`/documentos/${contratoId}/documentos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  downloadDocumento: (contratoId, docId) =>
    api.get(`/documentos/${contratoId}/documentos/${docId}/arquivo`, {
      responseType: "blob",
    }),

  deleteDocumento: (contratoId, docId) =>
    api.delete(`/documentos/${contratoId}/documentos/${docId}`),

  // PARCELAS

  getParcelas: (contratoId, params) =>
    api.get(`/parcelas/${contratoId}/parcelas`, { params }),

  updateParcela: (contratoId, parcelaId, data) =>
    api.patch(`/parcelas/${contratoId}/parcelas/${parcelaId}`, data),

  // PAGAMENTOS / RECEITAS

  getPagamentos: (params) =>
    api.get("/receitas", { params }).catch(() => api.get("/pagamentos", { params })),

  getReceitas: (params) =>
    api.get("/receitas", { params }),

  createPagamento: (contratoId, data) =>
    api.post(`/contratos/${contratoId}/pagamentos`, data),

  // OCR / IMPORTAÇÃO INTELIGENTE COM IA

  extractOcr: (formData) =>
    api.post("/ocr/extract", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getOcr: (id) =>
    api.get(`/ocr/${id}`),

  updateOcr: (id, dados) =>
    api.patch(`/ocr/${id}`, { dados }),

  confirmarOcr: (id, dados) =>
    api.post(`/ocr/${id}/confirmar`, { dados }),

  cancelarOcr: (id) =>
    api.delete(`/ocr/${id}`),

  getHealth: () =>
    api.get("/health"),

  // USUÁRIO / PERFIL

  getPerfilUsuario: (id) =>
    api.get(`/usuarios/${id}`),

  updatePerfilUsuario: (id, data) =>
    api.put(`/usuarios/${id}`, data),

  updateSenha: (data) =>
    api.patch("/usuarios/senha", data),
};

export default sheets;