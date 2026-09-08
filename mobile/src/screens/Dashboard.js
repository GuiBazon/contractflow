import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { api, normalizarErro } from '../services/api';
import { getUsuario } from '../services/storage';
import { ContractFlowLogo, ErrorState, LoadingState } from '../components';

export function Dashboard() {
  const navigation = useNavigation();
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [contratos, setContratos] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [receitas, setReceitas] = useState([]);

  useEffect(() => {
    getUsuario().then((u) => setUsuario(u));
  }, []);

  useEffect(() => {
    async function carregar() {
      try {
        setErro('');
        const [contratosData, parcelasData, receitasData] = await Promise.all([
          api.listContratos({ limit: 100 }),
          api.listTodasParcelas(),
          api.listReceitas({ limit: 100 }),
        ]);
        setContratos(contratosData.data || []);
        setParcelas(parcelasData);
        setReceitas(receitasData.data || []);
      } catch (e) {
        setErro(normalizarErro(e));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const primeiroNome = usuario ? String(usuario.nome).split(' ')[0] : '';
  const avatarInicial = primeiroNome ? primeiroNome[0].toUpperCase() : 'A';

  const totalReceber = contratos
    .filter((c) => c.status === 'ATIVO')
    .reduce((sum, c) => sum + Number(c.pendente || 0), 0);

  const totalAtraso = parcelas
    .filter((p) => p.situacao === 'VENCIDA')
    .reduce((sum, p) => sum + Number(p.valor || 0), 0);

  const proximosVencimentos = parcelas
    .filter((p) => p.situacao === 'PENDENTE' || p.situacao === 'VENCIDA')
    .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      valor: p.valor,
      data_vencimento: p.data_vencimento,
      cliente: p.cliente_nome,
    }));

  const agora = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    meses.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }) });
  }

  const recebimentos = meses.map((mes) =>
    receitas
      .filter((r) => {
        const d = new Date(r.data_pagamento);
        return `${d.getFullYear()}-${d.getMonth()}` === mes.chave;
      })
      .reduce((s, r) => s + Number(r.valor || 0), 0)
  );
  const maxReceb = Math.max(...recebimentos, 1);

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Carregando dashboard..." />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message={erro} onRetry={() => setCarregando(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ContractFlowLogo size={28} fontSize={typography.sizes.xl} />
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Contratos')}>
              <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Mais')}>
              <Text style={styles.avatarText}>{avatarInicial}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Olá, {primeiroNome}</Text>
          <Text style={styles.sub}>Veja o que merece atenção hoje.</Text>
        </View>

        <View style={styles.cardsRow}>
          <TouchableOpacity style={[styles.card, styles.cardReceber]} activeOpacity={0.8}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="trending-up" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardLabel}>Valor a receber</Text>
            <Text style={styles.cardValue}>{formatCurrency(totalReceber)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, styles.cardAtraso]} activeOpacity={0.8}>
            <View style={[styles.cardIconWrap, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
            </View>
            <Text style={styles.cardLabel}>Em atraso</Text>
            <Text style={[styles.cardValue, { color: colors.danger }]}>{formatCurrency(totalAtraso)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ContratoForm')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="add" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Novo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ImportarContrato')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Importar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Contratos')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="list" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos vencimentos</Text>
          </View>
          {proximosVencimentos.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhum vencimento pendente</Text>
            </View>
          ) : (
            proximosVencimentos.map((p) => (
              <View key={p.id} style={styles.vencItem}>
                <View style={[styles.vencDot, { backgroundColor: colors.warning }]} />
                <View style={styles.vencInfo}>
                  <Text style={styles.vencValor}>{formatCurrency(p.valor)}</Text>
                  <Text style={styles.vencCliente}>{p.cliente}</Text>
                </View>
                <Text style={styles.vencData}>{String(p.data_vencimento).split('T')[0].split('-').reverse().join('/')}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recebimentos</Text>
            <Text style={styles.periodo}>Últimos 6 meses</Text>
          </View>
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {meses.map((mes, i) => (
                <View key={mes.chave} style={styles.barCol}>
                  <Text style={styles.barValue}>{`${(recebimentos[i] / 1000).toFixed(0)}k`}</Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.bar, { height: `${Math.max((recebimentos[i] / maxReceb) * 100, 2)}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{mes.rotulo.split('.').join('')}</Text>
                </View>
              ))}
            </View>
          </View>
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
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  avatarText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: typography.sizes.md,
  },
  greetingSection: {
    marginBottom: spacing.xxl,
  },
  greeting: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sub: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.lg,
  },
  cardReceber: {
    backgroundColor: colors.primaryLight,
  },
  cardAtraso: {
    backgroundColor: colors.dangerLight,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  periodo: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 24,
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
  vencItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vencDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  vencInfo: {
    flex: 1,
  },
  vencValor: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  vencCliente: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  vencData: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  barWrap: {
    height: 100,
    width: 28,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});