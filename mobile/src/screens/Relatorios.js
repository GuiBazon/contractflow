import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { Screen, QueryResult, Pager, Metrics, s } from "../components/SprintUI";
import {
  FilterChip,
  Input,
  PrimaryButton,
  SecondaryButton,
} from "../components";
import { api, normalizarErro } from "../services/api";
import { baixarArquivo } from "../services/download";
import useDados from "../hooks/useDados";
import { formatCurrency, formatDate } from "../utils/format";
const tipos = [
  ["FINANCEIRO", "Financeiro"],
  ["RECEBIVEIS", "Recebíveis"],
  ["RECEITAS", "Receitas"],
  ["DESPESAS", "Despesas"],
  ["CONTRATOS", "Contratos"],
];
export function Relatorios() {
  const [tipo, setTipo] = useState("FINANCEIRO");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ de: "", ate: "", q: "" });
  const [filtros, setFiltros] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useDados(
    useCallback(
      () => api.relatorio(tipo, { ...filtros, page, limit: 20 }),
      [tipo, filtros, page],
    ),
  );
  async function exportar(formato) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await baixarArquivo(
        "/relatorios/" + tipo,
        "contractflow-" + tipo.toLowerCase() + "." + formato.toLowerCase(),
        { ...filtros, formato },
      );
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Relatórios" back>
      <View style={s.row}>
        {tipos.map(([value, label]) => (
          <FilterChip
            key={value}
            label={label}
            active={tipo === value}
            onPress={() => {
              setTipo(value);
              setPage(1);
            }}
          />
        ))}
      </View>
      <View style={s.panel}>
        <Input
          label="De (AAAA-MM-DD)"
          value={form.de}
          onChangeText={(de) => setForm((old) => ({ ...old, de }))}
        />
        <Input
          label="Até (AAAA-MM-DD)"
          value={form.ate}
          onChangeText={(ate) => setForm((old) => ({ ...old, ate }))}
        />
        {tipo !== "FINANCEIRO" && (
          <Input
            label="Buscar no relatório"
            value={form.q}
            onChangeText={(q) => setForm((old) => ({ ...old, q }))}
          />
        )}
        <PrimaryButton
          title="Aplicar filtros"
          onPress={() => {
            setFiltros(
              Object.fromEntries(
                Object.entries(form)
                  .filter(([, value]) => value.trim())
                  .map(([key, value]) => [key, value.trim()]),
              ),
            );
            setPage(1);
          }}
        />
        <View style={s.row}>
          <SecondaryButton
            title="Exportar CSV"
            style={s.flex}
            disabled={busy}
            onPress={() => exportar("CSV")}
          />
          <SecondaryButton
            title="Exportar XLSX"
            style={s.flex}
            disabled={busy}
            onPress={() => exportar("XLSX")}
          />
        </View>
        <Text style={s.note}>
          A exportação inclui todos os resultados dos filtros aplicados, até
          10.000 registros. No aparelho, escolha onde compartilhar ou salvar.
        </Text>
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
      </View>
      <QueryResult query={query}>
        <Text style={s.note}>
          Período: {formatDate(query.data?.periodo.de) || "sem início"} até{" "}
          {formatDate(query.data?.periodo.ate) || "sem fim"}
        </Text>
        {query.data?.resumo && (
          <Metrics
            items={[
              {
                label: "Recebido",
                value: query.data.resumo.recebido || query.data.resumo.pago,
                green: true,
              },
              { label: "A receber", value: query.data.resumo.pendente },
              { label: "Em atraso", value: query.data.resumo.atrasado },
              {
                label: "Saldo projetado",
                value: query.data.resumo.saldo_projetado,
              },
            ]}
          />
        )}
        {tipo !== "FINANCEIRO" &&
          query.data?.data.map((row, index) => (
            <View key={row.id || index} style={s.panel}>
              <Text style={s.heading}>
                {row.numero ||
                  row.contrato_numero ||
                  row.descricao ||
                  row.cliente_nome}
              </Text>
              {row.cliente_nome && (
                <Text style={s.text}>{row.cliente_nome}</Text>
              )}
              <Text style={s.text}>
                {formatCurrency(row.valor_total ?? row.valor ?? 0)}
              </Text>
              {row.pendente != null && (
                <Text style={s.note}>
                  Pendente: {formatCurrency(row.pendente)}
                </Text>
              )}
              <Text style={s.note}>
                {row.status || row.situacao || row.forma_pagamento || ""} ·{" "}
                {formatDate(
                  row.data_pagamento || row.data_vencimento || row.data_inicio,
                )}
              </Text>
            </View>
          ))}
        {query.data?.data.length === 0 && (
          <Text style={s.note}>Nenhum registro encontrado.</Text>
        )}
        <Pager paginacao={query.data?.paginacao} onPage={setPage} />
      </QueryResult>
    </Screen>
  );
}
