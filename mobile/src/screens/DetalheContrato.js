import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Screen, Metrics, Pager, s } from "../components/SprintUI";
import {
  PrimaryButton,
  SecondaryButton,
  FilterChip,
  StatusBadge,
} from "../components";
import { api, normalizarErro } from "../services/api";
import { baixarArquivo } from "../services/download";
import useDados from "../hooks/useDados";
import { formatCurrency, formatDate } from "../utils/format";
import { Alert } from "../utils/alert";
const statuses = [
  "ATIVO",
  "PENDENTE",
  "ENCERRADO",
  "CANCELADO",
  "EM_RENOVACAO",
];
export function DetalheContrato({ route, navigation }) {
  const id = route.params.contratoId;
  const [aba, setAba] = useState("Parcelas");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useDados(
    useCallback(
      () =>
        Promise.all([
          api.getContrato(id),
          api.listParcelas(id),
          api.listPagamentos(id, { page, limit: 20 }),
          api.getHistorico(id),
          api.listDocumentos(id),
        ]),
      [id, page],
    ),
  );
  const [contrato, parcelas, pagamentos, historico, documentos] =
    query.data || [];
  async function alterar(operacao) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await operacao();
      query.reload();
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  function confirmar(titulo, mensagem, operacao) {
    Alert.alert(titulo, mensagem, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        style: "destructive",
        onPress: () => alterar(operacao),
      },
    ]);
  }
  async function anexo() {
    if (busy) return;
    setError("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (asset.size > 10 * 1024 * 1024)
        return setError("Arquivo deve ter até 10 MB.");
      await alterar(() =>
        api.uploadDocumento(id, {
          uri: asset.uri,
          file: asset.file,
          nome: asset.name,
          mime: asset.mimeType,
          tipo: "ANEXO",
        }),
      );
    } catch (err) {
      setError(normalizarErro(err));
    }
  }
  async function download(doc) {
    setError("");
    setBusy(true);
    try {
      await baixarArquivo(
        "/documentos/" + id + "/documentos/" + doc.id + "/arquivo",
        doc.nome_original,
      );
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Detalhes do contrato" back query={query}>
      {contrato && (
        <>
          <View style={s.panel}>
            <Text style={s.title}>{contrato.numero}</Text>
            <Text style={s.text}>{contrato.cliente_nome}</Text>
            <StatusBadge status={contrato.status} />
            <Text style={s.text}>
              {contrato.descricao || contrato.tipo || "Sem descrição"}
            </Text>
            <Text style={s.note}>
              {formatDate(contrato.data_inicio)} até{" "}
              {formatDate(contrato.data_fim) || "prazo não informado"} ·{" "}
              {contrato.forma_pagamento || "Forma de pagamento não informada"}
            </Text>
            <Text style={s.note}>
              Juros {contrato.juros_percentual}% · Multa{" "}
              {contrato.multa_percentual}%
            </Text>
            {contrato.observacoes ? (
              <Text style={s.note}>{contrato.observacoes}</Text>
            ) : null}
          </View>
          <Metrics
            items={[
              { label: "Valor do contrato", value: contrato.valor_total },
              {
                label: "Recebido",
                value: contrato.financeiro.recebido,
                green: true,
              },
              { label: "Saldo pendente", value: contrato.financeiro.pendente },
              {
                label: "Valor das parcelas",
                value: contrato.financeiro.valor_parcelas,
              },
            ]}
          />
          <PrimaryButton
            title="Registrar pagamento"
            disabled={
              busy ||
              contrato.status === "CANCELADO" ||
              !parcelas.data.some(
                (p) =>
                  p.situacao !== "CANCELADA" &&
                  Number(p.valor) > Number(p.pago),
              )
            }
            onPress={() =>
              navigation.navigate("RegistrarPagamento", { contratoId: id })
            }
          />
          <View style={s.row}>
            <SecondaryButton
              title="Editar contrato"
              disabled={busy}
              style={s.flex}
              onPress={() =>
                navigation.navigate("FormContrato", { contratoId: id })
              }
            />
            {["ATIVO", "EM_RENOVACAO"].includes(contrato.status) && (
              <SecondaryButton
                title="Renovar contrato"
                disabled={busy}
                style={s.flex}
                onPress={() =>
                  navigation.navigate("RenovarContrato", { contratoId: id })
                }
              />
            )}
          </View>
          <View style={s.panel}>
            <Text style={s.heading}>Alterar status</Text>
            <View style={s.row}>
              {statuses.map((status) => (
                <FilterChip
                  key={status}
                  label={status.replaceAll("_", " ")}
                  active={contrato.status === status}
                  onPress={() =>
                    status !== contrato.status &&
                    !busy &&
                    confirmar(
                      "Alterar status",
                      "Alterar para " + status + "?",
                      () => api.updateContratoStatus(id, status),
                    )
                  }
                />
              ))}
            </View>
            <SecondaryButton
              title="Excluir contrato"
              danger
              disabled={busy}
              onPress={() =>
                confirmar(
                  "Excluir contrato",
                  "Contratos com parcelas ou pagamentos são protegidos pela API. Nesse caso, altere o status.",
                  () =>
                    api
                      .deleteContrato(id)
                      .then(() =>
                        navigation.popTo("MainTabs", { screen: "Contratos" }),
                      ),
                )
              }
            />
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          ) : null}
          <View style={s.row}>
            {["Parcelas", "Pagamentos", "Documentos", "Histórico"].map(
              (label) => (
                <FilterChip
                  key={label}
                  label={label}
                  active={aba === label}
                  onPress={() => setAba(label)}
                />
              ),
            )}
          </View>
          {aba === "Parcelas" && (
            <>
              {parcelas.data.map((parcela) => (
                <View key={parcela.id} style={s.panel}>
                  <Text style={s.heading}>
                    Parcela {parcela.numero} · {formatCurrency(parcela.valor)}
                  </Text>
                  <StatusBadge status={parcela.situacao} />
                  <Text style={s.note}>
                    Vencimento: {formatDate(parcela.data_vencimento)}
                  </Text>
                  <Text style={s.text}>
                    Pago: {formatCurrency(parcela.pago)} · Pendente:{" "}
                    {formatCurrency(
                      Math.max(0, Number(parcela.valor) - Number(parcela.pago)),
                    )}
                  </Text>
                  <SecondaryButton
                    title={"Editar parcela " + parcela.numero}
                    onPress={() =>
                      navigation.navigate("ParcelaForm", {
                        contratoId: id,
                        parcelaId: parcela.id,
                      })
                    }
                  />
                </View>
              ))}
              {!parcelas.data.length && (
                <Text style={s.note}>Nenhuma parcela cadastrada.</Text>
              )}
              {["ATIVO", "PENDENTE", "EM_RENOVACAO"].includes(
                contrato.status,
              ) && (
                <PrimaryButton
                  title="Adicionar parcelas extras"
                  onPress={() =>
                    navigation.navigate("ParcelasExtras", { contratoId: id })
                  }
                />
              )}
            </>
          )}
          {aba === "Pagamentos" && (
            <>
              {pagamentos.data.map((pagamento) => (
                <View key={pagamento.id} style={s.panel}>
                  <Text style={s.heading}>
                    {formatCurrency(pagamento.valor)} · Parcela{" "}
                    {pagamento.parcela_numero}
                  </Text>
                  <Text style={s.note}>
                    {formatDate(pagamento.data_pagamento)} ·{" "}
                    {pagamento.forma_pagamento}
                  </Text>
                </View>
              ))}
              {!pagamentos.data.length && (
                <Text style={s.note}>Nenhum pagamento registrado.</Text>
              )}
              <Pager paginacao={pagamentos.paginacao} onPage={setPage} />
            </>
          )}
          {aba === "Documentos" && (
            <>
              <PrimaryButton
                title={busy ? "Aguarde..." : "Adicionar anexo"}
                disabled={busy}
                onPress={anexo}
              />
              <Text style={s.note}>
                PDF, JPEG, PNG ou WebP de até 10 MB. O original da importação é
                preservado.
              </Text>
              {documentos.data.map((doc) => (
                <View key={doc.id} style={s.panel}>
                  <Text style={s.heading}>{doc.nome_original}</Text>
                  <Text style={s.note}>
                    {doc.tipo} · {(doc.tamanho / 1024).toFixed(0)} KB
                  </Text>
                  <SecondaryButton
                    title={"Baixar " + doc.nome_original}
                    disabled={busy}
                    onPress={() => download(doc)}
                  />
                  {doc.tipo === "ANEXO" && (
                    <SecondaryButton
                      title={"Excluir " + doc.nome_original}
                      danger
                      disabled={busy}
                      onPress={() =>
                        confirmar(
                          "Excluir anexo",
                          "Remover " + doc.nome_original + "?",
                          () => api.deleteDocumento(id, doc.id),
                        )
                      }
                    />
                  )}
                </View>
              ))}
              {!documentos.data.length && (
                <Text style={s.note}>Nenhum documento vinculado.</Text>
              )}
            </>
          )}
          {aba === "Histórico" && (
            <>
              {historico.map((item) => (
                <View key={item.id} style={s.panel}>
                  <Text style={s.heading}>{item.acao}</Text>
                  <Text style={s.note}>{formatDate(item.created_at)}</Text>
                  <Text style={s.text}>{item.descricao}</Text>
                </View>
              ))}
              {!historico.length && (
                <Text style={s.note}>Nenhum evento registrado.</Text>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
