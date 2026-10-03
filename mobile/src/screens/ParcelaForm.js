import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { Screen, s } from "../components/SprintUI";
import { Input, PrimaryButton, FilterChip } from "../components";
import useDados from "../hooks/useDados";
import { api, normalizarErro } from "../services/api";
import { parseValor } from "../utils/format";
export function ParcelaForm({ route, navigation }) {
  const { contratoId, parcelaId } = route.params;
  const query = useDados(
    useCallback(async () => {
      const result = await api.listParcelas(contratoId);
      const parcela = result.data.find((item) => item.id === parcelaId);
      if (!parcela) throw new Error("Parcela não encontrada.");
      return parcela;
    }, [contratoId, parcelaId]),
  );
  return (
    <Screen title="Editar parcela" back query={query}>
      {query.data && (
        <Formulario
          parcela={query.data}
          contratoId={contratoId}
          navigation={navigation}
        />
      )}
    </Screen>
  );
}
function Formulario({ parcela, contratoId, navigation }) {
  const [valor, setValor] = useState(String(parcela.valor));
  const [data, setData] = useState(parcela.data_vencimento);
  const [status, setStatus] = useState(
    parcela.status === "CANCELADA" ? "CANCELADA" : "PENDENTE",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const protegido = Number(parcela.pago) > 0;
  async function salvar() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.updateParcela(contratoId, parcela.id, {
        data_vencimento: data,
        ...(!protegido ? { valor: parseValor(valor), status } : {}),
      });
      navigation.goBack();
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.panel}>
      <Text style={s.heading}>Parcela {parcela.numero}</Text>
      <Input
        label="Valor da parcela (R$)"
        value={valor}
        onChangeText={setValor}
        keyboardType="decimal-pad"
        editable={!protegido && !busy}
      />
      <Input
        label="Vencimento (AAAA-MM-DD)"
        value={data}
        onChangeText={setData}
        editable={!busy}
      />
      {!protegido && (
        <View style={s.row}>
          {["PENDENTE", "CANCELADA"].map((value) => (
            <FilterChip
              key={value}
              label={value}
              active={status === value}
              onPress={() => !busy && setStatus(value)}
            />
          ))}
        </View>
      )}
      <Text style={s.note}>
        {protegido
          ? "Valor e cancelamento ficam protegidos após pagamentos. O vencimento pode ser corrigido."
          : "A situação de atraso e quitação é calculada pela API a partir da data e dos pagamentos."}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        title={busy ? "Salvando..." : "Salvar parcela"}
        disabled={busy}
        onPress={salvar}
      />
    </View>
  );
}
