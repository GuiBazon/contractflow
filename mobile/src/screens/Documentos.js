import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { Screen, QueryResult, Pager, s } from "../components/SprintUI";
import { Input, SecondaryButton, FilterChip } from "../components";
import { api, normalizarErro } from "../services/api";
import { baixarArquivo } from "../services/download";
import useDados from "../hooks/useDados";
export function Documentos({ navigation }) {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useDados(
    useCallback(
      () => api.documentos({ q: q || undefined, tipo, page, limit: 20 }),
      [q, tipo, page],
    ),
  );
  async function download(doc) {
    setBusy(true);
    setError("");
    try {
      await baixarArquivo(
        "/documentos/" + doc.contrato_id + "/documentos/" + doc.id + "/arquivo",
        doc.nome_original,
      );
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Documentos" back>
      <Input
        label="Buscar documentos"
        placeholder="Nome, descrição ou número do contrato"
        value={q}
        onChangeText={(value) => {
          setQ(value);
          setPage(1);
        }}
      />
      <View style={s.row}>
        {[
          ["Todos", undefined],
          ["Originais", "ORIGINAL"],
          ["Anexos", "ANEXO"],
        ].map(([label, value]) => (
          <FilterChip
            key={label}
            label={label}
            active={tipo === value}
            onPress={() => {
              setTipo(value);
              setPage(1);
            }}
          />
        ))}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      <QueryResult query={query}>
        {query.data?.data.map((doc) => (
          <View key={doc.id} style={s.panel}>
            <Text style={s.heading}>{doc.nome_original}</Text>
            <Text style={s.note}>
              {doc.tipo} · {doc.contrato_numero} ·{" "}
              {(doc.tamanho / 1024).toFixed(0)} KB
            </Text>
            <SecondaryButton
              title={"Baixar " + doc.nome_original}
              disabled={busy}
              onPress={() => download(doc)}
            />
            <SecondaryButton
              title={"Abrir contrato " + doc.contrato_numero}
              onPress={() =>
                navigation.navigate("DetalheContrato", {
                  contratoId: doc.contrato_id,
                })
              }
            />
          </View>
        ))}
        {query.data?.data.length === 0 && (
          <Text style={s.note}>Nenhum documento encontrado.</Text>
        )}
        <Pager paginacao={query.data?.paginacao} onPage={setPage} />
      </QueryResult>
    </Screen>
  );
}
