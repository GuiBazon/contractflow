import React, { useState } from "react";
import { View, Text } from "react-native";
import { api, normalizarErro } from "../services/api";
import { Screen, Metrics, s } from "../components/SprintUI";
import { Input, PrimaryButton, FilterChip } from "../components";
import {
  formatCurrency,
  formatDate,
  hojeISO,
  parseValor,
} from "../utils/format";

const taxas = [
  ["juros_percentual", "Juros mensais (%)"],
  ["multa_percentual", "Multa (%)"],
  ["dias_atraso", "Dias de atraso"],
];
const campos = {
  parcelas: [
    ["valor_total", "Valor total (R$)"],
    ["quantidade_parcelas", "Quantidade de parcelas"],
    ["data_inicio", "Primeiro vencimento (AAAA-MM-DD)"],
    ...taxas,
  ],
  saldo: [
    ["valor", "Principal (R$)"],
    ["valor_pago", "Já pago (R$)"],
    ...taxas,
  ],
  projecao: [
    ["recebido", "Recebido (R$)"],
    ["pendente", "A receber (R$)"],
    ["despesas_pagas", "Despesas pagas (R$)"],
    ["despesas_pendentes", "Despesas pendentes (R$)"],
  ],
};
export function Calculadora() {
  const [tab, setTab] = useState("parcelas");
  const [dados, setDados] = useState({
    data_inicio: hojeISO(),
    quantidade_parcelas: "1",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  async function calcular() {
    const payload = Object.fromEntries(
      campos[tab].map(([name]) => [
        name,
        name === "data_inicio" ? dados[name] : parseValor(dados[name] || "0"),
      ]),
    );
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.calcular(tab, payload));
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  const summary = result?.resumo || result;
  return (
    <Screen title="Calculadora financeira" back>
      <View style={s.row}>
        {[
          ["parcelas", "Parcelamento"],
          ["saldo", "Saldo e encargos"],
          ["projecao", "Projeção"],
        ].map(([value, label]) => (
          <FilterChip
            key={value}
            label={label}
            active={tab === value}
            onPress={() => {
              setTab(value);
              setResult(null);
              setError("");
            }}
          />
        ))}
      </View>
      <View style={s.panel}>
        {campos[tab].map(([name, label]) => (
          <Input
            key={name}
            label={label}
            value={String(dados[name] || "")}
            onChangeText={(value) =>
              setDados((old) => ({ ...old, [name]: value }))
            }
            keyboardType={name === "data_inicio" ? "default" : "decimal-pad"}
            editable={!busy}
          />
        ))}
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          title={busy ? "Calculando..." : "Calcular"}
          disabled={busy}
          onPress={calcular}
        />
        <Text style={s.note}>
          Simulação sem criar contrato. O primeiro vencimento usa a data
          informada, inclusive dia 1. Encargos estimados incidem sobre saldo em
          aberto quando há atraso.
        </Text>
      </View>
      {summary ? (
        <>
          <Text style={s.heading}>Resultado da simulação</Text>
          <Metrics
            items={
              tab === "projecao"
                ? [
                    {
                      label: "Saldo realizado",
                      value: summary.saldo_realizado,
                    },
                    {
                      label: "Saldo projetado",
                      value: summary.saldo_projetado,
                    },
                  ]
                : [
                    {
                      label:
                        tab === "saldo"
                          ? "Principal pendente"
                          : "Principal total",
                      value: summary.pendente ?? summary.valor_total,
                    },
                    { label: "Juros estimados", value: summary.juros },
                    { label: "Multa estimada", value: summary.multa },
                    {
                      label: "Total estimado",
                      value: summary.total_atualizado,
                    },
                  ]
            }
          />
          {result.parcelas?.map((row) => (
            <View style={s.panel} key={row.numero}>
              <Text style={s.heading}>
                Parcela {row.numero} · {formatCurrency(row.valor)}
              </Text>
              <Text style={s.note}>
                Vence {formatDate(row.data_vencimento)}
              </Text>
              <Text style={s.note}>
                Juros {formatCurrency(row.juros)} · Multa{" "}
                {formatCurrency(row.multa)}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
