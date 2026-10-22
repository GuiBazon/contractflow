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

  // PARCELAS

  getParcelas: (contratoId, params) =>
    api.get(`/parcelas/${contratoId}/parcelas`, { params }),

  // PAGAMENTOS / RECEITAS

  getPagamentos: (params) =>
    api.get("/receitas", { params }).catch(() => api.get("/pagamentos", { params })),

  getReceitas: (params) =>
    api.get("/receitas", { params }),

  createPagamento: (contratoId, data) =>
    api.post(`/contratos/${contratoId}/pagamentos`, data),

  getHealth: () =>
    api.get("/health"),

  // CALCULADORA

  getHistoricoSimulacoes: () =>
    api.get("/calculadora/historico"),

  postSimulacao: (data) =>
    api.post("/calculadora/simular", data),
};

export default sheets;