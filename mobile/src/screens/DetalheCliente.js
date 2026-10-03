import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Screen, Pager, s } from "../components/SprintUI";
import { PrimaryButton, SecondaryButton, ContractCard } from "../components";
import { api, normalizarErro } from "../services/api";
import useDados from "../hooks/useDados";
import { Alert } from "../utils/alert";
export function DetalheCliente({ route, navigation }) {
  const id = route.params.clienteId;
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useDados(
    useCallback(
      () =>
        Promise.all([
          api.getCliente(id),
          api.listContratos({ cliente: id, page, limit: 20 }),
        ]),
      [id, page],
    ),
  );
  const cliente = query.data?.[0];
  const contratos = query.data?.[1];
  function excluir() {
    Alert.alert(
      "Excluir cliente",
      "A exclusão não será permitida se houver contratos vinculados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            setError("");
            try {
              await api.deleteCliente(id);
              navigation.popTo("MainTabs", { screen: "Clientes" });
            } catch (err) {
              setError(normalizarErro(err));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }
  return (
    <Screen title="Cliente" back query={query}>
      {cliente && (
        <>
          <View style={s.panel}>
            <Text style={s.title}>{cliente.nome_razao_social}</Text>
            <Text style={s.text}>{cliente.cpf_cnpj}</Text>
            <Text style={s.note}>
              {cliente.email || "E-mail não informado"}
            </Text>
            <Text style={s.note}>
              {cliente.telefone || "Telefone não informado"}
            </Text>
            <Text style={s.text}>
              {[
                cliente.logradouro,
                cliente.numero,
                cliente.complemento,
                cliente.bairro,
                cliente.cidade,
                cliente.estado,
                cliente.cep,
              ]
                .filter(Boolean)
                .join(", ") || "Endereço não informado"}
            </Text>
            {cliente.observacoes ? (
              <Text style={s.note}>{cliente.observacoes}</Text>
            ) : null}
            <PrimaryButton
              title="Editar cliente"
              disabled={busy}
              onPress={() =>
                navigation.navigate("FormCliente", { clienteId: id })
              }
            />
            <SecondaryButton
              title="Excluir cliente"
              danger
              disabled={busy}
              onPress={excluir}
            />
            {error ? (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            ) : null}
          </View>
          <PrimaryButton
            title="Novo contrato para este cliente"
            onPress={() =>
              navigation.navigate("FormContrato", { clienteId: id })
            }
          />
          <Text style={s.heading}>Contratos ({contratos.paginacao.total})</Text>
          {contratos.data.map((contrato) => (
            <ContractCard
              key={contrato.id}
              contrato={contrato}
              onPress={() =>
                navigation.navigate("DetalheContrato", {
                  contratoId: contrato.id,
                })
              }
            />
          ))}
          {!contratos.data.length && (
            <Text style={s.note}>Nenhum contrato vinculado.</Text>
          )}
          <Pager paginacao={contratos.paginacao} onPage={setPage} />
        </>
      )}
    </Screen>
  );
}
