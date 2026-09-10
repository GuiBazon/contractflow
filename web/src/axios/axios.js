import axios from "axios";

<<<<<<< HEAD
const api = axios.create({
=======
const instance = axios.create({
>>>>>>> feature/tela_cadastro
  baseURL: "http://localhost:5000/contractflow",
  headers: {
    accept: "application/json",
  },
});

<<<<<<< HEAD
=======
const api = {
  postLogin: (data) => instance.post("/login", data),
  postRegister: (data) => instance.post("/register", data),
};

export default api;

>>>>>>> feature/tela_cadastro
