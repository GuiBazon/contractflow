import { useState } from "react";
import { Link } from "react-router-dom";
import { FiUsers, FiFileText, FiDollarSign, FiBarChart2 } from "react-icons/fi";
import useConsulta from "../hooks/useConsulta";
import {
  PageTitle,
  Kpis,
  Periodo,
  QueryState,
  Table,
  Badge,
  Empty,
} from "../components/ui";
import { dinheiro, dataBr } from "../utils/format";

function Fluxo({ rows }) {
  if (!rows.length)
    return <Empty>Nenhuma movimentação financeira registrada.</Empty>;
  const highest = Math.max(
    ...rows.flatMap((row) => [Number(row.receitas), Number(row.despesas)]),
  );
  const max = Math.max(100, Math.ceil((highest * 1.5) / 100) * 100);
  const width = Math.max(560, rows.length * 95);
  const chartWidth = width - 70;
  const groupWidth = chartWidth / rows.length;
  return (
    <div className="table-scroll" style={{ border: 0 }}>
      <svg
        className="chart"
        viewBox={"0 0 " + width + " 240"}
        role="img"
        aria-label="Receitas e despesas por mês"
        style={{ minWidth: width }}
      >
        {[0, 1, 2, 3, 4].map((tick) => (
          <g key={tick}>
            <line
              x1={42}
              x2={width - 10}
              y1={200 - tick * 44}
              y2={200 - tick * 44}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
            <text x={34} y={204 - tick * 44} textAnchor="end">
              {Math.round((max * tick) / 4)}
            </text>
          </g>
        ))}
        {rows.map((row, index) => {
          const x = 42 + groupWidth * index + groupWidth / 2;
          const bar = Math.min(68, groupWidth / 3);
          const incomeHeight = (Number(row.receitas) / max) * 176;
          const expenseHeight = (Number(row.despesas) / max) * 176;
          const month = new Date(row.mes + "-02T12:00:00")
            .toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
            .replace(".", "");
          return (
            <g key={row.mes}>
              <rect
                x={x - bar / 2}
                y={200 - incomeHeight}
                width={bar}
                height={incomeHeight}
                rx={2}
                fill="#2563eb"
              />
              <rect
                x={x + bar / 2 + 4}
                y={200 - expenseHeight}
                width={bar}
                height={expenseHeight}
                rx={2}
                fill="#f97316"
              />
              <text
                x={x}
                y={192 - incomeHeight}
                textAnchor="middle"
                style={{ fill: "#334155", fontWeight: 600 }}
              >
                {dinheiro(row.receitas)}
              </text>
              <text x={x} y={223} textAnchor="middle">
                {month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
export default function Dashboard() {
  const [period, setPeriod] = useState({});
  const query = useConsulta("/dashboard", period);
  const data = query.data || {};
  return (
    <>
      <PageTitle
        title="Visão geral"
        subtitle="Acompanhe seus contratos e o fluxo financeiro."
      >
        <Link className="button secondary" to="/contratos/importar">
          Importar contrato
        </Link>
        <Link className="button primary" to="/contratos/novo">
          Novo contrato
        </Link>
      </PageTitle>
      <Periodo value={period} onChange={setPeriod} />
      <QueryState query={query}>
        <Kpis
          items={[
            { label: "A receber", value: data.pendente },
            { label: "Recebido", value: data.recebido, color: "green" },
            { label: "Em atraso", value: data.atrasado, color: "red" },
            { label: "Saldo projetado", value: data.saldo_projetado },
          ]}
        />
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Fluxo financeiro</h2>
              <div className="legend">
                <span>Receitas</span>
                <span>Despesas</span>
              </div>
            </div>
            <Fluxo rows={data.fluxo_mensal || []} />
          </section>
          <section className="panel">
            <h2>Resumo</h2>
            <div className="summary-row">
              <span className="actions">
                <FiUsers />
                {data.clientes} cliente{data.clientes === 1 ? "" : "s"}
              </span>
            </div>
            <div className="summary-row">
              <span className="actions">
                <FiFileText />
                {data.contratos_ativos} contrato
                {data.contratos_ativos === 1 ? "" : "s"} ativo
                {data.contratos_ativos === 1 ? "" : "s"}
              </span>
            </div>
            <div className="summary-row">
              <span className="actions">
                <FiDollarSign />
                Despesas pagas
              </span>
              <strong>{dinheiro(data.despesas_pagas)}</strong>
            </div>
            <div className="summary-row">
              <span className="actions">
                <FiDollarSign />
                Despesas pendentes
              </span>
              <strong>{dinheiro(data.despesas_pendentes)}</strong>
            </div>
            <div className="summary-row">
              <span className="actions">
                <FiBarChart2 />
                Saldo realizado
              </span>
              <strong style={{ color: "#2563eb" }}>
                {dinheiro(data.saldo_realizado)}
              </strong>
            </div>
            <p className="summary-note">
              Saldo calculado com os registros do sistema.
            </p>
          </section>
        </div>
        <section className="panel">
          <div className="panel-heading">
            <h2>Próximos vencimentos</h2>
            <Link to="/financeiro">Ver recebíveis</Link>
          </div>
          <Table
            rows={data.proximos_vencimentos || []}
            empty="Nenhum vencimento próximo."
            columns={[
              { key: "cliente_nome", label: "Cliente" },
              { key: "contrato_numero", label: "Contrato" },
              { key: "numero", label: "Parcela" },
              {
                key: "data_vencimento",
                label: "Vencimento",
                render: (row) => dataBr(row.data_vencimento),
              },
              {
                key: "pendente",
                label: "Saldo",
                render: (row) => dinheiro(row.pendente),
              },
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
            ]}
          />
        </section>
      </QueryState>
    </>
  );
}
