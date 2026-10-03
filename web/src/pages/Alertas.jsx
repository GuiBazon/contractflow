import { useState } from "react";
import { Link } from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import {
  Badge,
  Field,
  PageTitle,
  Pagination,
  QueryState,
  Table,
} from "../components/ui";
import { dataBr, dinheiro } from "../utils/format";
export default function Alertas() {
  const [dias, setDias] = useState(7);
  const [page, setPage] = useState(1);
  const query = useConsulta("/alertas", { dias, page, limit: 20 });
  return (
    <>
      <PageTitle
        title="Alertas"
        subtitle="Pendências, próximos vencimentos e contratos próximos do término."
      />
      <section className="panel">
        <div className="toolbar">
          <Field label="Próximos dias">
            <select
              value={dias}
              onChange={(event) => {
                setDias(Number(event.target.value));
                setPage(1);
              }}
            >
              {[7, 15, 30, 60, 90].map((value) => (
                <option key={value} value={value}>
                  {value} dias
                </option>
              ))}
            </select>
          </Field>
          <button className="button secondary" onClick={query.reload}>
            Atualizar
          </button>
        </div>
        <QueryState query={query}>
          <Table
            rows={query.data?.data}
            columns={[
              {
                key: "tipo",
                label: "Alerta",
                render: (row) => <Badge value={row.tipo} />,
              },
              { key: "cliente_nome", label: "Cliente" },
              { key: "contrato_numero", label: "Contrato" },
              { key: "data", label: "Data", render: (row) => dataBr(row.data) },
              {
                key: "valor",
                label: "Saldo",
                render: (row) => dinheiro(row.valor),
              },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <Link to={"/contratos/" + row.contrato_id}>Abrir</Link>
                ),
              },
            ]}
          />
          <Pagination data={query.data} page={page} onPage={setPage} />
        </QueryState>
        <p className="muted" style={{ marginTop: 20 }}>
          Alertas calculados ao consultar a tela. Não há envio de e-mail ou
          notificações push.
        </p>
      </section>
    </>
  );
}
