import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import { api } from "../axios/axios";
import ClientePicker from "../components/ClientePicker";
import {
  Badge,
  Field,
  Formulario,
  Kpis,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  Periodo,
  QueryState,
  Search,
  Table,
} from "../components/ui";
import { dataBr, dinheiro, hoje, labels } from "../utils/format";

const expenseFields = [
  { name: "descricao", label: "Descrição", required: true, maxLength: 200 },
  { name: "categoria", label: "Categoria", maxLength: 100 },
  {
    name: "valor",
    label: "Valor (R$)",
    type: "number",
    min: "0.01",
    step: "0.01",
    required: true,
  },
  { name: "data", label: "Data", type: "date", required: true },
  {
    name: "status",
    label: "Status",
    options: ["PENDENTE", "PAGA", "CANCELADA"].map((value) => ({
      value,
      label: labels[value],
    })),
  },
  {
    name: "observacoes",
    label: "Observações",
    textarea: true,
    maxLength: 5000,
  },
];
const moneyColumn = (key, label) => ({
  key,
  label,
  render: (row) => dinheiro(row[key]),
});
export default function Financeiro() {
  const [params, setParams] = useSearchParams();
  const tab = ["recebiveis", "receitas", "despesas"].includes(params.get("aba"))
    ? params.get("aba")
    : "recebiveis";
  return (
    <TabelaFinanceira
      key={tab}
      tab={tab}
      onTab={(value) => setParams({ aba: value })}
    />
  );
}
function TabelaFinanceira({ tab, onTab }) {
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState({});
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [cliente, setCliente] = useState(null);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const query = useConsulta("/" + tab, {
    page,
    limit: 20,
    ...period,
    ...(tab === "despesas"
      ? { q, status }
      : {
          cliente: cliente?.id,
          ...(tab === "recebiveis" ? { situacao: status } : {}),
        }),
  });
  function salvo(message) {
    setModal(null);
    setPage(1);
    setNotice(message);
    query.reload();
  }
  const common = [
    { key: "cliente_nome", label: "Cliente" },
    {
      key: "contrato_numero",
      label: "Contrato",
      render: (row) => (
        <Link to={"/contratos/" + row.contrato_id}>{row.contrato_numero}</Link>
      ),
    },
  ];
  const columns =
    tab === "recebiveis"
      ? [
          ...common,
          { key: "numero", label: "Parcela" },
          {
            key: "data_vencimento",
            label: "Vencimento",
            render: (row) => dataBr(row.data_vencimento),
          },
          moneyColumn("valor", "Principal"),
          moneyColumn("pago", "Pago"),
          moneyColumn("pendente", "Saldo"),
          moneyColumn("juros", "Juros estimados"),
          moneyColumn("multa", "Multa estimada"),
          {
            key: "situacao",
            label: "Situação",
            render: (row) => <Badge value={row.situacao} />,
          },
          {
            key: "actions",
            label: "",
            render: (row) => (
              <Link to={"/contratos/" + row.contrato_id}>Abrir</Link>
            ),
          },
        ]
      : tab === "receitas"
        ? [
            ...common,
            { key: "parcela_numero", label: "Parcela" },
            {
              key: "data_pagamento",
              label: "Pagamento",
              render: (row) => dataBr(row.data_pagamento),
            },
            moneyColumn("valor", "Recebido"),
            { key: "forma_pagamento", label: "Forma" },
          ]
        : [
            { key: "descricao", label: "Descrição" },
            { key: "categoria", label: "Categoria" },
            { key: "data", label: "Data", render: (row) => dataBr(row.data) },
            moneyColumn("valor", "Valor"),
            {
              key: "status",
              label: "Status",
              render: (row) => <Badge value={row.status} />,
            },
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
                  {row.status === "PENDENTE" ? (
                    <button
                      className="text-button"
                      onClick={() => setModal({ mode: "pay", row })}
                    >
                      Marcar paga
                    </button>
                  ) : null}
                  {row.status !== "PAGA" ? (
                    <button
                      className="text-button danger"
                      onClick={() => setModal({ mode: "delete", row })}
                    >
                      Excluir
                    </button>
                  ) : (
                    <span className="muted">Preservada</span>
                  )}
                </div>
              ),
            },
          ];
  return (
    <>
      <PageTitle
        title="Financeiro"
        subtitle="Recebíveis, receitas e despesas do seu negócio."
      >
        {tab === "despesas" ? (
          <button
            className="button primary"
            onClick={() => setModal({ mode: "create" })}
          >
            Nova despesa
          </button>
        ) : (
          <Link className="button secondary" to="/relatorios">
            Gerar relatório
          </Link>
        )}
      </PageTitle>
      <Notice>{notice}</Notice>
      <div className="tabs">
        {[
          ["recebiveis", "Recebíveis"],
          ["receitas", "Receitas"],
          ["despesas", "Despesas"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={value === tab ? "active" : ""}
            onClick={() => onTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="toolbar">
          <Periodo
            value={period}
            onChange={(value) => {
              setPeriod(value);
              setPage(1);
            }}
          />
          {tab !== "receitas" ? (
            <Field label="Situação">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {(tab === "despesas"
                  ? ["PENDENTE", "PAGA", "CANCELADA"]
                  : ["PENDENTE", "PAGA", "VENCIDA", "CANCELADA"]
                ).map((value) => (
                  <option value={value} key={value}>
                    {labels[value]}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
        {tab === "despesas" ? (
          <div className="toolbar">
            <Search
              placeholder="Pesquisar despesas"
              onSearch={(value) => {
                setQ(value);
                setPage(1);
              }}
            />
          </div>
        ) : (
          <details style={{ marginBottom: 18 }}>
            <summary>
              Filtrar por cliente
              {cliente ? ": " + cliente.nome_razao_social : ""}
            </summary>
            <ClientePicker
              selected={cliente}
              onSelect={(value) => {
                setCliente(value);
                setPage(1);
              }}
            />
            {cliente ? (
              <button
                className="text-button"
                onClick={() => {
                  setCliente(null);
                  setPage(1);
                }}
              >
                Limpar cliente
              </button>
            ) : null}
          </details>
        )}
        <QueryState query={query}>
          {tab === "recebiveis" && query.data?.resumo ? (
            <Kpis
              items={[
                {
                  label: "Recebido nos filtros",
                  value: query.data.resumo.recebido,
                  color: "green",
                },
                {
                  label: "A receber nos filtros",
                  value: query.data.resumo.pendente,
                },
                {
                  label: "Em atraso nos filtros",
                  value: query.data.resumo.atrasado,
                  color: "red",
                },
              ]}
            />
          ) : null}
          <Table rows={query.data?.data} columns={columns} />
          <Pagination data={query.data} page={page} onPage={setPage} />
        </QueryState>
        {tab === "recebiveis" ? (
          <p className="muted" style={{ marginTop: 20 }}>
            Os totais consideram todos os registros filtrados. Juros e multa são
            estimativas; o pagamento do contrato registra somente o principal.
          </p>
        ) : tab === "despesas" ? (
          <p className="muted" style={{ marginTop: 20 }}>
            Despesas pagas preservam valor, data e status. Descrição, categoria
            e observações continuam editáveis.
          </p>
        ) : null}
      </section>
      {modal ? (
        <Modal
          title={
            {
              create: "Nova despesa",
              edit: "Editar despesa",
              delete: "Excluir despesa",
              pay: "Marcar despesa paga",
            }[modal.mode]
          }
          onClose={() => setModal(null)}
        >
          {modal.mode === "delete" ? (
            <>
              <p>Excluir a despesa {modal.row.descricao}?</p>
              <Formulario
                fields={[]}
                submitLabel="Confirmar exclusão"
                onSubmit={() => api.delete("/despesas/" + modal.row.id)}
                onSuccess={() => salvo("Despesa excluída.")}
              />
            </>
          ) : modal.mode === "pay" ? (
            <Formulario
              fields={[
                {
                  name: "data",
                  label: "Data do pagamento",
                  type: "date",
                  required: true,
                },
              ]}
              initial={{ data: hoje() }}
              submitLabel="Confirmar despesa paga"
              onSubmit={(values) =>
                api.patch("/despesas/" + modal.row.id, {
                  ...values,
                  status: "PAGA",
                })
              }
              onSuccess={() => salvo("Despesa marcada como paga.")}
            />
          ) : (
            <Formulario
              fields={expenseFields.map((field) => ({
                ...field,
                disabled:
                  modal.row?.status === "PAGA" &&
                  ["valor", "data", "status"].includes(field.name),
              }))}
              initial={modal.row || { data: hoje(), status: "PENDENTE" }}
              onSubmit={(values) =>
                modal.mode === "create"
                  ? api.post("/despesas", values)
                  : api.put("/despesas/" + modal.row.id, values)
              }
              onSuccess={() => salvo("Despesa salva.")}
            />
          )}
        </Modal>
      ) : null}
    </>
  );
}
