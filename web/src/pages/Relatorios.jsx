import { useState } from "react";
import useConsulta from "../hooks/useConsulta";
import { baixarArquivo, mensagemErro } from "../axios/axios";
import {
  Badge,
  Field,
  Kpis,
  Notice,
  PageTitle,
  Pagination,
  Periodo,
  QueryState,
  Table,
} from "../components/ui";
import { dataBr, dinheiro } from "../utils/format";
const money = (key, label) => ({
  key,
  label,
  render: (row) => dinheiro(row[key]),
});
const date = (key, label) => ({
  key,
  label,
  render: (row) => dataBr(row[key]),
});
const columns = {
  contratos: [
    { key: "numero", label: "Contrato" },
    { key: "cliente_nome", label: "Cliente" },
    money("valor_total", "Total"),
    date("data_inicio", "Início"),
    date("data_fim", "Término"),
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} />,
    },
  ],
  despesas: [
    { key: "descricao", label: "Descrição" },
    { key: "categoria", label: "Categoria" },
    money("valor", "Valor"),
    date("data", "Data"),
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} />,
    },
  ],
  receitas: [
    { key: "cliente_nome", label: "Cliente" },
    { key: "contrato_numero", label: "Contrato" },
    money("valor", "Recebido"),
    date("data_pagamento", "Pagamento"),
    { key: "forma_pagamento", label: "Forma" },
  ],
  recebiveis: [
    { key: "cliente_nome", label: "Cliente" },
    { key: "contrato_numero", label: "Contrato" },
    { key: "numero", label: "Parcela" },
    date("data_vencimento", "Vencimento"),
    money("pago", "Pago"),
    money("pendente", "Saldo"),
    money("total_atualizado", "Com encargos estimados"),
    {
      key: "situacao",
      label: "Situação",
      render: (row) => <Badge value={row.situacao} />,
    },
  ],
};
export default function Relatorios() {
  const [tipo, setTipo] = useState("financeiro");
  const [period, setPeriod] = useState({});
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useConsulta("/relatorios/" + tipo, {
    ...period,
    page,
    limit: 20,
  });
  async function exportar(formato) {
    setBusy(true);
    setError("");
    try {
      await baixarArquivo(
        "/relatorios/" + tipo,
        "contractflow-" + tipo + "." + formato,
        { ...period, formato },
      );
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }
  const summary = query.data?.resumo;
  return (
    <>
      <PageTitle
        title="Relatórios"
        subtitle="Consulte o período e exporte todos os registros filtrados."
      >
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => exportar("csv")}
        >
          Exportar CSV
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => exportar("xlsx")}
        >
          Exportar XLSX
        </button>
      </PageTitle>
      <Notice error>{error}</Notice>
      <section className="panel">
        <div className="toolbar">
          <Field label="Relatório">
            <select
              value={tipo}
              onChange={(event) => {
                setTipo(event.target.value);
                setPage(1);
              }}
            >
              {[
                ["financeiro", "Resumo financeiro"],
                ["recebiveis", "Recebíveis"],
                ["receitas", "Receitas"],
                ["despesas", "Despesas"],
                ["contratos", "Contratos"],
              ].map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Periodo
            value={period}
            onChange={(value) => {
              setPeriod(value);
              setPage(1);
            }}
          />
        </div>
        <QueryState query={query}>
          {tipo === "financeiro" && summary ? (
            <>
              <Kpis
                items={[
                  {
                    label: "Recebido",
                    value: summary.recebido,
                    color: "green",
                  },
                  { label: "A receber", value: summary.pendente },
                  {
                    label: "Despesas pagas",
                    value: summary.despesas_pagas,
                    color: "red",
                  },
                  { label: "Saldo projetado", value: summary.saldo_projetado },
                ]}
              />
              <dl className="details">
                <div>
                  <dt>Saldo realizado</dt>
                  <dd>{dinheiro(summary.saldo_realizado)}</dd>
                </div>
                <div>
                  <dt>Despesas pendentes</dt>
                  <dd>{dinheiro(summary.despesas_pendentes)}</dd>
                </div>
                <div>
                  <dt>Em atraso</dt>
                  <dd>{dinheiro(summary.atrasado)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <Table rows={query.data?.data} columns={columns[tipo] || []} />
              <Pagination data={query.data} page={page} onPage={setPage} />
            </>
          )}
        </QueryState>
        <p className="muted" style={{ marginTop: 20 }}>
          A tela é paginada. A exportação inclui todos os resultados dos
          filtros, até 10.000 registros. O saldo utiliza os registros do
          sistema, sem saldo bancário inicial.
        </p>
      </section>
    </>
  );
}
