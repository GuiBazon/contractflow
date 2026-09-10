import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { Header, Input, PrimaryButton, SecondaryButton, LoadingState, ErrorState } from '../components';
import { api, normalizarErro } from '../services/api';

export function FormCliente() {
  const route = useRoute();
  const navigation = useNavigation();
  const clienteId = route.params?.clienteId;

  const [carregando, setCarregando] = useState(Boolean(clienteId));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    nome_razao_social: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    observacoes: '',
  });

  function setCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  useEffect(() => {
    if (!clienteId) return;
    let ativo = true;
    async function carregar() {
      try {
        setErro('');
        const cliente = await api.getCliente(clienteId);
        if (!ativo) return;
        setForm({
          nome_razao_social: cliente.nome_razao_social || '',
          cpf_cnpj: cliente.cpf_cnpj || '',
          email: cliente.email || '',
          telefone: cliente.telefone || '',
          cep: cliente.cep || '',
          logradouro: cliente.logradouro || '',
          numero: cliente.numero || '',
          complemento: cliente.complemento || '',
          bairro: cliente.bairro || '',
          cidade: cliente.cidade || '',
          estado: cliente.estado || '',
          observacoes: cliente.observacoes || '',
        });
      } catch (e) {
        setErro(normalizarErro(e));
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [clienteId]);

  async function handleSalvar() {
    setErro('');
    if (!form.nome_razao_social.trim()) {
      setErro('Informe o nome ou razão social.');
      return;
    }
    if (!form.cpf_cnpj.trim()) {
      setErro('Informe o CPF/CNPJ.');
      return;
    }

    const dados = {
      nome_razao_social: form.nome_razao_social.trim(),
      cpf_cnpj: form.cpf_cnpj.replace(/\D/g, ''),
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      cep: form.cep.trim() || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim().toUpperCase() || null,
      observacoes: form.observacoes.trim() || null,
    };

    setSalvando(true);
    try {
      if (clienteId) {
        await api.updateCliente(clienteId, dados);
      } else {
        await api.createCliente(dados);
      }
      if (route.params?.callback) {
        route.params.callback(true);
      }
      navigation.goBack();
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    if (!clienteId) return;
    Alert.alert('Excluir cliente', 'Deseja realmente excluir este cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setSalvando(true);
          try {
            await api.deleteCliente(clienteId);
            if (route.params?.callback) {
              route.params.callback(true);
            }
            navigation.goBack();
          } catch (e) {
            setErro(normalizarErro(e));
            setSalvando(false);
          }
        },
      },
    ]);
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title={clienteId ? 'Editar cliente' : 'Novo cliente'} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingState message="Carregando cliente..." />
      </SafeAreaView>
    );
  }

  if (erro && carregando === false && !clienteId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Novo cliente" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorState message={erro} onRetry={() => setErro('')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title={clienteId ? 'Editar cliente' : 'Novo cliente'}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {erro ? <Text style={styles.erroTexto}>{erro}</Text> : null}

          <Text style={styles.sectionTitle}>Dados principais</Text>
          <Input
            label="Nome / Razão social *"
            placeholder="Nome da pessoa ou empresa"
            value={form.nome_razao_social}
            onChangeText={(v) => setCampo('nome_razao_social', v)}
            autoCapitalize="words"
          />
          <Input
            label="CPF/CNPJ *"
            placeholder="Somente números"
            value={form.cpf_cnpj}
            onChangeText={(v) => setCampo('cpf_cnpj', v)}
            keyboardType="numeric"
          />
          <Input
            label="E-mail"
            placeholder="email@exemplo.com"
            value={form.email}
            onChangeText={(v) => setCampo('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={form.telefone}
            onChangeText={(v) => setCampo('telefone', v)}
            keyboardType="phone-pad"
          />

          <Text style={styles.sectionTitle}>Endereço</Text>
          <Input
            label="CEP"
            placeholder="00000-000"
            value={form.cep}
            onChangeText={(v) => setCampo('cep', v)}
            keyboardType="numeric"
          />
          <Input
            label="Logradouro"
            placeholder="Rua / Avenida"
            value={form.logradouro}
            onChangeText={(v) => setCampo('logradouro', v)}
          />
          <View style={styles.row2}>
            <View style={styles.flexSm}>
              <Input
                label="Número"
                placeholder="123"
                value={form.numero}
                onChangeText={(v) => setCampo('numero', v)}
              />
            </View>
            <View style={styles.flexLg}>
              <Input
                label="Complemento"
                placeholder="Apto, bloco..."
                value={form.complemento}
                onChangeText={(v) => setCampo('complemento', v)}
              />
            </View>
          </View>
          <Input
            label="Bairro"
            placeholder="Bairro"
            value={form.bairro}
            onChangeText={(v) => setCampo('bairro', v)}
          />
          <View style={styles.row2}>
            <View style={styles.flexLg}>
              <Input
                label="Cidade"
                placeholder="Cidade"
                value={form.cidade}
                onChangeText={(v) => setCampo('cidade', v)}
              />
            </View>
            <View style={styles.flexSm}>
              <Input
                label="UF"
                placeholder="SP"
                maxLength={2}
                value={form.estado}
                onChangeText={(v) => setCampo('estado', v)}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Observações</Text>
          <Input
            label="Observações"
            placeholder="Informações adicionais"
            value={form.observacoes}
            onChangeText={(v) => setCampo('observacoes', v)}
            multiline
          />

          {salvando ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <PrimaryButton title={clienteId ? 'Salvar alterações' : 'Cadastrar cliente'} onPress={handleSalvar} />
              {clienteId ? (
                <>
                  <View style={styles.spacer} />
                  <SecondaryButton title="Excluir cliente" onPress={handleExcluir} danger />
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  erroTexto: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexSm: {
    flex: 0.35,
  },
  flexLg: {
    flex: 0.65,
  },
  spacer: {
    marginVertical: spacing.xs,
  },
});