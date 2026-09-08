// Imports de Páginas
import Register from "./pages/register/register";

import { CssBaseline } from "@mui/material";

import { BrowserRouter, Routes, Route } from "react-router-dom";
 

function App() {
  return (
    <>
      <CssBaseline />

      <BrowserRouter>
        <Routes>
          {/* 🔓 PUBLIC */}
          
          <Route path="/register" element={<Register />} />

          </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;