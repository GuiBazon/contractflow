import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import { api } from "../axios/axios";
import {
  Badge,
  Formulario,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  QueryState,
  Search,
  Table,
} from "../components/ui";
import { dinheiro } from "../utils/format";

const fields = [
  {
    name: "nome_razao_social",
    label: "Nome / Razão social",
    required: true,
    maxLength: 200,
  },
  { name: "cpf_cnpj", label: "CPF/CNPJ", required: true, maxLength: 18 },
  { name: "email", label: "E-mail", type: "email", maxLength: 150 },
  { name: "telefone", label: "Telefone", maxLength: 30 },
  { name: "cep", label: "CEP", maxLength: 20 },
  { name: "logradouro", label: "Logradouro", maxLength: 200 },
  { name: "numero", label: "Número", maxLength: 20 },
  { name: "complemento", label: "Complemento", maxLength: 100 },
  { name: "bairro", label: "Bairro", maxLength: 100 },
  { name: "cidade", label: "Cidade", maxLength: 100 },
  { name: "estado", label: "UF", maxLength: 2 },
  {
    name: "observacoes",
    label: "Observações",
    textarea: true,
    maxLength: 5000,
  },
];
export default function Clientes() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const query = useConsulta("/clientes", { q, page, limit: 20 });
  function salvo() {
    setModal(null);
    setNotice("Cliente salvo com sucesso.");
    query.reload();
  }
  return (
    <>
      <PageTitle
        title="Clientes"
        subtitle="Organize os clientes vinculados aos seus contratos."
      >
        <button
          className="button primary"
          onClick={() => setModal({ mode: "create" })}
        >
          Novo cliente
        </button>
      </PageTitle>
      <Notice>{notice}</Notice>
      <section className="panel">
        <div className="toolbar">
          <Search
            placeholder="Pesquisar clientes"
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
              {
                key: "nome_razao_social",
                label: "Cliente",
                render: (row) => (
                  <Link to={"/clientes/" + row.id}>
                    {row.nome_razao_social}
                  </Link>
                ),
              },
              { key: "cpf_cnpj", label: "CPF/CNPJ" },
              { key: "email", label: "E-mail" },
              { key: "total_contratos", label: "Contratos" },
              {
                key: "actions",
                label: "Ações",
                render: (row) => (
                  <div className="actions">
                    <button
                      className="text-button"
                      onClick={() => setModal({ mode: "edit", row })}
                    >
                      Editar
                    </button>
                    <button
                      className="text-button danger"
                      onClick={() => setModal({ mode: "delete", row })}
                    >
                      Excluir
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination data={query.data} page={page} onPage={setPage} />
        </QueryState>
      </section>
      {modal ? (
        <Modal
          title={
            modal.mode === "create"
              ? "Novo cliente"
              : modal.mode === "edit"
                ? "Editar cliente"
                : "Excluir cliente"
          }
          onClose={() => setModal(null)}
        >
          {modal.mode === "delete" ? (
            <>
              <p>
                Excluir {modal.row.nome_razao_social}? Clientes vinculados a
                contratos são preservados pelo sistema.
              </p>
              <Formulario
                fields={[]}
                submitLabel="Confirmar exclusão"
                onSubmit={() => api.delete("/clientes/" + modal.row.id)}
                onSuccess={() => {
                  setModal(null);
                  setNotice("Cliente excluído.");
                  query.reload();
                }}
              />
            </>
          ) : (
            <Formulario
              fields={fields}
              initial={modal.row}
              onSubmit={(values) =>
                modal.mode === "create"
                  ? api.post("/clientes", values)
                  : api.put("/clientes/" + modal.row.id, values)
              }
              onSuccess={salvo}
            />
          )}
        </Modal>
      ) : null}
    </>
  );
}
export function DetalheCliente() {
  const { id } = useParams();
  const query = useConsulta("/clientes/" + id);
  const [page, setPage] = useState(1);
  const contratos = useConsulta("/contratos", { cliente: id, page, limit: 20 });
  const row = query.data;
  return (
    <>
      <PageTitle
        title={row?.nome_razao_social || "Cliente"}
        subtitle="Dados de contato e contratos vinculados."
      >
        <Link className="button secondary" to="/clientes">
          Voltar
        </Link>
        <Link className="button primary" to={"/contratos/novo?cliente=" + id}>
          Novo contrato
        </Link>
      </PageTitle>
      <QueryState query={query}>
        {row ? (
          <section className="panel">
            <dl className="details">
              {fields.map((field) => (
                <div key={field.name}>
                  <dt>{field.label}</dt>
                  <dd>{row[field.name] || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </QueryState>
      <section className="panel">
        <h2>Contratos deste cliente</h2>
        <QueryState query={contratos}>
          <Table
            rows={contratos.data?.data}
            columns={[
              {
                key: "numero",
                label: "Contrato",
                render: (item) => (
                  <Link to={"/contratos/" + item.id}>{item.numero}</Link>
                ),
              },
              {
                key: "valor_total",
                label: "Valor total",
                render: (item) => dinheiro(item.valor_total),
              },
              {
                key: "pendente",
                label: "A receber",
                render: (item) => dinheiro(item.pendente),
              },
              {
                key: "status",
                label: "Status",
                render: (item) => <Badge value={item.status} />,
              },
            ]}
          />
          <Pagination data={contratos.data} page={page} onPage={setPage} />
        </QueryState>
      </section>
    </>
  );
}
