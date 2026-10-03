import { useState } from "react";
import useConsulta from "../hooks/useConsulta";
import { Pagination, QueryState } from "./ui";

export default function ClientePicker({ selected, onSelect }) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = useConsulta("/clientes", { q, page, limit: 10 });
  function buscar() {
    setQ(search.trim());
    setPage(1);
  }
  return (
    <div className="wide stack">
      <strong>Cliente *</strong>
      {selected ? (
        <p className="muted">Selecionado: {selected.nome_razao_social}</p>
      ) : null}
      <div className="search">
        <input
          aria-label="Buscar cliente"
          placeholder="Nome, CPF/CNPJ ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              buscar();
            }
          }}
        />
        <button type="button" className="button secondary" onClick={buscar}>
          Buscar clientes
        </button>
      </div>
      <QueryState query={query}>
        <div className="selection-list">
          {(query.data?.data || []).map((cliente) => (
            <button
              type="button"
              key={cliente.id}
              className={selected?.id === cliente.id ? "selected" : ""}
              onClick={() => onSelect(cliente)}
            >
              <span>
                {cliente.nome_razao_social}
                <br />
                <small>{cliente.cpf_cnpj}</small>
              </span>
              <span>
                {selected?.id === cliente.id ? "Selecionado" : "Selecionar"}
              </span>
            </button>
          ))}
        </div>
        <Pagination data={query.data} page={page} onPage={setPage} />
      </QueryState>
    </div>
  );
}
