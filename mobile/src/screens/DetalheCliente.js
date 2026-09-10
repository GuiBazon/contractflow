import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { api, normalizarErro } from '../services/api';
import { Header, PrimaryButton, ContractCard, LoadingState, ErrorState } from '../components';

function formatDoc(doc) {
  if (!doc) return '';
  const d = String(doc).replace(/\D/g, '');
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

export function DetalheCliente() {
  const route = useRoute();
  const navigation = useNavigation();
  const clienteId = route.params?.clienteId;

  const [cliente, setCliente] = useState(null);
  const [contratos, setContratos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro('');
      const [clienteData, contratosData] = await Promise.all([
        api.getCliente(clienteId),
        api.listContratos({ cliente: clienteId, limit: 100 }),
      ]);
      setCliente(clienteData);
      setContratos(contratosData.data || []);
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setCarregando(false);
    }
  }, [clienteId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function handleEditar() {
    navigation.navigate('FormCliente', {
      clienteId,
      titulo: 'Editar cliente',
    });
  }

  function handleExcluir() {
    Alert.alert('Excluir cliente', `Deseja realmente excluir ${cliente.nome_razao_social}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setExcluindo(true);
          try {
            await api.deleteCliente(clienteId);
            navigation.goBack();
          } catch (e) {
            setErro(normalizarErro(e));
            setExcluindo(false);
          }
        },
      },
    ]);
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Cliente" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingState message="Carregando cliente..." />
      </SafeAreaView>
    );
  }

  if (erro || !cliente) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Cliente" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorState message={erro || 'Cliente não encontrado'} onRetry={carregar} />
      </SafeAreaView>
    );
  }

  const endereco = [cliente.logradouro, cliente.numero, cliente.bairro, cliente.cidade, cliente.estado]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Cliente" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {erro ? <Text style={styles.erroTexto}>{erro}</Text> : null}

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {cliente.nome_razao_social
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.nome}>{cliente.nome_razao_social}</Text>
            <Text style={styles.doc}>{formatDoc(cliente.cpf_cnpj)}</Text>
          </View>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Contatos</Text>
        </View>
        <View style={styles.infoCard}>
          {cliente.email ? (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
              <Text style={styles.infoValue}>{cliente.email}</Text>
            </View>
          ) : null}
          {cliente.telefone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text style={styles.infoValue}>{cliente.telefone}</Text>
            </View>
          ) : null}
          {!cliente.email && !cliente.telefone ? (
            <Text style={styles.infoEmpty}>Nenhum contato cadastrado</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Endereço</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.infoValue}>
              {endereco || (cliente.cep ? `CEP ${cliente.cep}` : 'Endereço não informado')}
            </Text>
          </View>
        </View>

        {cliente.observacoes ? (
          <>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoValue}>{cliente.observacoes}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Contratos ({contratos.length})</Text>
        <View>
          {contratos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhum contrato para este cliente</Text>
            </View>
          ) : (
            contratos.map((c) => (
              <ContractCard
                key={c.id}
                contrato={c}
                onPress={() => navigation.navigate('DetalheContrato', { contratoId: c.id })}
              />
            ))
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Editar cliente"
            onPress={handleEditar}
            disabled={excluindo}
          />
          <View style={styles.spacer} />
          <TouchableOpacity style={styles.excluirBtn} onPress={handleExcluir} activeOpacity={0.8} disabled={excluindo}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.excluirText}>{excluindo ? 'Excluindo...' : 'Excluir cliente'}</Text>
          </TouchableOpacity>
        </View>
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
  erroTexto: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  nome: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  doc: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    flex: 1,
  },
  infoEmpty: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.lg,
  },
  spacer: {
    marginVertical: spacing.xs,
  },
  excluirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  excluirText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },
});