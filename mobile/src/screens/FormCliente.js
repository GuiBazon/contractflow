import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { Screen, s } from "../components/SprintUI";
import { Input, PrimaryButton } from "../components";
import useDados from "../hooks/useDados";
import { api, normalizarErro } from "../services/api";

const campos = [
  ["nome_razao_social", "Nome / Razão social", "default"],
  ["cpf_cnpj", "CPF/CNPJ", "numeric"],
  ["email", "E-mail", "email-address"],
  ["telefone", "Telefone", "phone-pad"],
  ["cep", "CEP", "numeric"],
  ["logradouro", "Logradouro", "default"],
  ["numero", "Número", "default"],
  ["complemento", "Complemento", "default"],
  ["bairro", "Bairro", "default"],
  ["cidade", "Cidade", "default"],
  ["estado", "UF", "default"],
  ["observacoes", "Observações", "default"],
];
export function FormCliente({ route, navigation }) {
  const id = route.params?.clienteId;
  const query = useDados(
    useCallback(() => (id ? api.getCliente(id) : Promise.resolve({})), [id]),
  );
  return (
    <Screen title={id ? "Editar cliente" : "Novo cliente"} back query={query}>
      {query.data && (
        <Formulario initial={query.data} id={id} navigation={navigation} />
      )}
    </Screen>
  );
}
function Formulario({ initial, id, navigation }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(campos.map(([key]) => [key, initial[key] || ""])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function salvar() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const dados = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim()]),
      );
      dados.estado = dados.estado.toUpperCase();
      const result = id
        ? await api.updateCliente(id, dados)
        : await api.createCliente(dados);
      if (id) navigation.goBack();
      else
        navigation.replace("DetalheCliente", { clienteId: result.cliente.id });
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.panel}>
      <Text style={s.note}>
        Nome e CPF/CNPJ são obrigatórios. Os demais dados são opcionais.
      </Text>
      {campos.map(([key, label, keyboardType]) => (
        <Input
          key={key}
          label={label}
          value={form[key]}
          onChangeText={(value) => setForm((old) => ({ ...old, [key]: value }))}
          keyboardType={keyboardType}
          autoCapitalize={
            key === "email"
              ? "none"
              : key === "estado"
                ? "characters"
                : "sentences"
          }
          multiline={key === "observacoes"}
          maxLength={key === "estado" ? 2 : undefined}
          editable={!busy}
        />
      ))}
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        title={
          busy ? "Salvando..." : id ? "Salvar alterações" : "Cadastrar cliente"
        }
        disabled={busy}
        onPress={salvar}
      />
    </View>
  );
}
