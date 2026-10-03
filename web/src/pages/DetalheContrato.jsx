import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import { api } from "../axios/axios";
import {
  Badge,
  Field,
  Formulario,
  Kpis,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  QueryState,
  Table,
} from "../components/ui";
import PagamentoForm from "../components/PagamentoForm";
import DocumentosContrato from "../components/DocumentosContrato";
import { dataBr, dinheiro, labels } from "../utils/format";

function Pagamentos({ id }) {
  const [page, setPage] = useState(1);
  const query = useConsulta("/contratos/" + id + "/pagamentos", {
    page,
    limit: 20,
  });
  return (
    <QueryState query={query}>
      <Table
        rows={query.data?.data}
        columns={[
          {
            key: "data_pagamento",
            label: "Data",
            render: (row) => dataBr(row.data_pagamento),
          },
          { key: "parcela_numero", label: "Parcela" },
          {
            key: "valor",
            label: "Valor",
            render: (row) => dinheiro(row.valor),
          },
          { key: "forma_pagamento", label: "Forma" },
          { key: "observacoes", label: "Observações" },
        ]}
      />
      <Pagination data={query.data} page={page} onPage={setPage} />
    </QueryState>
  );
}
function Historico({ id }) {
  const query = useConsulta("/contratos/" + id + "/historico");
  return (
    <QueryState query={query}>
      <ol className="timeline">
        {(query.data || []).map((row) => (
          <li key={row.id}>
            <strong>{row.acao.replaceAll("_", " ")}</strong>
            <p>{row.descricao}</p>
            <small>{dataBr(row.created_at)}</small>
          </li>
        ))}
      </ol>
    </QueryState>
  );
}
export default function DetalheContrato() {
  const { id } = useParams();
  const query = useConsulta("/contratos/" + id);
  const parcelas = useConsulta("/contratos/" + id + "/parcelas");
  const [tab, setTab] = useState("parcelas");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const row = query.data;
  function salvo(message = "Dados atualizados.") {
    setModal(null);
    query.reload();
    parcelas.reload();
    setNotice(message);
  }
  return (
    <>
      <PageTitle
        title={row?.numero || "Contrato"}
        subtitle={
          row?.cliente_nome || "Dados, parcelas e documentos do contrato."
        }
      >
        <Link className="button secondary" to="/contratos">
          Voltar
        </Link>
        <Link className="button secondary" to={"/contratos/" + id + "/editar"}>
          Editar contrato
        </Link>
        {row && ["ATIVO", "EM_RENOVACAO"].includes(row.status) ? (
          <Link
            className="button secondary"
            to={"/contratos/" + id + "/renovar"}
          >
            Renovar
          </Link>
        ) : null}
        <button
          className="button primary"
          disabled={
            parcelas.loading ||
            !parcelas.data?.data?.some(
              (item) =>
                Number(item.valor) > Number(item.pago) &&
                item.situacao !== "CANCELADA",
            )
          }
          onClick={() => setModal({ type: "payment" })}
        >
          Registrar pagamento
        </button>
      </PageTitle>
      <Notice>{notice}</Notice>
      <QueryState query={query}>
        {row ? (
          <>
            <Kpis
              items={[
                { label: "Valor do contrato", value: row.valor_total },
                {
                  label: "Recebido",
                  value: row.financeiro?.recebido,
                  color: "green",
                },
                { label: "A receber", value: row.financeiro?.pendente },
              ]}
            />
            <section className="panel">
              <dl className="details">
                {[
                  ["Cliente", row.cliente_nome],
                  ["Início", dataBr(row.data_inicio)],
                  ["Término", dataBr(row.data_fim)],
                  ["Forma de pagamento", row.forma_pagamento],
                  ["Juros mensais", String(row.juros_percentual) + "%"],
                  ["Multa", String(row.multa_percentual) + "%"],
                  ["Tipo", row.tipo],
                  ["Descrição", row.descricao],
                  ["Observações", row.observacoes],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              <div className="actions">
                <Badge value={row.status} />
                <button
                  className="text-button"
                  onClick={() => setModal({ type: "status" })}
                >
                  Alterar status
                </button>
                <button
                  className="text-button danger"
                  onClick={() => setModal({ type: "delete" })}
                >
                  Excluir contrato
                </button>
              </div>
            </section>
          </>
        ) : null}
      </QueryState>
      <section className="panel">
        <div className="tabs">
          {["parcelas", "pagamentos", "documentos", "historico"].map((name) => (
            <button
              key={name}
              className={name === tab ? "active" : ""}
              onClick={() => setTab(name)}
            >
              {name === "historico"
                ? "Histórico"
                : name[0].toUpperCase() + name.slice(1)}
            </button>
          ))}
        </div>
        {tab === "parcelas" ? (
          <>
            <div className="panel-heading">
              <h2>Parcelas</h2>
              <button
                className="button secondary small"
                disabled={
                  !row || ["ENCERRADO", "CANCELADO"].includes(row.status)
                }
                onClick={() => setModal({ type: "extra" })}
              >
                Adicionar parcelas
              </button>
            </div>
            <QueryState query={parcelas}>
              <Table
                rows={parcelas.data?.data}
                columns={[
                  { key: "numero", label: "Parcela" },
                  {
                    key: "data_vencimento",
                    label: "Vencimento",
                    render: (item) => dataBr(item.data_vencimento),
                  },
                  {
                    key: "valor",
                    label: "Valor",
                    render: (item) => dinheiro(item.valor),
                  },
                  {
                    key: "pago",
                    label: "Pago",
                    render: (item) => dinheiro(item.pago),
                  },
                  {
                    key: "saldo",
                    label: "Saldo",
                    render: (item) =>
                      dinheiro(
                        item.situacao === "CANCELADA"
                          ? 0
                          : Number(item.valor) - Number(item.pago),
                      ),
                  },
                  {
                    key: "situacao",
                    label: "Situação",
                    render: (item) => <Badge value={item.situacao} />,
                  },
                  {
                    key: "actions",
                    label: "Ações",
                    render: (item) => (
                      <div className="actions">
                        {Number(item.valor) > Number(item.pago) &&
                        item.situacao !== "CANCELADA" ? (
                          <button
                            className="text-button"
                            onClick={() =>
                              setModal({ type: "payment", parcelaId: item.id })
                            }
                          >
                            Pagar
                          </button>
                        ) : null}
                        <button
                          className="text-button"
                          onClick={() =>
                            setModal({ type: "installment", row: item })
                          }
                        >
                          Editar
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </QueryState>
          </>
        ) : tab === "pagamentos" ? (
          <Pagamentos id={id} />
        ) : tab === "documentos" ? (
          <DocumentosContrato contratoId={id} />
        ) : (
          <Historico id={id} />
        )}
      </section>
      {modal ? (
        <Modal
          title={
            {
              payment: "Registrar pagamento",
              installment: "Editar parcela",
              status: "Alterar status",
              extra: "Adicionar parcelas",
              delete: "Excluir contrato",
            }[modal.type]
          }
          onClose={() => setModal(null)}
        >
          {modal.type === "payment" ? (
            <PagamentoForm
              contratoId={id}
              parcelas={parcelas.data?.data || []}
              initialId={modal.parcelaId}
              onSuccess={() =>
                salvo("Pagamento registrado e saldo atualizado.")
              }
            />
          ) : modal.type === "installment" ? (
            <Formulario
              initial={modal.row}
              fields={[
                {
                  name: "valor",
                  label: "Valor (R$)",
                  type: "number",
                  step: "0.01",
                  min: 0,
                  required: true,
                  disabled: Number(modal.row.pago) > 0,
                },
                {
                  name: "data_vencimento",
                  label: "Vencimento",
                  type: "date",
                  required: true,
                },
                {
                  name: "status",
                  label: "Status",
                  options:
                    Number(modal.row.pago) > 0
                      ? [
                          {
                            value: modal.row.status,
                            label: labels[modal.row.status],
                          },
                        ]
                      : [
                          { value: "PENDENTE", label: "Pendente" },
                          { value: "CANCELADA", label: "Cancelada" },
                        ],
                  disabled: Number(modal.row.pago) > 0,
                },
              ]}
              onSubmit={(values) =>
                api.patch(
                  "/contratos/" + id + "/parcelas/" + modal.row.id,
                  values,
                )
              }
              onSuccess={() => salvo("Parcela atualizada.")}
            />
          ) : modal.type === "status" ? (
            <Formulario
              fields={[
                {
                  name: "status",
                  label: "Status do contrato",
                  options: [
                    "ATIVO",
                    "PENDENTE",
                    "ENCERRADO",
                    "CANCELADO",
                    "EM_RENOVACAO",
                  ].map((value) => ({ value, label: labels[value] })),
                },
              ]}
              initial={row}
              onSubmit={(values) =>
                api.patch("/contratos/" + id + "/status", values)
              }
              onSuccess={() =>
                salvo(
                  "Status atualizado. O financeiro registrado foi preservado.",
                )
              }
            />
          ) : modal.type === "extra" ? (
            <>
              <p className="muted">
                Novas parcelas aumentam o valor do contrato. Não redistribuem as
                parcelas anteriores.
              </p>
              <Formulario
                fields={[
                  {
                    name: "quantidade_parcelas",
                    label: "Quantidade adicional",
                    type: "number",
                    min: 1,
                    max: 120,
                    required: true,
                  },
                  {
                    name: "valor_parcela",
                    label: "Valor de cada parcela (R$)",
                    type: "number",
                    min: "0.01",
                    step: "0.01",
                    required: true,
                  },
                  {
                    name: "vencimentosTexto",
                    label: "Datas opcionais, separadas por vírgula",
                  },
                ]}
                onSubmit={({ vencimentosTexto, ...values }) =>
                  api.post("/contratos/" + id + "/parcelas", {
                    ...values,
                    ...(vencimentosTexto
                      ? {
                          vencimentos: vencimentosTexto
                            .split(",")
                            .map((date) => date.trim()),
                        }
                      : {}),
                  })
                }
                onSuccess={() => salvo("Parcelas adicionadas.")}
              />
            </>
          ) : (
            <>
              <p>
                O sistema só permite excluir contratos sem parcelas. Para
                preservar o histórico financeiro de um contrato com parcelas,
                use a alteração de status.
              </p>
              <Formulario
                fields={[]}
                submitLabel="Confirmar exclusão"
                onSubmit={() => api.delete("/contratos/" + id)}
                onSuccess={() => {
                  location.assign("/contratos");
                }}
              />
            </>
          )}
        </Modal>
      ) : null}
    </>
  );
}
