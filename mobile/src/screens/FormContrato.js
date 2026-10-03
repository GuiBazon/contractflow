import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { Screen, s } from "../components/SprintUI";
import { Input, PrimaryButton } from "../components";
import { ClientePicker } from "../components/ClientePicker";
import useDados from "../hooks/useDados";
import { api, normalizarErro } from "../services/api";
import { parseValor } from "../utils/format";

export const camposContrato = [
  ["numero", "Número do contrato"],
  ["descricao", "Descrição"],
  ["tipo", "Tipo"],
  ["valor_total", "Valor total (R$)", "decimal-pad"],
  ["quantidade_parcelas", "Quantidade de parcelas", "numeric"],
  ["data_inicio", "Início (AAAA-MM-DD)"],
  ["data_fim", "Fim (AAAA-MM-DD)"],
  ["forma_pagamento", "Forma de pagamento"],
  ["juros_percentual", "Juros (%)", "decimal-pad"],
  ["multa_percentual", "Multa (%)", "decimal-pad"],
  ["observacoes", "Observações"],
];
export function initialContrato(contrato = {}, renovar = false) {
  return Object.fromEntries(
    camposContrato.map(([key]) => [
      key,
      renovar && ["numero", "data_inicio", "data_fim"].includes(key)
        ? ""
        : ["data_inicio", "data_fim"].includes(key)
          ? String(contrato[key] || "").split("T")[0]
          : String(
              contrato[key] ??
                (key === "forma_pagamento"
                  ? "PIX"
                  : key.endsWith("_percentual")
                    ? "0"
                    : ""),
            ),
    ]),
  );
}
export function payloadContrato(form) {
  return Object.fromEntries(
    camposContrato.map(([key]) => [
      key,
      [
        "valor_total",
        "quantidade_parcelas",
        "juros_percentual",
        "multa_percentual",
      ].includes(key)
        ? parseValor(form[key])
        : form[key].trim() || null,
    ]),
  );
}
export function CamposContrato({
  form,
  onChange,
  protegido = false,
  disabled = false,
}) {
  return (
    <>
      {camposContrato.map(([key, label, keyboardType]) => (
        <Input
          key={key}
          label={label}
          value={form[key]}
          onChangeText={(value) => onChange(key, value)}
          keyboardType={keyboardType || "default"}
          autoCapitalize={key === "numero" ? "characters" : "none"}
          multiline={key === "observacoes"}
          editable={
            !disabled &&
            !(
              protegido &&
              ["numero", "valor_total", "quantidade_parcelas"].includes(key)
            )
          }
        />
      ))}
    </>
  );
}
export function FormContrato({ route, navigation }) {
  const id = route.params?.contratoId;
  const renovar = route.name === "RenovarContrato";
  const query = useDados(
    useCallback(async () => {
      const contrato = id ? await api.getContrato(id) : {};
      const clienteId = contrato.cliente_id || route.params?.clienteId;
      const cliente = clienteId ? await api.getCliente(clienteId) : null;
      return { contrato, cliente };
    }, [id, route.params?.clienteId]),
  );
  return (
    <Screen
      title={
        renovar ? "Renovar contrato" : id ? "Editar contrato" : "Novo contrato"
      }
      back
      query={query}
    >
      {query.data && (
        <Formulario
          initial={query.data}
          id={id}
          renovar={renovar}
          navigation={navigation}
        />
      )}
    </Screen>
  );
}
function Formulario({ initial, id, renovar, navigation }) {
  const [form, setForm] = useState(() =>
    initialContrato(initial.contrato, renovar),
  );
  const [cliente, setCliente] = useState(initial.cliente);
  const [vencimentos, setVencimentos] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const protegido =
    !renovar && Number(initial.contrato.financeiro?.recebido) > 0;
  async function salvar() {
    if (busy) return;
    setError("");
    if (!cliente) return setError("Selecione um cliente.");
    const dados = payloadContrato(form);
    if (vencimentos.trim())
      dados.vencimentos = vencimentos.split(",").map((value) => value.trim());
    if (protegido) {
      delete dados.numero;
      delete dados.valor_total;
      delete dados.quantidade_parcelas;
      delete dados.vencimentos;
    }
    if (!id || renovar) dados.cliente_id = cliente.id;
    setBusy(true);
    try {
      const result = renovar
        ? await api.renovar(id, dados)
        : id
          ? await api.updateContrato(id, dados)
          : await api.createContrato(dados);
      if (id && !renovar) navigation.goBack();
      else
        navigation.replace("DetalheContrato", {
          contratoId: result.contrato.id,
        });
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.panel}>
      <ClientePicker
        value={cliente}
        onChange={setCliente}
        disabled={Boolean(id) || busy}
      />
      {protegido ? (
        <Text style={s.note}>
          Número, valor e parcelamento ficam protegidos após pagamentos.
        </Text>
      ) : null}
      {renovar ? (
        <Text style={s.note}>
          Informe um novo número e período. A renovação mantém o cliente,
          encerra a origem e preserva seus pagamentos e documentos.
        </Text>
      ) : null}
      <CamposContrato
        form={form}
        onChange={(key, value) => setForm((old) => ({ ...old, [key]: value }))}
        protegido={protegido}
        disabled={busy}
      />
      {!protegido && (
        <Input
          label="Vencimentos personalizados (opcional)"
          placeholder="2026-11-01, 2026-12-01"
          value={vencimentos}
          onChangeText={setVencimentos}
          editable={!busy}
        />
      )}
      <Text style={s.note}>
        Sem vencimentos personalizados, o início é o primeiro vencimento; os
        demais são mensais. Datas usam AAAA-MM-DD.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        title={
          busy
            ? "Salvando..."
            : renovar
              ? "Confirmar renovação"
              : id
                ? "Salvar alterações"
                : "Criar contrato"
        }
        disabled={busy}
        onPress={salvar}
      />
    </View>
  );
}
