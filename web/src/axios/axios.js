import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 20000,
  headers: { Accept: "application/json" },
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = /\/auth\/(login|register)$/.test(error.config?.url || "");
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      sessionStorage.setItem(
        "mensagemSessao",
        "Sua sessão expirou. Entre novamente.",
      );
      if (location.pathname !== "/") location.replace("/");
    }
    return Promise.reject(error);
  },
);
export function mensagemErro(error) {
  return (
    error.response?.data?.message ||
    (error.code === "ECONNABORTED"
      ? "O servidor demorou para responder. Tente novamente."
      : "Não foi possível conectar ao servidor. Tente novamente.")
  );
}
export async function baixarArquivo(path, nome, params) {
  try {
    const response = await api.get(path, { params, responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    // Axios recebe também os erros JSON como Blob ao baixar um arquivo.
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        /* usa mensagem padrão */
      }
    }
    throw error;
  }
}
const sheets = {
  postLogin: (dados) => api.post("/auth/login", dados),
  postRegister: (dados) => api.post("/auth/register", dados),
  getClientes: () => api.get("/clientes"),
  createCliente: (dados) => api.post("/clientes", dados),
  updateCliente: (id, dados) => api.put("/clientes/" + id, dados),
  deleteCliente: (id) => api.delete("/clientes/" + id),
  getContratos: () => api.get("/contratos"),
  createContrato: (dados) => api.post("/contratos", dados),
  updateContrato: (id, dados) => api.put("/contratos/" + id, dados),
  deleteContrato: (id) => api.delete("/contratos/" + id),
  getPagamentos: () => api.get("/receitas"),
  createPagamento: (id, dados) =>
    api.post("/contratos/" + id + "/pagamentos", dados),
  getHealth: () => api.get("/health"),
};
export default sheets;
