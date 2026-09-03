// Imports de Páginas
import Login from "./pages/login/Login";

import { CssBaseline } from "@mui/material";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/protected_route/protected_route";

function App() {
  return (
    <>
      <CssBaseline />

      <BrowserRouter>
        <Routes>
          {/* 🔓 PUBLIC */}
          <Route path="/" element={<Login />} />

          
          </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;