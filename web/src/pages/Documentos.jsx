import { useState } from "react";
import { Link } from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import { baixarArquivo, mensagemErro } from "../axios/axios";
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
import { dataBr } from "../utils/format";
export default function Documentos() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState("");
  const [period, setPeriod] = useState({});
  const [error, setError] = useState("");
  const query = useConsulta("/documentos", {
    q,
    page,
    tipo,
    ...period,
    limit: 20,
  });
  async function baixar(row) {
    setError("");
    try {
      await baixarArquivo(
        "/contratos/" + row.contrato_id + "/documentos/" + row.id + "/arquivo",
        row.nome_original,
      );
    } catch (err) {
      setError(mensagemErro(err));
    }
  }
  return (
    <>
      <PageTitle
        title="Documentos"
        subtitle="Encontre documentos originais e anexos dos seus contratos."
      >
        <Link className="button primary" to="/contratos/importar">
          Importar contrato
        </Link>
      </PageTitle>
      <Notice error>{error}</Notice>
      <section className="panel">
        <div className="toolbar">
          <Search
            placeholder="Pesquisar documentos"
            onSearch={(value) => {
              setQ(value);
              setPage(1);
            }}
          />
          <Field label="Tipo">
            <select
              value={tipo}
              onChange={(event) => {
                setTipo(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="ORIGINAL">Original</option>
              <option value="ANEXO">Anexo</option>
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
              { key: "nome_original", label: "Arquivo" },
              {
                key: "contrato_numero",
                label: "Contrato",
                render: (row) => (
                  <Link to={"/contratos/" + row.contrato_id}>
                    {row.contrato_numero}
                  </Link>
                ),
              },
              {
                key: "tipo",
                label: "Tipo",
                render: (row) => <Badge value={row.tipo} />,
              },
              {
                key: "created_at",
                label: "Enviado em",
                render: (row) => dataBr(row.created_at),
              },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <button className="text-button" onClick={() => baixar(row)}>
                    Baixar
                  </button>
                ),
              },
            ]}
          />
          <Pagination data={query.data} page={page} onPage={setPage} />
        </QueryState>
      </section>
    </>
  );
}
