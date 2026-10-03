import { useState } from "react";
import { api } from "../axios/axios";
import { Formulario, Kpis, PageTitle, Table } from "../components/ui";
import { dataBr, dinheiro, hoje } from "../utils/format";
const charges = [
  {
    name: "juros_percentual",
    label: "Juros mensais (%)",
    type: "number",
    min: 0,
    max: 100,
    step: "0.01",
  },
  {
    name: "multa_percentual",
    label: "Multa (%)",
    type: "number",
    min: 0,
    max: 100,
    step: "0.01",
  },
  {
    name: "dias_atraso",
    label: "Dias de atraso",
    type: "number",
    min: 0,
    max: 36500,
    step: 1,
  },
];
const definitions = {
  parcelas: [
    {
      name: "valor_total",
      label: "Valor total (R$)",
      type: "number",
      min: "0.01",
      step: "0.01",
      required: true,
    },
    {
      name: "quantidade_parcelas",
      label: "Quantidade de parcelas",
      type: "number",
      min: 1,
      max: 120,
      step: 1,
      required: true,
    },
    {
      name: "data_inicio",
      label: "Primeiro vencimento",
      type: "date",
      required: true,
    },
    ...charges,
  ],
  saldo: [
    {
      name: "valor",
      label: "Principal (R$)",
      type: "number",
      min: 0,
      step: "0.01",
      required: true,
    },
    {
      name: "valor_pago",
      label: "Já pago (R$)",
      type: "number",
      min: 0,
      step: "0.01",
    },
    ...charges,
  ],
  projecao: [
    "recebido",
    "pendente",
    "despesas_pagas",
    "despesas_pendentes",
  ].map((name, index) => ({
    name,
    label: [
      "Recebido (R$)",
      "A receber (R$)",
      "Despesas pagas (R$)",
      "Despesas pendentes (R$)",
    ][index],
    type: "number",
    min: 0,
    step: "0.01",
  })),
};
export default function Calculadora() {
  const [tab, setTab] = useState("parcelas");
  return (
    <>
      <PageTitle
        title="Calculadora"
        subtitle="Simule parcelas, encargos e projeções antes de decidir."
      />
      <div className="tabs">
        {[
          ["parcelas", "Parcelamento"],
          ["saldo", "Saldo e encargos"],
          ["projecao", "Projeção"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <Simulacao key={tab} tab={tab} />
    </>
  );
}
function Simulacao({ tab }) {
  const [result, setResult] = useState(null);
  const summary = result?.resumo || result;
  return (
    <>
      <section className="panel">
        <Formulario
          fields={definitions[tab]}
          initial={{
            data_inicio: hoje(),
            quantidade_parcelas: 1,
            juros_percentual: 0,
            multa_percentual: 0,
            dias_atraso: 0,
            valor_pago: 0,
            recebido: 0,
            pendente: 0,
            despesas_pagas: 0,
            despesas_pendentes: 0,
          }}
          submitLabel="Calcular"
          onSubmit={(values) => api.post("/calculadora/" + tab, values)}
          onSuccess={(response) => setResult(response.data)}
        />
        <p className="muted" style={{ marginTop: 20 }}>
          A simulação não cria contratos nem registra pagamentos. Encargos são
          estimados sobre saldo em aberto; a primeira parcela vence na data
          informada.
        </p>
      </section>
      {summary ? (
        <section className="panel">
          <h2>Resultado da simulação</h2>
          <Kpis
            items={
              tab === "projecao"
                ? [
                    {
                      label: "Saldo realizado",
                      value: summary.saldo_realizado,
                    },
                    {
                      label: "Saldo projetado",
                      value: summary.saldo_projetado,
                    },
                  ]
                : [
                    {
                      label:
                        tab === "saldo"
                          ? "Principal pendente"
                          : "Principal total",
                      value: summary.pendente ?? summary.valor_total,
                    },
                    { label: "Juros estimados", value: summary.juros },
                    { label: "Multa estimada", value: summary.multa },
                    {
                      label: "Total com encargos",
                      value: summary.total_atualizado,
                    },
                  ]
            }
          />
          {result.parcelas ? (
            <Table
              rows={result.parcelas}
              columns={[
                { key: "numero", label: "Parcela" },
                {
                  key: "data_vencimento",
                  label: "Vencimento",
                  render: (row) => dataBr(row.data_vencimento),
                },
                {
                  key: "valor",
                  label: "Principal",
                  render: (row) => dinheiro(row.valor),
                },
                {
                  key: "juros",
                  label: "Juros",
                  render: (row) => dinheiro(row.juros),
                },
                {
                  key: "multa",
                  label: "Multa",
                  render: (row) => dinheiro(row.multa),
                },
                {
                  key: "total_atualizado",
                  label: "Total estimado",
                  render: (row) => dinheiro(row.total_atualizado),
                },
              ]}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}
