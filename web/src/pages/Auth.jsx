import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiFileText } from "react-icons/fi";
import { api, mensagemErro } from "../axios/axios";
import { Field, Notice } from "../components/ui";

export default function Auth({ register = false }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice] = useState(
    () => sessionStorage.getItem("mensagemSessao") || "",
  );
  async function entrar(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const dados = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (register) {
        await api.post("/auth/register", dados);
        sessionStorage.setItem(
          "mensagemSessao",
          "Conta criada. Entre com seu e-mail e senha.",
        );
        navigate("/", { replace: true });
      } else {
        const response = await api.post("/auth/login", dados);
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("usuario", JSON.stringify(response.data.usuario));
        sessionStorage.removeItem("mensagemSessao");
        navigate("/home", { replace: true });
      }
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-brand">
        <Link className="brand" to="/">
          <FiFileText />
          ContractFlow
        </Link>
        <h1>
          Seus contratos.
          <br />
          Seu controle financeiro.
        </h1>
        <p>
          Clientes, documentos, parcelas e pagamentos organizados em um só
          lugar.
        </p>
      </section>
      <section className="auth-form">
        <div>
          <h2>{register ? "Crie sua conta" : "Acesse sua conta"}</h2>
          <p className="muted">
            {register
              ? "Comece a organizar seus contratos."
              : "Entre para acompanhar seu negócio."}
          </p>
          <Notice>{notice}</Notice>
          <form onSubmit={entrar}>
            {register ? (
              <Field
                label="Nome"
                name="nome"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
              />
            ) : null}
            <Field
              label="E-mail"
              name="email"
              type="email"
              required
              maxLength={150}
              autoComplete="email"
            />
            <Field
              label="Senha"
              name="senha"
              type="password"
              required
              minLength={register ? 6 : undefined}
              maxLength={72}
              autoComplete={register ? "new-password" : "current-password"}
            />
            <Notice error>{error}</Notice>
            <button className="button primary" disabled={busy}>
              {busy ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
            </button>
          </form>
          <p className="auth-bottom">
            {register ? "Já tem uma conta? " : "Ainda não tem uma conta? "}
            <Link to={register ? "/" : "/register"}>
              {register ? "Entrar" : "Cadastre-se"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
