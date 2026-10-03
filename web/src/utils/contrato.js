import { hoje } from "./format";
export function valoresContrato(initial = {}) {
  return {
    numero: "",
    tipo: "",
    valor_total: "",
    quantidade_parcelas: 1,
    data_inicio: hoje(),
    data_fim: "",
    forma_pagamento: "PIX",
    juros_percentual: 0,
    multa_percentual: 0,
    descricao: "",
    observacoes: "",
    ...initial,
    vencimentosTexto: initial.vencimentos?.join(", ") || "",
  };
}
export function payloadContrato(values) {
  const result = {};
  for (const name of [
    "numero",
    "tipo",
    "descricao",
    "forma_pagamento",
    "observacoes",
  ])
    result[name] = values[name] || null;
  for (const name of [
    "valor_total",
    "quantidade_parcelas",
    "juros_percentual",
    "multa_percentual",
  ])
    result[name] = Number(values[name] || 0);
  result.data_inicio = values.data_inicio;
  result.data_fim = values.data_fim || null;
  if (values.vencimentosTexto?.trim())
    result.vencimentos = values.vencimentosTexto
      .split(",")
      .map((date) => date.trim())
      .filter(Boolean);
  return result;
}
