import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
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
      const { status, data } = error.response;

      if (
        (status === 401 || status === 403) &&
        data?.auth === false
      ) {
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

// ==========================
// SERVICES (API)
// ==========================
const sheets = {
  // 🔹 AUTENTICAÇÃO

  postLogin: (usuario) =>
    api.post("/auth/login", usuario),

  postRegister: (usuario) =>
    api.post("/auth/register", usuario),

  // 🔹 CLIENTES

  getClientes: () =>
    api.get("/clientes"),

  createCliente: (data) =>
    api.post("/clientes", data),

  updateCliente: (id, data) =>
    api.put("/clientes/" + id, data),

  deleteCliente: (id) =>
    api.delete("/clientes/" + id),

  // 🔹 CONTRATOS

  getContratos: () =>
    api.get("/contratos"),

  createContrato: (data) =>
    api.post("/contratos", data),

  updateContrato: (id, data) =>
    api.put("/contratos/" + id, data),

  deleteContrato: (id) =>
    api.delete("/contratos/" + id),

  // 🔹 PAGAMENTOS

  getPagamentos: () =>
    api.get("/pagamentos"),

  createPagamento: (data) =>
    api.post("/pagamentos", data),

  updatePagamento: (id, data) =>
    api.put("/pagamentos/" + id, data),

  deletePagamento: (id) =>
    api.delete("/pagamentos/" + id),

  // 🔹 HEALTH CHECK

  getHealth: () =>
    api.get("/health"),
};

export default sheets;