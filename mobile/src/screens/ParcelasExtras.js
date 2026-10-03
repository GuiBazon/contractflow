import React, { useState } from "react";
import { Text, View } from "react-native";
import { Screen, s } from "../components/SprintUI";
import { Input, PrimaryButton } from "../components";
import { api, normalizarErro } from "../services/api";
import { parseValor } from "../utils/format";
export function ParcelasExtras({ route, navigation }) {
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState("");
  const [datas, setDatas] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function salvar() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.generateParcelas(route.params.contratoId, {
        quantidade_parcelas: parseValor(quantidade),
        valor_parcela: parseValor(valor),
        ...(datas.trim()
          ? { vencimentos: datas.split(",").map((value) => value.trim()) }
          : {}),
      });
      navigation.goBack();
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Parcelas extras" back>
      <View style={s.panel}>
        <Text style={s.note}>
          As parcelas existentes são preservadas. O total do contrato aumenta
          pela soma das novas parcelas.
        </Text>
        <Input
          label="Quantidade de parcelas extras"
          value={quantidade}
          onChangeText={setQuantidade}
          keyboardType="numeric"
          editable={!busy}
        />
        <Input
          label="Valor de cada parcela (R$)"
          value={valor}
          onChangeText={setValor}
          keyboardType="decimal-pad"
          editable={!busy}
        />
        <Input
          label="Vencimentos personalizados (opcional)"
          placeholder="2026-11-01, 2026-12-01"
          value={datas}
          onChangeText={setDatas}
          editable={!busy}
        />
        <Text style={s.note}>
          Sem datas personalizadas, os vencimentos continuam mensalmente após a
          última parcela.
        </Text>
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          title={busy ? "Adicionando..." : "Confirmar parcelas extras"}
          disabled={busy}
          onPress={salvar}
        />
      </View>
    </Screen>
  );
}
