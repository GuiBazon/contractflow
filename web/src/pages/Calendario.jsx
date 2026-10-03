import { useState } from "react";
import { Link } from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import { Badge, Empty, Field, PageTitle, QueryState } from "../components/ui";
import { dinheiro, hoje, labels } from "../utils/format";

export default function Calendario() {
  const [month, setMonth] = useState(hoje().slice(0, 7));
  const [day, setDay] = useState(hoje());
  const [tipo, setTipo] = useState("");
  const [year, number] = month.split("-").map(Number);
  const last = new Date(year, number, 0).getDate();
  const query = useConsulta(
    "/calendario",
    { de: month + "-01", ate: month + "-" + last, tipo, limit: 1000 },
    true,
  );
  const events = query.data?.data || [];
  const cells = Array(new Date(year, number - 1, 1).getDay())
    .fill(null)
    .concat(Array.from({ length: last }, (_, index) => index + 1));
  const selected = events.filter((event) => event.data === day);
  const counts = new Map();
  for (const event of events)
    counts.set(event.data, (counts.get(event.data) || 0) + 1);
  function mudar(delta) {
    const date = new Date(year, number - 1 + delta, 1);
    const value =
      date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    setMonth(value);
    setDay(value + "-01");
  }
  return (
    <>
      <PageTitle
        title="Calendário"
        subtitle="Vencimentos, pagamentos, despesas e términos de contrato."
      />
      <div className="toolbar">
        <div className="actions">
          <button className="button secondary" onClick={() => mudar(-1)}>
            Mês anterior
          </button>
          <Field
            label="Mês"
            type="month"
            value={month}
            required
            onChange={(event) => {
              if (event.target.value) {
                setMonth(event.target.value);
                setDay(event.target.value + "-01");
              }
            }}
          />
          <button className="button secondary" onClick={() => mudar(1)}>
            Próximo mês
          </button>
        </div>
        <Field label="Tipo de evento">
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
          >
            <option value="">Todos</option>
            {["VENCIMENTO", "PAGAMENTO", "DESPESA", "RENOVACAO"].map(
              (value) => (
                <option key={value} value={value}>
                  {labels[value]}
                </option>
              ),
            )}
          </select>
        </Field>
      </div>
      <QueryState query={query}>
        <div className="calendar-layout">
          <section className="panel">
            <h2>
              {new Date(year, number - 1, 1).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="calendar-grid">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                (label) => (
                  <span key={label} className="weekday">
                    {label}
                  </span>
                ),
              )}
              {cells.map((value, index) => {
                const date = month + "-" + String(value).padStart(2, "0");
                return value ? (
                  <button
                    key={date}
                    className={"calendar-day " + (date === day ? "active" : "")}
                    aria-label={
                      value + " — " + (counts.get(date) || 0) + " eventos"
                    }
                    aria-pressed={date === day}
                    onClick={() => setDay(date)}
                  >
                    {value}
                    {counts.has(date) ? (
                      <span>
                        {counts.get(date)} evento
                        {counts.get(date) === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <span key={"empty-" + index} />
                );
              })}
            </div>
          </section>
          <section className="panel">
            <h2>Eventos de {day.split("-").reverse().join("/")}</h2>
            {selected.length ? (
              selected.map((event) => (
                <div key={event.id} className="event">
                  <div>
                    <Badge value={event.tipo} />
                    <p>
                      <strong>{event.titulo}</strong>
                    </p>
                    <p>
                      {event.cliente_nome || ""} {event.contrato_numero || ""}
                    </p>
                    <Badge value={event.situacao} />
                  </div>
                  <div className="stack">
                    <strong>{dinheiro(event.valor)}</strong>
                    {event.contrato_id ? (
                      <Link to={"/contratos/" + event.contrato_id}>
                        Abrir contrato
                      </Link>
                    ) : (
                      <Link to="/financeiro?aba=despesas">Ver despesa</Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <Empty>Nenhum evento neste dia.</Empty>
            )}
          </section>
        </div>
        <p className="muted">
          {events.length} eventos no mês. Parcelas pagas ou canceladas não
          aparecem como vencimentos em aberto.
        </p>
      </QueryState>
    </>
  );
}
