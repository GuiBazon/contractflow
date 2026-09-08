import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:5000/contractflow",
  headers: {
    accept: "application/json",
  },
});

const api = {
  postLogin: (data) => instance.post("/login", data),
  postRegister: (data) => instance.post("/register", data),
};

export default api;

