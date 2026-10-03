import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import { api, mensagemErro } from "../axios/axios";
import {
  Badge,
  Field,
  Notice,
  PageTitle,
  Pagination,
  Periodo,
  QueryState,
  Search,
  Table,
} from "../components/ui";
import ClientePicker from "../components/ClientePicker";
import ContractFields from "../components/ContractFields";
import { dinheiro, dataBr, labels } from "../utils/format";
import { payloadContrato, valoresContrato } from "../utils/contrato";

const statuses = [
  "ATIVO",
  "PENDENTE",
  "ENCERRADO",
  "CANCELADO",
  "EM_RENOVACAO",
];
export default function Contratos() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState({});
  const [page, setPage] = useState(1);
  const query = useConsulta("/contratos", {
    q,
    status,
    ...period,
    page,
    limit: 20,
  });
  return (
    <>
      <PageTitle
        title="Contratos"
        subtitle="Acompanhe o acordo, as parcelas e os pagamentos."
      >
        <Link className="button secondary" to="/contratos/importar">
          Importar contrato
        </Link>
        <Link className="button primary" to="/contratos/novo">
          Novo contrato
        </Link>
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          <Search
            placeholder="Pesquisar contratos"
            onSearch={(value) => {
              setQ(value);
              setPage(1);
            }}
          />
          <Field label="Status">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {statuses.map((value) => (
                <option value={value} key={value}>
                  {labels[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Periodo
          value={period}
          onChange={(value) => {
            setPeriod(value);
            setPage(1);
          }}
        />
        <QueryState query={query}>
          <Table
            rows={query.data?.data}
            columns={[
              {
                key: "numero",
                label: "Contrato",
                render: (row) => (
                  <Link to={"/contratos/" + row.id}>{row.numero}</Link>
                ),
              },
              { key: "cliente_nome", label: "Cliente" },
              {
                key: "data_inicio",
                label: "Início",
                render: (row) => dataBr(row.data_inicio),
              },
              {
                key: "valor_total",
                label: "Total",
                render: (row) => dinheiro(row.valor_total),
              },
              {
                key: "recebido",
                label: "Recebido",
                render: (row) => dinheiro(row.recebido),
              },
              {
                key: "pendente",
                label: "A receber",
                render: (row) => dinheiro(row.pendente),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <Badge value={row.status} />,
              },
              {
                key: "actions",
                label: "",
                render: (row) => <Link to={"/contratos/" + row.id}>Abrir</Link>,
              },
            ]}
          />
          <Pagination data={query.data} page={page} onPage={setPage} />
        </QueryState>
      </section>
    </>
  );
}
export function FormContrato({ renewal = false }) {
  const { id } = useParams();
  const query = useConsulta(id ? "/contratos/" + id : "/health");
  const [params] = useSearchParams();
  const clientQuery = useConsulta(
    params.get("cliente") ? "/clientes/" + params.get("cliente") : "/health",
  );
  return (
    <QueryState query={query}>
      <QueryState query={clientQuery}>
        <EditorContrato
          key={id || "novo"}
          original={id ? query.data : null}
          selectedClient={params.get("cliente") ? clientQuery.data : null}
          renewal={renewal}
        />
      </QueryState>
    </QueryState>
  );
}
function EditorContrato({ original, selectedClient, renewal }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() =>
    valoresContrato(
      renewal
        ? {
            ...original,
            numero: original.numero + "-R",
            data_inicio: original.data_fim || valoresContrato().data_inicio,
            data_fim: "",
          }
        : original || {},
    ),
  );
  const [cliente, setCliente] = useState(selectedClient);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = !renewal && Number(original?.financeiro?.recebido) > 0;
  async function salvar(event) {
    event.preventDefault();
    setError("");
    if (!original && !cliente) {
      setError("Selecione um cliente para o contrato.");
      return;
    }
    setBusy(true);
    try {
      const payload = payloadContrato(values);
      if (locked) {
        delete payload.numero;
        delete payload.valor_total;
        delete payload.quantidade_parcelas;
        delete payload.vencimentos;
      }
      let response;
      if (renewal)
        response = await api.post(
          "/contratos/" + original.id + "/renovar",
          payload,
        );
      else if (original)
        response = await api.put("/contratos/" + original.id, payload);
      else
        response = await api.post("/contratos", {
          ...payload,
          cliente_id: cliente.id,
        });
      navigate("/contratos/" + (response.data.contrato?.id || original.id), {
        replace: true,
      });
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title={
          renewal
            ? "Renovar contrato"
            : original
              ? "Editar contrato"
              : "Novo contrato"
        }
        subtitle={
          renewal
            ? "Crie um novo acordo e encerre o contrato de origem."
            : "Preencha os dados para organizar as parcelas."
        }
      >
        <Link
          className="button secondary"
          to={original ? "/contratos/" + original.id : "/contratos"}
        >
          Voltar
        </Link>
      </PageTitle>
      <section className="panel">
        <form onSubmit={salvar}>
          <fieldset className="form-grid" disabled={busy}>
            {original ? (
              <p className="wide muted">
                Cliente:{" "}
                {original.cliente_nome || "Mesmo cliente do contrato de origem"}
                {renewal
                  ? ". Pagamentos e documentos anteriores permanecem na origem."
                  : ""}
              </p>
            ) : (
              <ClientePicker selected={cliente} onSelect={setCliente} />
            )}
            <ContractFields
              values={values}
              onChange={(name, value) =>
                setValues((old) => ({ ...old, [name]: value }))
              }
              locked={locked}
            />
          </fieldset>
          <Notice error>{error}</Notice>
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              {busy
                ? "Salvando…"
                : renewal
                  ? "Confirmar renovação"
                  : "Salvar contrato"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
