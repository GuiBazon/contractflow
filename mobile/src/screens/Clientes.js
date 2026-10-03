import React, { useCallback, useState } from "react";
import { Text } from "react-native";
import { Screen, QueryResult, Pager, s } from "../components/SprintUI";
import { ClientCard, Input, PrimaryButton } from "../components";
import { api } from "../services/api";
import useDados from "../hooks/useDados";
export function Clientes({ navigation }) {
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const query = useDados(
    useCallback(() => api.listClientes(busca, page), [busca, page]),
  );
  return (
    <Screen title="Clientes">
      <PrimaryButton
        title="Novo cliente"
        onPress={() => navigation.navigate("FormCliente")}
      />
      <Input
        label="Buscar clientes"
        placeholder="Nome, CPF/CNPJ, e-mail ou cidade"
        value={busca}
        onChangeText={(value) => {
          setBusca(value);
          setPage(1);
        }}
      />
      <QueryResult query={query}>
        {query.data?.data.map((cliente) => (
          <ClientCard
            key={cliente.id}
            cliente={cliente}
            onPress={() =>
              navigation.navigate("DetalheCliente", { clienteId: cliente.id })
            }
          />
        ))}
        {query.data?.data.length === 0 && (
          <Text style={s.note}>Nenhum cliente encontrado.</Text>
        )}
        <Pager paginacao={query.data?.paginacao} onPage={setPage} />
      </QueryResult>
    </Screen>
  );
}
