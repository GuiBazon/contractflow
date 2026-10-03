import { useState } from "react";
import useConsulta from "../hooks/useConsulta";
import { api, baixarArquivo, mensagemErro } from "../axios/axios";
import { dataBr } from "../utils/format";
import {
  Badge,
  Field,
  Formulario,
  Modal,
  Notice,
  QueryState,
  Table,
} from "./ui";

export default function DocumentosContrato({ contratoId }) {
  const path = "/contratos/" + contratoId + "/documentos";
  const query = useConsulta(path);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(null);
  const [notice, setNotice] = useState("");
  async function enviar(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("arquivo");
    if (!file?.size || file.size > 10 * 1024 * 1024) {
      setError("Selecione um PDF ou imagem de até 10 MB.");
      setBusy(false);
      return;
    }
    try {
      await api.post(path, data, { timeout: 60000 });
      form.reset();
      setNotice("Documento anexado.");
      query.reload();
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }
  async function baixar(row) {
    setError("");
    try {
      await baixarArquivo(path + "/" + row.id + "/arquivo", row.nome_original);
    } catch (err) {
      setError(mensagemErro(err));
    }
  }
  return (
    <>
      <form onSubmit={enviar}>
        <fieldset className="form-grid" disabled={busy}>
          <Field
            label="Documento"
            type="file"
            name="arquivo"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            required
          />
          <Field label="Tipo">
            <select name="tipo" defaultValue="ANEXO">
              <option value="ANEXO">Anexo</option>
              <option value="ORIGINAL">Original</option>
            </select>
          </Field>
          <Field label="Descrição" name="descricao" maxLength={500} />
          <p className="muted">
            PDF, JPEG, PNG ou WebP, até 10 MB. Documentos originais são
            preservados.
          </p>
        </fieldset>
        <div className="form-actions">
          <button className="button primary" disabled={busy}>
            {busy ? "Enviando…" : "Adicionar documento"}
          </button>
        </div>
      </form>
      <Notice error>{error}</Notice>
      <Notice>{notice}</Notice>
      <QueryState query={query}>
        <Table
          rows={query.data?.data}
          columns={[
            { key: "nome_original", label: "Arquivo" },
            {
              key: "tipo",
              label: "Tipo",
              render: (row) => <Badge value={row.tipo} />,
            },
            { key: "descricao", label: "Descrição" },
            {
              key: "created_at",
              label: "Enviado em",
              render: (row) => dataBr(row.created_at),
            },
            {
              key: "actions",
              label: "Ações",
              render: (row) => (
                <div className="actions">
                  <button className="text-button" onClick={() => baixar(row)}>
                    Baixar
                  </button>
                  {row.tipo === "ANEXO" ? (
                    <button
                      className="text-button danger"
                      onClick={() => setRemove(row)}
                    >
                      Excluir
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </QueryState>
      {remove ? (
        <Modal title="Excluir anexo" onClose={() => setRemove(null)}>
          <p>Excluir o anexo {remove.nome_original}?</p>
          <Formulario
            fields={[]}
            submitLabel="Confirmar exclusão"
            onSubmit={() => api.delete(path + "/" + remove.id)}
            onSuccess={() => {
              setRemove(null);
              query.reload();
              setNotice("Anexo excluído.");
            }}
          />
        </Modal>
      ) : null}
    </>
  );
}
