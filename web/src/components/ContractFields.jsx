import { Field } from "./ui";
export default function ContractFields({ values, onChange, locked = false }) {
  function campo(name) {
    return {
      name,
      value: values[name] ?? "",
      onChange: (event) => onChange(name, event.target.value),
    };
  }
  return (
    <>
      <Field
        label="Número do contrato"
        {...campo("numero")}
        required
        maxLength={50}
        disabled={locked}
      />
      <Field
        label="Tipo"
        {...campo("tipo")}
        maxLength={100}
        placeholder="Ex.: Prestação de serviços"
      />
      <Field
        label="Valor total (R$)"
        {...campo("valor_total")}
        type="number"
        step="0.01"
        min="0.01"
        required
        disabled={locked}
      />
      <Field
        label="Quantidade de parcelas"
        {...campo("quantidade_parcelas")}
        type="number"
        min={1}
        max={120}
        step={1}
        required
        disabled={locked}
      />
      <Field
        label="Primeiro vencimento / início"
        {...campo("data_inicio")}
        type="date"
        required
      />
      <Field
        label="Término do contrato"
        {...campo("data_fim")}
        type="date"
        min={values.data_inicio}
      />
      <Field label="Forma de pagamento">
        <select {...campo("forma_pagamento")}>
          {[
            "PIX",
            "BOLETO",
            "TRANSFERENCIA",
            "DINHEIRO",
            "CARTAO_CREDITO",
            "CARTAO_DEBITO",
          ].map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Juros mensais (%)"
        {...campo("juros_percentual")}
        type="number"
        step="0.01"
        min={0}
        max={100}
      />
      <Field
        label="Multa (%)"
        {...campo("multa_percentual")}
        type="number"
        step="0.01"
        min={0}
        max={100}
      />
      <Field label="Vencimentos personalizados">
        <input
          {...campo("vencimentosTexto")}
          placeholder="2026-11-01, 2026-12-01"
          disabled={locked}
        />
      </Field>
      <Field label="Descrição">
        <textarea {...campo("descricao")} rows={3} maxLength={5000} />
      </Field>
      <Field label="Observações">
        <textarea {...campo("observacoes")} rows={3} maxLength={5000} />
      </Field>
      <p className="muted wide">
        {locked
          ? "Após pagamentos, número, valor e parcelamento ficam protegidos. Os demais dados podem ser atualizados."
          : "O primeiro vencimento usa a data de início. Os seguintes são mensais; o restante dos centavos fica na última parcela. Uma lista personalizada precisa conter todas as datas."}
      </p>
    </>
  );
}
