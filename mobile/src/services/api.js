// Serviço de comunicação com a API ContractFlow
// Endpoints existentes em api/:
//   POST /api/auth/register  -> { message, usuario }
//   POST /api/auth/login     -> { message, token, usuario: { id, nome, email, perfil } }
//   GET  /api/clientes       -> lista de clientes (auth Bearer)
//   GET  /api/clientes/:id   -> cliente (auth)
//   POST /api/clientes       -> criar cliente (auth)
//   PUT  /api/clientes/:id   -> atualizar (auth)
//   DELETE /api/clientes/:id -> remover (auth)

const API_URL = 'http://10.0.2.2:3000/api';

let authToken = null;

export function setToken(token) {
  authToken = token;
}

export function getToken() {
  return authToken;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || 'Erro na requisição');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export const api = {
  login: (email, senha) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  }),

  register: (nome, email, senha, perfil) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nome, email, senha, perfil }),
  }),

  listClientes: () => request('/clientes'),

  getCliente: (id) => request(`/clientes/${id}`),

  createCliente: (dados) => request('/clientes', {
    method: 'POST',
    body: JSON.stringify(dados),
  }),

  updateCliente: (id, dados) => request(`/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  }),

  deleteCliente: (id) => request(`/clientes/${id}`, {
    method: 'DELETE',
  }),
};
