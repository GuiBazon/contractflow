import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../utils/theme';
import { formatCurrency } from '../utils/format';
import { transacoes } from '../data';
import { Header, FilterChip, FinancialCard } from '../components';

const filtros = ['Todas', 'Entradas', 'Saídas'];

export function Financeiro() {
  const [filtro, setFiltro] = useState('Todas');

  const filtradas = transacoes.filter((t) => {
    if (filtro === 'Todas') return true;
    return filtro === 'Entradas' ? t.tipo === 'ENTRADA' : t.tipo === 'SAIDA';
  });

  const saldo = transacoes.reduce((sum, t) =>
    sum + (t.tipo === 'ENTRADA' ? t.valor : -t.valor), 0);

  const entradas = transacoes.filter((t) => t.tipo === 'ENTRADA').reduce((s, t) => s + t.valor, 0);
  const saidas = transacoes.filter((t) => t.tipo === 'SAIDA').reduce((s, t) => s + t.valor, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Financeiro" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.cardsRow}>
          <View style={[styles.card, styles.cardEntradas]}>
            <Text style={styles.cardLabel}>Entradas</Text>
            <Text style={[styles.cardValue, { color: colors.success }]}>{formatCurrency(entradas)}</Text>
          </View>
          <View style={[styles.card, styles.cardSaidas]}>
            <Text style={styles.cardLabel}>Saídas</Text>
            <Text style={[styles.cardValue, { color: colors.danger }]}>{formatCurrency(saidas)}</Text>
          </View>
        </View>

        <View style={styles.saldoCard}>
          <View style={styles.saldoTop}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={styles.saldoLabel}>Saldo total</Text>
          </View>
          <Text style={styles.saldoValue}>{formatCurrency(saldo)}</Text>
        </View>

        <View style={styles.filtrosRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filtros.map((f) => (
              <FilterChip key={f} label={f} active={filtro === f} onPress={() => setFiltro(f)} />
            ))}
          </ScrollView>
        </View>

        <Text style={styles.sectionTitle}>Transações</Text>
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
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.lg,
  },
  cardEntradas: {
    backgroundColor: colors.successLight,
  },
  cardSaidas: {
    backgroundColor: colors.dangerLight,
  },
  cardLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  saldoCard: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  saldoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  saldoLabel: {
    color: colors.white,
    fontSize: typography.sizes.md,
    opacity: 0.9,
  },
  saldoValue: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
  },
  filtrosRow: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
