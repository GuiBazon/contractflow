import { cloneElement, useEffect, useId, useRef, useState } from "react";
import {
  FiArrowDownLeft,
  FiCheckCircle,
  FiClock,
  FiBarChart2,
  FiSearch,
  FiX,
  FiInbox,
} from "react-icons/fi";
import { mensagemErro } from "../axios/axios";
import { dinheiro, labels } from "../utils/format";

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Notice({ error, children }) {
  return children ? (
    <div
      className={"notice " + (error ? "notice-error" : "notice-success")}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;
}
export function QueryState({ query, children }) {
  if (query.loading)
    return (
      <div className="loading" role="status">
        <span className="spinner" />
        Carregando…
      </div>
    );
  if (query.error)
    return (
      <Notice error>
        {query.error}{" "}
        <button type="button" className="text-button" onClick={query.reload}>
          Tentar novamente
        </button>
      </Notice>
    );
  return children;
}
export function Empty({ children = "Nenhum registro encontrado." }) {
  return (
    <div className="empty">
      <FiInbox size={32} />
      <p>{children}</p>
    </div>
  );
}
export function Badge({ value }) {
  return (
    <span className={"badge badge-" + String(value).toLowerCase()}>
      {labels[value] || value || "—"}
    </span>
  );
}
export function Field({ label, children, ...props }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {props.required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children ? (
        cloneElement(children, { id, "aria-label": label })
      ) : (
        <input id={id} aria-label={label} {...props} />
      )}
    </label>
  );
}
export function Search({ placeholder, onSearch }) {
  return (
    <form
      className="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(new FormData(event.currentTarget).get("busca").trim());
      }}
    >
      <FiSearch />
      <input
        name="busca"
        aria-label={placeholder || "Pesquisar"}
        placeholder={placeholder || "Pesquisar"}
      />
      <button className="button secondary" type="submit">
        Buscar
      </button>
    </form>
  );
}
export function Pagination({ data, page, onPage }) {
  if (!data?.paginacao) return null;
  const { total, totalPages } = data.paginacao;
  return (
    <div className="pagination">
      <span>
        {total} registro{total === 1 ? "" : "s"} · Página{" "}
        {totalPages ? page : 0} de {totalPages || 0}
      </span>
      <div className="actions">
        <button
          type="button"
          className="button secondary"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
export function Table({ columns, rows = [], empty }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id ?? row.numero}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : (row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const kpiIcons = [FiArrowDownLeft, FiCheckCircle, FiClock, FiBarChart2];
export function Kpis({ items }) {
  return (
    <div className="kpis">
      {items.map((item, index) => {
        const Icon = kpiIcons[index % kpiIcons.length];
        return (
          <div key={item.label} className={"kpi " + (item.color || "")}>
            <div>
              <span>{item.label}</span>
              <strong>{dinheiro(item.value)}</strong>
            </div>
            <div className="kpi-icon">
              <Icon />
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <FiX />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Formulario({
  fields,
  initial = {},
  onSubmit,
  submitLabel = "Salvar",
  children,
  onSuccess,
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function salvar(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {};
    for (const field of fields) {
      if (field.disabled || !formData.has(field.name)) continue;
      const value = formData.get(field.name);
      values[field.name] =
        value === "" ? null : field.type === "number" ? Number(value) : value;
    }
    setBusy(true);
    setError("");
    try {
      const result = await onSubmit(values);
      onSuccess?.(result);
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={salvar}>
      <fieldset disabled={busy} className="form-grid">
        {fields.map(({ label, options, textarea, ...field }) => (
          <Field key={field.name} label={label} required={field.required}>
            {options ? (
              <select {...field} defaultValue={initial[field.name] ?? ""}>
                {options.map((option) => (
                  <option
                    key={option.value ?? option}
                    value={option.value ?? option}
                  >
                    {option.label ?? option}
                  </option>
                ))}
              </select>
            ) : textarea ? (
              <textarea
                {...field}
                defaultValue={initial[field.name] ?? ""}
                rows={3}
              />
            ) : (
              <input {...field} defaultValue={initial[field.name] ?? ""} />
            )}
          </Field>
        ))}
        {children}
      </fieldset>
      <Notice error>{error}</Notice>
      <div className="form-actions">
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
export function Periodo({ value, onChange }) {
  const [mode, setMode] = useState(value.de || value.ate ? "custom" : "all");
  return (
    <div className="period">
      <Field label="Período">
        <select
          value={mode}
          onChange={(event) => {
            setMode(event.target.value);
            if (event.target.value === "all") onChange({});
          }}
        >
          <option value="all">Todo o histórico</option>
          <option value="custom">Personalizado</option>
        </select>
      </Field>
      {mode === "custom" ? (
        <>
          <Field
            label="De"
            type="date"
            value={value.de || ""}
            onChange={(event) => onChange({ ...value, de: event.target.value })}
          />
          <Field
            label="Até"
            type="date"
            min={value.de}
            value={value.ate || ""}
            onChange={(event) =>
              onChange({ ...value, ate: event.target.value })
            }
          />
        </>
      ) : null}
    </div>
  );
}
