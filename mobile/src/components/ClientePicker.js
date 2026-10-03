import React, { useCallback, useState } from "react";
import { Modal, View, Text, FlatList } from "react-native";
import { Input } from "./Input";
import { SecondaryButton } from "./SecondaryButton";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { Pager, s } from "./SprintUI";
import useDados from "../hooks/useDados";
import { api } from "../services/api";

export function ClientePicker({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.note}>Cliente do contrato</Text>
      <SecondaryButton
        title={value?.nome_razao_social || value?.nome || "Selecionar cliente"}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      {open && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#00000066",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <View style={[s.panel, { maxHeight: "85%" }]}>
              <Text style={s.heading}>Selecionar cliente</Text>
              <Lista
                onChange={(cliente) => {
                  onChange(cliente);
                  setOpen(false);
                }}
              />
              <SecondaryButton
                title="Fechar seleção"
                onPress={() => setOpen(false)}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
function Lista({ onChange }) {
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const query = useDados(
    useCallback(() => api.listClientes(busca, page), [busca, page]),
  );
  return (
    <>
      <Input
        label="Buscar cliente"
        value={busca}
        onChangeText={(value) => {
          setBusca(value);
          setPage(1);
        }}
      />
      {query.loading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : (
        <>
          <FlatList
            data={query.data?.data || []}
            style={{ maxHeight: 280 }}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <SecondaryButton
                title={item.nome_razao_social + " · " + item.cpf_cnpj}
                onPress={() => onChange(item)}
                style={{ marginBottom: 8 }}
              />
            )}
            ListEmptyComponent={
              <Text style={s.note}>
                Nenhum cliente encontrado. Cadastre um cliente na aba Clientes.
              </Text>
            }
          />
          <Pager paginacao={query.data?.paginacao} onPage={setPage} />
        </>
      )}
    </>
  );
}
