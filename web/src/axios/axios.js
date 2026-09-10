import axios from "axios";

<<<<<<< HEAD
const api = axios.create({
<<<<<<< HEAD
=======
const instance = axios.create({
>>>>>>> feature/tela_cadastro
  baseURL: "http://localhost:5000/contractflow",
=======
  baseURL: "http://localhost:8080/api",
>>>>>>> c6b027b91e6ec214c5bab72d3a95d1ca951a70ff
  headers: {
    accept: "application/json",
  },
});

<<<<<<< HEAD
<<<<<<< HEAD
=======
const api = {
  postLogin: (data) => instance.post("/login", data),
  postRegister: (data) => instance.post("/register", data),
};

export default api;

>>>>>>> feature/tela_cadastro
=======
// ==========================
// INTERCEPTOR DE REQUEST
// ==========================
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

// ==========================
// INTERCEPTOR DE RESPONSE
// ==========================
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
>>>>>>> c6b027b91e6ec214c5bab72d3a95d1ca951a70ff
