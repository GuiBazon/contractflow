import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Screen, s } from "../components/SprintUI";
import {
  Input,
  PrimaryButton,
  SecondaryButton,
  FilterChip,
} from "../components";
import { ClientePicker } from "../components/ClientePicker";
import {
  CamposContrato,
  initialContrato,
  payloadContrato,
} from "./FormContrato";
import { api, normalizarErro } from "../services/api";
import useDados from "../hooks/useDados";
import { Alert } from "../utils/alert";
export function RevisaoContrato({ route, navigation }) {
  const id = route.params.extracaoId;
  const query = useDados(
    useCallback(async () => {
      const extracao = await api.ocrGet(id);
      const cliente = extracao.dados.cliente_id
        ? await api.getCliente(extracao.dados.cliente_id)
        : null;
      return { extracao, cliente };
    }, [id]),
  );
  return (
    <Screen title="Revisar importação" back query={query}>
      {query.data && (
        <Formulario initial={query.data} id={id} navigation={navigation} />
      )}
    </Screen>
  );
}
function Formulario({ initial, id, navigation }) {
  const { extracao } = initial;
  const [form, setForm] = useState(() => initialContrato(extracao.dados));
  const [modo, setModo] = useState(
    initial.cliente
      ? "existente"
      : extracao.dados.cliente_novo || extracao.dados.cliente_nome
        ? "novo"
        : "existente",
  );
  const [cliente, setCliente] = useState(initial.cliente);
  const [nome, setNome] = useState(
    extracao.dados.cliente_novo?.nome_razao_social ||
      extracao.dados.cliente_nome ||
      "",
  );
  const [cpf, setCpf] = useState(
    extracao.dados.cliente_novo?.cpf_cnpj || extracao.dados.cpf_cnpj || "",
  );
  const [datas, setDatas] = useState(
    (extracao.dados.vencimentos || []).join(", "),
  );
  const [revisado, setRevisado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function alteracao(setter, value) {
    setter(value);
    setRevisado(false);
    setNotice("");
  }
  function dados() {
    return {
      ...payloadContrato(form),
      ...(modo === "novo"
        ? {
            cliente_novo: {
              nome_razao_social: nome.trim(),
              cpf_cnpj: cpf.trim(),
            },
          }
        : { cliente_id: cliente?.id }),
      ...(datas.trim()
        ? { vencimentos: datas.split(",").map((data) => data.trim()) }
        : {}),
    };
  }
  async function salvar(confirmar) {
    if (busy) return;
    setError("");
    setNotice("");
    if (confirmar && !revisado)
      return setError("Confirme que revisou os dados antes de importar.");
    if (confirmar && modo === "existente" && !cliente)
      return setError("Selecione um cliente ou cadastre um novo na revisão.");
    setBusy(true);
    try {
      if (confirmar) {
        const result = await api.ocrConfirmar(id, dados());
        navigation.replace("DetalheContrato", {
          contratoId: result.contrato_id,
        });
      } else {
        await api.ocrUpdate(id, dados());
        setNotice("Revisão salva. Nenhum contrato foi criado.");
        setRevisado(false);
      }
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  function cancelar() {
    Alert.alert(
      "Cancelar importação",
      "A extração pendente e seu arquivo serão removidos.",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar importação",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            setError("");
            try {
              await api.ocrCancel(id);
              navigation.popTo("MainTabs", { screen: "Inicio" });
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
  if (extracao.status !== "PENDENTE")
    return (
      <View style={s.panel}>
        <Text style={s.text}>
          Esta extração já foi confirmada e não pode ser importada novamente.
        </Text>
        <SecondaryButton title="Voltar" onPress={() => navigation.goBack()} />
      </View>
    );
  return (
    <View style={s.panel}>
      <Text style={s.heading}>{extracao.nome_original}</Text>
      <Text style={s.note}>
        Confiança estimada da leitura: {extracao.confianca}%. Confira todos os
        campos; a leitura automática pode falhar.
      </Text>
      <View style={s.row}>
        {["existente", "novo"].map((value) => (
          <FilterChip
            key={value}
            label={value === "novo" ? "Novo cliente" : "Cliente existente"}
            active={modo === value}
            onPress={() => !busy && alteracao(setModo, value)}
          />
        ))}
      </View>
      {modo === "novo" ? (
        <>
          <Input
            label="Nome do novo cliente"
            value={nome}
            onChangeText={(value) => alteracao(setNome, value)}
            editable={!busy}
          />
          <Input
            label="CPF/CNPJ do novo cliente"
            value={cpf}
            onChangeText={(value) => alteracao(setCpf, value)}
            keyboardType="numeric"
            editable={!busy}
          />
        </>
      ) : (
        <ClientePicker
          value={cliente}
          onChange={(value) => alteracao(setCliente, value)}
          disabled={busy}
        />
      )}
      <CamposContrato
        form={form}
        onChange={(key, value) => alteracao(setForm, { ...form, [key]: value })}
        disabled={busy}
      />
      <Input
        label="Vencimentos personalizados (opcional)"
        value={datas}
        onChangeText={(value) => alteracao(setDatas, value)}
        editable={!busy}
      />
      <Text style={s.note}>
        Sem lista personalizada, o início é o primeiro vencimento; os próximos
        são mensais.
      </Text>
      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityLabel="Revisei os dados da importação"
        accessibilityState={{ checked: revisado, disabled: busy }}
        disabled={busy}
        onPress={() => setRevisado((old) => !old)}
        style={[s.row, { paddingVertical: 12 }]}
      >
        <Text style={s.heading}>{revisado ? "☑" : "☐"}</Text>
        <Text style={[s.text, s.flex]}>
          Revisei os dados e confirmo a criação do contrato e das parcelas.
        </Text>
      </TouchableOpacity>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityRole="alert" style={s.note}>
          {notice}
        </Text>
      ) : null}
      <SecondaryButton
        title="Salvar revisão"
        disabled={busy}
        onPress={() => salvar(false)}
      />
      <PrimaryButton
        title={busy ? "Aguarde..." : "Confirmar importação"}
        disabled={busy}
        onPress={() => salvar(true)}
      />
      <SecondaryButton
        title="Cancelar importação"
        danger
        disabled={busy}
        onPress={cancelar}
      />
    </View>
  );
}
