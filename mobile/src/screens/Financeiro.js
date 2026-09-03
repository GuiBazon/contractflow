import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { transacoes, contratos } from '../data';
import { Header, FilterChip, FinancialCard } from '../components';

const filtros = ['Todas', 'Entradas', 'Saídas'];

export function Financeiro() {
  const [filtro, setFiltro] = useState('Todas');

  const recebimentoEsperado = contratos
    .filter((c) => c.status === 'ATIVO')
    .reduce((sum, c) => {
      const restante = c.parcelas
        .filter((p) => p.status !== 'PAGO')
        .reduce((s, p) => s + p.valor, 0);
      return sum + restante;
    }, 0);

  const totalRecebido = transacoes
    .filter((t) => t.tipo === 'ENTRADA')
    .reduce((s, t) => s + t.valor, 0);

  const filtradas = transacoes.filter((t) => {
    if (filtro === 'Todas') return true;
    return filtro === 'Entradas' ? t.tipo === 'ENTRADA' : t.tipo === 'SAIDA';
  });

  const meses = ['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'];
  const fluxo = [15000, 18000, 22000, 20000, 12000, 16000];
  const maxFluxo = Math.max(...fluxo);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Financeiro" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Recebimento Esperado</Text>
            <Text style={styles.cardValue}>{formatCurrency(recebimentoEsperado)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Recebido</Text>
            <Text style={[styles.cardValue, { color: colors.success }]}>{formatCurrency(totalRecebido)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fluxo de Caixa (6 Meses)</Text>
        </View>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {meses.map((mes, i) => (
              <View key={mes} style={styles.barCol}>
                <Text style={styles.barValue}>{`${(fluxo[i] / 1000).toFixed(0)}k`}</Text>
                <View style={styles.barWrap}>
                  <View style={[styles.bar, { height: `${(fluxo[i] / maxFluxo) * 100}%` }]} />
                </View>
                <Text style={styles.barLabel}>{mes}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Transações Recentes</Text>
          <View style={styles.filtrosRow}>
            {filtros.map((f) => (
              <FilterChip key={f} label={f} active={filtro === f} onPress={() => setFiltro(f)} />
            ))}
          </View>
        </View>

        <View style={styles.transacoes}>
          {filtradas.map((t) => (
            <FinancialCard key={t.id} transacao={t} />
          ))}
          {filtradas.length === 0 && (
            <TouchableOpacity style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
            </TouchableOpacity>
          )}
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
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
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
  transactionsHeader: {
    marginBottom: spacing.md,
  },
  filtrosRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  transacoes: {
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
});
