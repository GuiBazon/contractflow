import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Header } from "./Header";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { SecondaryButton } from "./SecondaryButton";
import { colors } from "../theme";
import { formatCurrency } from "../utils/format";

export function Screen({ title, children, query, back = false }) {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <Header
        title={title}
        leftIcon={back ? "arrow-back" : undefined}
        onLeftPress={() => navigation.goBack()}
        rightIcon={!back ? "ellipsis-horizontal" : undefined}
        onRightPress={() => navigation.navigate("Mais")}
      />
      {query?.loading ? (
        <LoadingState message="Carregando..." />
      ) : query?.error ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
export function QueryResult({ query, children }) {
  return query.loading ? (
    <LoadingState message="Carregando..." />
  ) : query.error ? (
    <ErrorState message={query.error} onRetry={query.reload} />
  ) : (
    children
  );
}
export function Metrics({ items }) {
  return (
    <View style={s.metrics}>
      {items.map((item) => (
        <View key={item.label} style={s.metric}>
          <Text style={s.label}>{item.label}</Text>
          <Text
            style={[
              s.value,
              {
                color: item.danger
                  ? colors.danger
                  : item.green
                    ? colors.success
                    : colors.primary,
              },
            ]}
          >
            {formatCurrency(item.value || 0)}
          </Text>
        </View>
      ))}
    </View>
  );
}
export function Pager({ paginacao, onPage }) {
  if (!paginacao) return null;
  return (
    <View style={s.pager}>
      <Text style={s.note}>
        {paginacao.total} registros · Página{" "}
        {paginacao.totalPages ? paginacao.page : 0} de {paginacao.totalPages}
      </Text>
      <View style={s.row}>
        <SecondaryButton
          title="Anterior"
          disabled={paginacao.page <= 1}
          onPress={() => onPage(paginacao.page - 1)}
          style={s.flex}
        />
        <SecondaryButton
          title="Próxima"
          disabled={paginacao.page >= paginacao.totalPages}
          onPress={() => onPage(paginacao.page + 1)}
          style={s.flex}
        />
      </View>
    </View>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  panel: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  heading: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  text: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  note: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  error: { fontSize: 14, color: colors.danger, lineHeight: 21 },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  flex: { flex: 1, minWidth: 100 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 135,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  value: { fontSize: 22, fontWeight: "700" },
  pager: { gap: 12, marginTop: 8 },
});
