import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Screen, QueryResult, Pager, s } from "../components/SprintUI";
import { ContractCard, Input, PrimaryButton, FilterChip } from "../components";
import { api } from "../services/api";
import useDados from "../hooks/useDados";
const filtros = [
  ["Todos", undefined],
  ["Ativos", "ATIVO"],
  ["Pendentes", "PENDENTE"],
  ["Em renovação", "EM_RENOVACAO"],
  ["Encerrados", "ENCERRADO"],
  ["Cancelados", "CANCELADO"],
];
export function Contratos({ navigation }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState();
  const [page, setPage] = useState(1);
  const query = useDados(
    useCallback(
      () =>
        api.listContratos({ q: busca || undefined, status, page, limit: 20 }),
      [busca, status, page],
    ),
  );
  return (
    <Screen title="Contratos">
      <PrimaryButton
        title="Novo contrato"
        onPress={() => navigation.navigate("FormContrato")}
      />
      <Input
        label="Buscar contratos"
        placeholder="Número, descrição ou cliente"
        value={busca}
        onChangeText={(value) => {
          setBusca(value);
          setPage(1);
        }}
      />
      <View style={s.row}>
        {filtros.map(([label, value]) => (
          <FilterChip
            key={label}
            label={label}
            active={status === value}
            onPress={() => {
              setStatus(value);
              setPage(1);
            }}
          />
        ))}
      </View>
      <QueryResult query={query}>
        {query.data?.data.map((contrato) => (
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
        {query.data?.data.length === 0 && (
          <Text style={s.note}>Nenhum contrato encontrado.</Text>
        )}
        <Pager paginacao={query.data?.paginacao} onPage={setPage} />
      </QueryResult>
    </Screen>
  );
}
