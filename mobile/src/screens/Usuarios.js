import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Screen, QueryResult, Pager, s } from "../components/SprintUI";
import {
  Input,
  PrimaryButton,
  SecondaryButton,
  FilterChip,
} from "../components";
import { api, normalizarErro } from "../services/api";
import { limparSessao } from "../services/storage";
import { voltarAoLogin } from "../navigation/navigationRef";
import useDados from "../hooks/useDados";
export function Usuarios({ navigation }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = useDados(
    useCallback(
      () => api.listUsuarios({ q: q || undefined, page, limit: 20 }),
      [q, page],
    ),
  );
  return (
    <Screen title="Usuários" back>
      <Text style={s.note}>
        Área de administradores. As alterações revogam as sessões do usuário
        editado; dados de contas desativadas são preservados.
      </Text>
      <Input
        label="Buscar usuários"
        value={q}
        onChangeText={(value) => {
          setQ(value);
          setPage(1);
        }}
      />
      <QueryResult query={query}>
        {query.data?.data.map((usuario) => (
          <View key={usuario.id} style={s.panel}>
            <Text style={s.heading}>{usuario.nome}</Text>
            <Text style={s.text}>{usuario.email}</Text>
            <Text style={s.note}>
              {usuario.perfil === "ADMIN" ? "Administrador" : "Usuário"} ·{" "}
              {usuario.ativo ? "Ativo" : "Desativado"}
            </Text>
            <SecondaryButton
              title={"Editar " + usuario.nome}
              onPress={() =>
                navigation.navigate("UsuarioForm", { usuarioId: usuario.id })
              }
            />
          </View>
        ))}
        {query.data?.data.length === 0 && (
          <Text style={s.note}>Nenhum usuário encontrado.</Text>
        )}
        <Pager paginacao={query.data?.paginacao} onPage={setPage} />
      </QueryResult>
    </Screen>
  );
}
export function UsuarioForm({ route, navigation }) {
  const id = route.params.usuarioId;
  const query = useDados(
    useCallback(() => Promise.all([api.getUsuario(id), api.me()]), [id]),
  );
  return (
    <Screen title="Editar usuário" back query={query}>
      {query.data && (
        <Formulario
          initial={query.data[0]}
          atual={query.data[1].usuario.id}
          navigation={navigation}
        />
      )}
    </Screen>
  );
}
function Formulario({ initial, atual, navigation }) {
  const [form, setForm] = useState({
    nome: initial.nome,
    email: initial.email,
    perfil: initial.perfil,
    ativo: Number(initial.ativo),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function campo(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }
  async function salvar() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.updateUsuario(initial.id, {
        ...form,
        nome: form.nome.trim(),
        email: form.email.trim(),
      });
      if (initial.id === atual) {
        await limparSessao();
        voltarAoLogin("Conta atualizada. Entre novamente.");
      } else navigation.goBack();
    } catch (err) {
      setError(normalizarErro(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.panel}>
      <Input
        label="Nome"
        value={form.nome}
        onChangeText={(value) => campo("nome", value)}
        editable={!busy}
      />
      <Input
        label="E-mail"
        value={form.email}
        onChangeText={(value) => campo("email", value)}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!busy}
      />
      <Text style={s.note}>Perfil</Text>
      <View style={s.row}>
        {["ADMIN", "USUARIO"].map((value) => (
          <FilterChip
            key={value}
            label={value === "ADMIN" ? "Administrador" : "Usuário"}
            active={form.perfil === value}
            onPress={() => !busy && campo("perfil", value)}
          />
        ))}
      </View>
      <Text style={s.note}>Situação da conta</Text>
      <View style={s.row}>
        {[1, 0].map((value) => (
          <FilterChip
            key={value}
            label={value ? "Ativo" : "Desativado"}
            active={form.ativo === value}
            onPress={() => !busy && campo("ativo", value)}
          />
        ))}
      </View>
      <Text style={s.note}>
        O último administrador ativo é protegido pela API.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        title={busy ? "Salvando..." : "Salvar usuário"}
        disabled={busy}
        onPress={salvar}
      />
    </View>
  );
}
