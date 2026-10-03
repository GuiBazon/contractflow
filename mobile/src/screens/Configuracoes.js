import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { Screen, s } from "../components/SprintUI";
import { Input, PrimaryButton, SecondaryButton } from "../components";
import { api, normalizarErro } from "../services/api";
import { limparSessao } from "../services/storage";
import { voltarAoLogin } from "../navigation/navigationRef";
import useDados from "../hooks/useDados";
export function Configuracoes({ navigation }) {
  const query = useDados(useCallback(() => api.me(), []));
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function salvar() {
    if (busy) return;
    setError("");
    if (nova !== confirmacao)
      return setError("A confirmação da senha não confere.");
    setBusy(true);
    try {
      await api.mudarSenha({ senha_atual: atual, nova_senha: nova });
      await limparSessao();
      voltarAoLogin("Senha alterada. Entre novamente.");
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Configurações" back query={query}>
      <View style={s.panel}>
        <Text style={s.heading}>{query.data?.usuario.nome}</Text>
        <Text style={s.text}>{query.data?.usuario.email}</Text>
        <Text style={s.note}>
          Perfil:{" "}
          {query.data?.usuario.perfil === "ADMIN" ? "Administrador" : "Usuário"}
        </Text>
        {query.data?.usuario.perfil === "ADMIN" && (
          <SecondaryButton
            title="Gerenciar usuários"
            onPress={() => navigation.navigate("Usuarios")}
          />
        )}
      </View>
      <View style={s.panel}>
        <Text style={s.heading}>Trocar senha</Text>
        <Input
          label="Senha atual"
          value={atual}
          onChangeText={setAtual}
          secureTextEntry
          editable={!busy}
        />
        <Input
          label="Nova senha"
          value={nova}
          onChangeText={setNova}
          secureTextEntry
          editable={!busy}
        />
        <Input
          label="Confirmar nova senha"
          value={confirmacao}
          onChangeText={setConfirmacao}
          secureTextEntry
          editable={!busy}
        />
        <Text style={s.note}>
          A troca da senha encerra as sessões anteriores. Você precisará entrar
          novamente.
        </Text>
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          title={busy ? "Salvando..." : "Alterar senha"}
          disabled={busy}
          onPress={salvar}
        />
      </View>
    </Screen>
  );
}
