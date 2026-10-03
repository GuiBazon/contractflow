import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Screen, s } from "../components/SprintUI";
import {
  Input,
  PrimaryButton,
  FilterChip,
  SecondaryButton,
} from "../components";
import { api, normalizarErro } from "../services/api";
import useDados from "../hooks/useDados";
import { formatCurrency, hojeISO, parseValor } from "../utils/format";
export function RegistrarPagamento({ route, navigation }) {
  const id = route.params.contratoId;
  const query = useDados(
    useCallback(
      () => Promise.all([api.getContrato(id), api.listParcelas(id)]),
      [id],
    ),
  );
  return (
    <Screen title="Registrar pagamento" back query={query}>
      {query.data && (
        <Formulario
          contrato={query.data[0]}
          parcelas={query.data[1].data}
          numero={route.params.parcelaNumero}
          navigation={navigation}
        />
      )}
    </Screen>
  );
}
function restante(parcela) {
  return Math.max(
    0,
    Math.round((Number(parcela.valor) - Number(parcela.pago || 0)) * 100) / 100,
  );
}
function Formulario({ contrato, parcelas, numero, navigation }) {
  const abertas = parcelas.filter(
    (parcela) => parcela.situacao !== "CANCELADA" && restante(parcela) > 0,
  );
  const inicial =
    abertas.find((parcela) => parcela.numero === numero) || abertas[0];
  const [selecionada, setSelecionada] = useState(inicial);
  const [valor, setValor] = useState(inicial ? String(restante(inicial)) : "");
  const [data, setData] = useState(hojeISO());
  const [metodo, setMetodo] = useState("PIX");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState(false);
  async function confirmar() {
    if (busy || !selecionada) return;
    const pago = parseValor(valor);
    if (!Number.isFinite(pago) || pago <= 0 || pago > restante(selecionada))
      return setError(
        "Informe um valor positivo até o saldo pendente da parcela.",
      );
    setBusy(true);
    setError("");
    try {
      await api.createPagamento(contrato.id, {
        parcela_id: selecionada.id,
        valor: pago,
        data_pagamento: data,
        forma_pagamento: metodo,
      });
      setSucesso(true);
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  if (sucesso)
    return (
      <View style={s.panel}>
        <Text style={s.title}>Pagamento registrado</Text>
        <Text style={s.note}>
          O saldo foi atualizado. Um pagamento parcial mantém a parcela em
          aberto até a quitação.
        </Text>
        <PrimaryButton
          title="Voltar ao contrato"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  if (!inicial)
    return (
      <Text style={s.note}>
        Nenhuma parcela aberta para receber pagamentos.
      </Text>
    );
  return (
    <View style={s.panel}>
      <Text style={s.heading}>
        {contrato.numero} · {contrato.cliente_nome}
      </Text>
      <Text style={s.note}>Escolha a parcela em aberto.</Text>
      {abertas.map((parcela) => (
        <SecondaryButton
          key={parcela.id}
          title={
            "Parcela " +
            parcela.numero +
            " · Saldo " +
            formatCurrency(restante(parcela))
          }
          disabled={busy}
          onPress={() => {
            setSelecionada(parcela);
            setValor(String(restante(parcela)));
            setError("");
          }}
        />
      ))}
      <Text style={s.text}>
        Parcela {selecionada.numero} · Saldo pendente:{" "}
        {formatCurrency(restante(selecionada))}
      </Text>
      <Input
        label="Valor pago (R$)"
        value={valor}
        onChangeText={setValor}
        keyboardType="decimal-pad"
        editable={!busy}
      />
      <Input
        label="Data do pagamento (AAAA-MM-DD)"
        value={data}
        onChangeText={setData}
        editable={!busy}
      />
      <View style={s.row}>
        {["PIX", "TRANSFERENCIA", "BOLETO", "DINHEIRO", "CARTAO_CREDITO"].map(
          (value) => (
            <FilterChip
              key={value}
              label={value}
              active={metodo === value}
              onPress={() => !busy && setMetodo(value)}
            />
          ),
        )}
      </View>
      <Text style={s.note}>
        Juros e multa são estimativas de cobrança e não são somados ao principal
        neste registro.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        title={busy ? "Registrando..." : "Confirmar pagamento"}
        disabled={busy}
        onPress={confirmar}
      />
    </View>
  );
}
