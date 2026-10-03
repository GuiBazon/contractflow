import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import { api } from "../axios/axios";
import {
  Formulario,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  QueryState,
  Search,
  Table,
} from "../components/ui";
import { labels } from "../utils/format";
export default function Configuracoes() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  return (
    <>
      <PageTitle
        title="Configurações"
        subtitle="Gerencie sua sessão e os acessos ao sistema."
      />
      <section className="panel">
        <h2>Minha conta</h2>
        <dl className="details">
          <div>
            <dt>Nome</dt>
            <dd>{usuario.nome}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{usuario.email}</dd>
          </div>
          <div>
            <dt>Perfil</dt>
            <dd>{labels[usuario.perfil]}</dd>
          </div>
        </dl>
      </section>
      <section className="panel">
        <h2>Alterar senha</h2>
        <p className="muted">
          A troca de senha encerra as sessões da conta. Entre novamente depois
          de salvar.
        </p>
        <Formulario
          fields={[
            {
              name: "senha_atual",
              label: "Senha atual",
              type: "password",
              required: true,
              autoComplete: "current-password",
            },
            {
              name: "nova_senha",
              label: "Nova senha",
              type: "password",
              minLength: 6,
              maxLength: 72,
              required: true,
              autoComplete: "new-password",
            },
          ]}
          submitLabel="Alterar senha"
          onSubmit={(values) => api.patch("/auth/password", values)}
          onSuccess={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            sessionStorage.setItem(
              "mensagemSessao",
              "Senha alterada. Entre novamente.",
            );
            navigate("/", { replace: true });
          }}
        />
      </section>
      {usuario.perfil === "ADMIN" ? <Usuarios /> : null}
    </>
  );
}
function Usuarios() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const query = useConsulta("/usuarios", { q, page, limit: 20 });
  function salvo() {
    setModal(null);
    setNotice("Usuário atualizado. As sessões anteriores foram encerradas.");
    query.reload();
  }
  return (
    <section className="panel">
      <h2>Usuários</h2>
      <p className="muted">
        Somente administradores gerenciam contas. Alterações encerram as sessões
        do usuário alterado; seus registros financeiros são preservados.
      </p>
      <Notice>{notice}</Notice>
      <div className="toolbar">
        <Search
          placeholder="Pesquisar usuários"
          onSearch={(value) => {
            setQ(value);
            setPage(1);
          }}
        />
      </div>
      <QueryState query={query}>
        <Table
          rows={query.data?.data}
          columns={[
            { key: "nome", label: "Nome" },
            { key: "email", label: "E-mail" },
            {
              key: "perfil",
              label: "Perfil",
              render: (row) => labels[row.perfil],
            },
            {
              key: "ativo",
              label: "Situação",
              render: (row) => (row.ativo ? "Ativo" : "Inativo"),
            },
            {
              key: "actions",
              label: "Ações",
              render: (row) => (
                <div className="actions">
                  <button
                    className="text-button"
                    onClick={() => setModal({ row, mode: "edit" })}
                  >
                    Editar
                  </button>
                  {row.ativo ? (
                    <button
                      className="text-button danger"
                      onClick={() => setModal({ row, mode: "deactivate" })}
                    >
                      Desativar
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
        <Pagination data={query.data} page={page} onPage={setPage} />
      </QueryState>
      {modal ? (
        <Modal
          title={modal.mode === "edit" ? "Editar usuário" : "Desativar usuário"}
          onClose={() => setModal(null)}
        >
          {modal.mode === "deactivate" ? (
            <>
              <p>
                Desativar {modal.row.nome}? O acesso será encerrado e os dados
                serão preservados. O último administrador ativo não pode ser
                desativado.
              </p>
              <Formulario
                fields={[]}
                submitLabel="Confirmar desativação"
                onSubmit={() => api.delete("/usuarios/" + modal.row.id)}
                onSuccess={salvo}
              />
            </>
          ) : (
            <Formulario
              fields={[
                {
                  name: "nome",
                  label: "Nome",
                  required: true,
                  minLength: 2,
                  maxLength: 150,
                },
                {
                  name: "email",
                  label: "E-mail",
                  type: "email",
                  required: true,
                  maxLength: 150,
                },
                {
                  name: "perfil",
                  label: "Perfil",
                  options: [
                    { value: "ADMIN", label: "Administrador" },
                    { value: "USUARIO", label: "Usuário" },
                  ],
                },
                {
                  name: "ativo",
                  label: "Ativo",
                  options: [
                    { value: "1", label: "Sim" },
                    { value: "0", label: "Não" },
                  ],
                },
              ]}
              initial={modal.row}
              onSubmit={(values) =>
                api.put("/usuarios/" + modal.row.id, {
                  ...values,
                  ativo: Number(values.ativo),
                })
              }
              onSuccess={salvo}
            />
          )}
        </Modal>
      ) : null}
    </section>
  );
}
