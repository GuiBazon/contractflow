import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useConsulta from "../hooks/useConsulta";
import { api, mensagemErro } from "../axios/axios";
import ClientePicker from "../components/ClientePicker";
import ContractFields from "../components/ContractFields";
import { Field, Notice, PageTitle, QueryState } from "../components/ui";
import { payloadContrato, valoresContrato } from "../utils/contrato";

export default function ImportarContrato() {
  const [params, setParams] = useSearchParams();
  const id = params.get("extracao");
  const query = useConsulta(id ? "/ocr/" + id : "/health");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  async function extrair(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const dados = new FormData(event.currentTarget);
    const file = dados.get("arquivo");
    if (!file?.size || file.size > 10 * 1024 * 1024) {
      setError("Selecione um PDF ou imagem de até 10 MB.");
      setBusy(false);
      return;
    }
    try {
      const response = await api.post("/ocr/extract", dados, {
        timeout: 660000,
      });
      setWarning(response.data.aviso || "");
      setParams({ extracao: response.data.extracao_id });
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Importar contrato"
        subtitle="Leia um documento e confira os dados antes de criar o contrato."
      >
        <Link className="button secondary" to="/contratos">
          Voltar
        </Link>
      </PageTitle>
      <div className="stepper">
        <span className={!id ? "active" : ""}>1. Selecionar documento</span>
        <span className={id ? "active" : ""}>2. Revisar dados</span>
        <span>3. Confirmar importação</span>
      </div>
      {!id ? (
        <section className="panel">
          <form className="upload" onSubmit={extrair}>
            <h2>Selecione o documento do contrato</h2>
            <p className="muted">
              PDF, JPEG, PNG ou WebP, até 10 MB. PDFs escaneados podem ter até
              10 páginas.
            </p>
            <Field
              label="Arquivo do contrato"
              name="arquivo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required
              disabled={busy}
            />
            <button className="button primary" disabled={busy}>
              {busy ? "Lendo documento…" : "Extrair dados"}
            </button>
            {busy ? (
              <p className="muted" style={{ marginTop: 20 }} role="status">
                A leitura pode levar alguns minutos. Aguarde antes de enviar
                outro arquivo.
              </p>
            ) : null}
            <Notice error>{error}</Notice>
          </form>
        </section>
      ) : (
        <QueryState query={query}>
          {query.data?.status === "CONFIRMADA" ? (
            <section className="panel">
              <h2>Importação já confirmada</h2>
              <p>O contrato desta extração já foi criado.</p>
              <Link to="/contratos">Ver contratos</Link>
            </section>
          ) : query.data ? (
            <Revisao
              key={id}
              extracao={query.data}
              id={id}
              warning={warning}
              onSave={query.reload}
            />
          ) : null}
        </QueryState>
      )}
    </>
  );
}
function Revisao(props) {
  const clientId = props.extracao.dados.cliente_id;
  const query = useConsulta(clientId ? "/clientes/" + clientId : "/health");
  return (
    <QueryState query={query}>
      <FormularioRevisao
        {...props}
        selectedClient={clientId ? query.data : null}
      />
    </QueryState>
  );
}
function FormularioRevisao({ extracao, id, warning, onSave, selectedClient }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() =>
    valoresContrato({
      data_inicio:
        extracao.dados.data_inicio || extracao.dados.vencimentos?.[0] || "",
      quantidade_parcelas:
        extracao.dados.quantidade_parcelas ||
        extracao.dados.vencimentos?.length ||
        "",
      ...extracao.dados,
    }),
  );
  const [mode, setMode] = useState(
    extracao.dados.cliente_id ? "existente" : "novo",
  );
  const [cliente, setCliente] = useState(selectedClient);
  const [nome, setNome] = useState(
    extracao.dados.cliente_novo?.nome_razao_social ||
      extracao.dados.cliente_nome ||
      "",
  );
  const [cpf, setCpf] = useState(
    extracao.dados.cliente_novo?.cpf_cnpj || extracao.dados.cpf_cnpj || "",
  );
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function salvar(event) {
    event.preventDefault();
    const confirm = event.nativeEvent.submitter?.value === "confirmar";
    if (confirm && !reviewed) {
      setError("Confirme que conferiu os dados antes de criar o contrato.");
      return;
    }
    if (mode === "existente" && !cliente) {
      setError("Selecione o cliente existente.");
      return;
    }
    const dados = payloadContrato(values);
    if (mode === "existente") dados.cliente_id = cliente.id;
    else dados.cliente_novo = { nome_razao_social: nome, cpf_cnpj: cpf };
    setBusy(true);
    setError("");
    try {
      if (confirm) {
        const response = await api.post("/ocr/" + id + "/confirmar", { dados });
        navigate("/contratos/" + response.data.contrato_id, { replace: true });
      } else {
        await api.patch("/ocr/" + id, { dados });
        onSave();
      }
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }
  async function cancelar() {
    setBusy(true);
    setError("");
    try {
      await api.delete("/ocr/" + id);
      navigate("/contratos");
    } catch (err) {
      setError(mensagemErro(err));
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Confira os dados de {extracao.nome_original}</h2>
      <p className="muted">
        Confiança estimada: {extracao.confianca}%. A leitura automática sugere
        dados; campos não encontrados precisam ser preenchidos e todos os
        valores devem ser conferidos.
      </p>
      {warning ? <p className="muted">{warning}</p> : null}
      <form onSubmit={salvar}>
        <fieldset className="form-grid" disabled={busy}>
          <Field label="Vincular cliente">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="novo">Novo cliente / CPF já cadastrado</option>
              <option value="existente">Selecionar cliente existente</option>
            </select>
          </Field>
          {mode === "novo" ? (
            <>
              <Field
                label="Nome / Razão social"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                required
                maxLength={200}
              />
              <Field
                label="CPF/CNPJ"
                value={cpf}
                onChange={(event) => setCpf(event.target.value)}
                required
                maxLength={18}
              />
            </>
          ) : (
            <ClientePicker selected={cliente} onSelect={setCliente} />
          )}
          <ContractFields
            values={values}
            onChange={(name, value) => {
              setValues((old) => ({ ...old, [name]: value }));
              setReviewed(false);
            }}
          />
          <label className="choice wide">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            Conferi os dados do cliente, o valor, as parcelas e os vencimentos.
          </label>
        </fieldset>
        <Notice error>{error}</Notice>
        <div className="form-actions">
          <button
            className="button danger"
            type="button"
            disabled={busy}
            onClick={cancelar}
          >
            Cancelar importação
          </button>
          <button
            className="button secondary"
            name="acao"
            value="revisar"
            disabled={busy}
          >
            Salvar revisão
          </button>
          <button
            className="button primary"
            name="acao"
            value="confirmar"
            disabled={busy}
          >
            {busy ? "Aguarde…" : "Confirmar importação"}
          </button>
        </div>
      </form>
    </section>
  );
}
