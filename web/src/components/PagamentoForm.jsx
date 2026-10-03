import { useState } from "react";
import { api, mensagemErro } from "../axios/axios";
import { dinheiro, hoje } from "../utils/format";
import { Field, Notice } from "./ui";

export default function PagamentoForm({
  contratoId,
  parcelas,
  initialId,
  onSuccess,
}) {
  const abertas = parcelas.filter(
    (row) =>
      row.situacao !== "CANCELADA" && Number(row.valor) > Number(row.pago),
  );
  const [parcelaId, setParcelaId] = useState(
    String(initialId || abertas[0]?.id || ""),
  );
  const parcela = abertas.find((row) => String(row.id) === parcelaId);
  const restante = parcela
    ? Math.round((Number(parcela.valor) - Number(parcela.pago)) * 100) / 100
    : 0;
  const [valor, setValor] = useState(restante.toFixed(2));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function pagar(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.post("/contratos/" + contratoId + "/pagamentos", {
        ...values,
        parcela_id: Number(parcelaId),
        valor: Number(valor),
      });
      onSuccess();
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }
  if (!abertas.length)
    return <p className="muted">Não há parcelas com saldo em aberto.</p>;
  return (
    <form onSubmit={pagar}>
      <fieldset className="form-grid" disabled={busy}>
        <Field label="Parcela">
          <select
            value={parcelaId}
            onChange={(event) => {
              const row = abertas.find(
                (item) => String(item.id) === event.target.value,
              );
              setParcelaId(event.target.value);
              setValor((Number(row.valor) - Number(row.pago)).toFixed(2));
            }}
          >
            {abertas.map((row) => (
              <option key={row.id} value={row.id}>
                {"Parcela " +
                  row.numero +
                  " — saldo " +
                  dinheiro(Number(row.valor) - Number(row.pago))}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Valor do pagamento (R$)"
          type="number"
          step="0.01"
          min="0.01"
          max={restante}
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          required
        />
        <Field
          label="Data do pagamento"
          name="data_pagamento"
          type="date"
          defaultValue={hoje()}
          required
        />
        <Field label="Forma de pagamento">
          <select name="forma_pagamento" defaultValue="PIX">
            {[
              "PIX",
              "BOLETO",
              "TRANSFERENCIA",
              "DINHEIRO",
              "CARTAO_CREDITO",
              "CARTAO_DEBITO",
            ].map((name) => (
              <option value={name} key={name}>
                {name.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Observações">
          <textarea name="observacoes" maxLength={5000} />
        </Field>
        <p className="muted">
          Saldo principal disponível: {dinheiro(restante)}. Juros e multa
          estimados não são somados ao pagamento.
        </p>
      </fieldset>
      <Notice error>{error}</Notice>
      <div className="form-actions">
        <button className="button primary" disabled={busy}>
          {busy ? "Registrando…" : "Confirmar pagamento"}
        </button>
      </div>
    </form>
  );
}
