import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { api, normalizarErro } from '../services/api';
import { Header, Input, PrimaryButton, SecondaryButton, LoadingState, ErrorState } from '../components';
import { formatarCPFCNPJ, soDigitos } from '../utils/format';

export function ClienteForm() {
  const route = useRoute();
  const navigation = useNavigation();
  const clienteId = route.params?.clienteId;
  const editando = Boolean(clienteId);

  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (!editando) return;
    async function carregar() {
      try {
        const cliente = await api.getCliente(clienteId);
        setNome(cliente.nome_razao_social || '');
        setCpfCnpj(cliente.cpf_cnpj || '');
        setEmail(cliente.email || '');
        setTelefone(cliente.telefone || '');
        setCep(cliente.cep || '');
        setLogradouro(cliente.logradouro || '');
        setNumero(cliente.numero || '');
        setComplemento(cliente.complemento || '');
        setBairro(cliente.bairro || '');
        setCidade(cliente.cidade || '');
        setEstado(cliente.estado || '');
        setObservacoes(cliente.observacoes || '');
      } catch (e) {
        setErro(normalizarErro(e));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [editando, clienteId]);

  function validar() {
    if (!nome.trim() || nome.trim().length < 2) return 'Informe o nome ou razão social.';
    const dig = soDigitos(cpfCnpj);
    if (!dig || (dig.length !== 11 && dig.length !== 14)) return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRe.test(email)) return 'Informe um e-mail válido.';
    if (estado && !/^[A-Za-z]{2}$/.test(estado)) return 'Estado deve ter 2 letras (UF).';
    return '';
  }

  async function handleSalvar() {
    const msg = validar();
    if (msg) {
      setErro(msg);
      return;
    }

    const dados = {
      nome_razao_social: nome.trim(),
      cpf_cnpj: soDigitos(cpfCnpj),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      cep: cep.trim() || null,
      logradouro: logradouro.trim() || null,
      numero: numero.trim() || null,
      complemento: complemento.trim() || null,
      bairro: bairro.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado.trim().toUpperCase() || null,
      observacoes: observacoes.trim() || null,
    };

    setSalvando(true);
    setErro('');
    try {
      if (editando) {
        await api.updateCliente(clienteId, dados);
      } else {
        await api.createCliente(dados);
      }
      navigation.goBack();
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert(
      'Excluir cliente',
      'Tem certeza que deseja excluir este cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setSalvando(true);
            setErro('');
            try {
              await api.deleteCliente(clienteId);
              navigation.goBack();
            } catch (e) {
              setErro(normalizarErro(e));
              setSalvando(false);
            }
          },
        },
      ]
    );
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title={editando ? 'Editar cliente' : 'Novo cliente'} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingState message="Carregando cliente..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={editando ? 'Editar cliente' : 'Novo cliente'} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Informações principais</Text>
        <Input label="Nome / Razão social *" placeholder="Ex.: Maria Silva LTDA" value={nome} onChangeText={setNome} autoCapitalize="words" />
        <Input label="CPF / CNPJ *" placeholder="000.000.000-00" value={cpfCnpj} onChangeText={(t) => setCpfCnpj(formatarCPFCNPJ(t))} keyboardType="numeric" maxLength={18} />
        <Input label="E-mail" placeholder="contato@empresa.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Telefone" placeholder="(00) 00000-0000" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />

        <Text style={styles.sectionTitle}>Endereço</Text>
        <Input label="CEP" placeholder="00000-000" value={cep} onChangeText={setCep} keyboardType="numeric" />
        <Input label="Logradouro" placeholder="Rua, avenida..." value={logradouro} onChangeText={setLogradouro} />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Input label="Número" placeholder="123" value={numero} onChangeText={setNumero} />
          </View>
          <View style={styles.rowItem}>
            <Input label="Complemento" placeholder="Apto 42" value={complemento} onChangeText={setComplemento} />
          </View>
        </View>
        <Input label="Bairro" placeholder="Centro" value={bairro} onChangeText={setBairro} />
        <View style={styles.row}>
          <View style={styles.rowCidade}>
            <Input label="Cidade" placeholder="São Paulo" value={cidade} onChangeText={setCidade} />
          </View>
          <View style={styles.rowUf}>
            <Input label="UF" placeholder="SP" value={estado} onChangeText={(t) => setEstado(t.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase())} maxLength={2} />
          </View>
        </View>
        <Input label="Observações" placeholder="Anotações sobre o cliente" value={observacoes} onChangeText={setObservacoes} multiline />

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        {salvando ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <PrimaryButton title={editando ? 'Salvar alterações' : 'Cadastrar cliente'} onPress={handleSalvar} />
        )}

        {editando && !salvando ? (
          <>
            <View style={styles.spacer} />
            <SecondaryButton title="Excluir cliente" danger onPress={confirmarExclusao} />
          </>
        ) : null}
        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  rowCidade: {
    flex: 2,
  },
  rowUf: {
    flex: 1,
  },
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  spacer: {
    marginVertical: spacing.xs,
  },
});