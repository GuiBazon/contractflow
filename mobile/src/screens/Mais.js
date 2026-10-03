import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { Screen, s } from "../components/SprintUI";
import { SecondaryButton } from "../components";
import { api } from "../services/api";
import useDados from "../hooks/useDados";
export function Mais({ navigation }) {
  const query = useDados(useCallback(() => api.me(), []));
  const [busy, setBusy] = useState(false);
  async function sair() {
    setBusy(true);
    try {
      await api.logout();
    } catch {
      /* A sessão local também é encerrada quando a API fica indisponível. */
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Mais opções" back query={query}>
      <View style={s.panel}>
        <Text style={s.heading}>{query.data?.usuario.nome}</Text>
        <Text style={s.note}>{query.data?.usuario.email}</Text>
      </View>
      {[
        ["Calculadora", "Calculadora financeira"],
        ["Alertas", "Alertas"],
        ["Relatorios", "Relatórios"],
        ["Documentos", "Documentos"],
        ["Configuracoes", "Configurações"],
      ].map(([route, title]) => (
        <SecondaryButton
          key={route}
          title={title}
          onPress={() => navigation.navigate(route)}
        />
      ))}
      <SecondaryButton
        title="Calendário"
        onPress={() => navigation.popTo("MainTabs", { screen: "Agenda" })}
      />
      <SecondaryButton
        title={busy ? "Saindo..." : "Sair da conta"}
        danger
        disabled={busy}
        onPress={sair}
      />
      <Text style={s.note}>
        ContractFlow · Gestão de clientes, contratos, pagamentos e despesas. É
        necessário ter conexão com a API.
      </Text>
    </Screen>
  );
}
