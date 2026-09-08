import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/contractflow",
  headers: {
    accept: "application/json",
  },
});

