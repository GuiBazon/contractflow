import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { Screen, QueryResult, Pager, s } from "../components/SprintUI";
import { FilterChip, SecondaryButton } from "../components";
import { api } from "../services/api";
import useDados from "../hooks/useDados";
import { formatCurrency, formatDate } from "../utils/format";
const titulos = {
  ATRASO: "Parcela em atraso",
  VENCIMENTO: "Vencimento próximo",
  RENOVACAO: "Renovação próxima",
};
export function Alertas({ navigation }) {
  const [dias, setDias] = useState(7);
  const [page, setPage] = useState(1);
  const query = useDados(
    useCallback(() => api.alertas({ dias, page, limit: 20 }), [dias, page]),
  );
  return (
    <Screen title="Alertas" back>
      <Text style={s.note}>
        Parcelas em atraso, próximos vencimentos e fim de contratos. Consulte os
        próximos dias:
      </Text>
      <View style={s.row}>
        {[7, 15, 30, 60, 90].map((value) => (
          <FilterChip
            key={value}
            label={value + " dias"}
            active={dias === value}
            onPress={() => {
              setDias(value);
              setPage(1);
            }}
          />
        ))}
      </View>
      <QueryResult query={query}>
        {query.data?.data.map((row) => (
          <View key={row.id} style={s.panel}>
            <Text style={s.heading}>{titulos[row.tipo]}</Text>
            <Text style={s.text}>
              {row.cliente_nome} · {row.contrato_numero}
            </Text>
            <Text style={s.note}>
              {formatDate(row.data)}
              {row.tipo !== "RENOVACAO"
                ? " · " + formatCurrency(row.valor)
                : ""}
            </Text>
            <SecondaryButton
              title={"Abrir contrato " + row.contrato_numero}
              onPress={() =>
                navigation.navigate("DetalheContrato", {
                  contratoId: row.contrato_id,
                })
              }
            />
          </View>
        ))}
        {query.data?.data.length === 0 && (
          <Text style={s.note}>Nenhum alerta nesse intervalo.</Text>
        )}
        <Pager paginacao={query.data?.paginacao} onPage={setPage} />
      </QueryResult>
    </Screen>
  );
}
