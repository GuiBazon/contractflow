import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { StatusBadge } from './StatusBadge';

export function ContractCard({ contrato, onPress }) {
  const progress = contrato.total_parcelas > 0
    ? contrato.parcelas_pagas / contrato.total_parcelas
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.nome} numberOfLines={1}>{contrato.nome}</Text>
        <StatusBadge status={contrato.status} />
      </View>
      <Text style={styles.cliente}>{contrato.cliente}</Text>
      <Text style={styles.codigo}>{contrato.codigo}</Text>
      <View style={styles.footer}>
        <Text style={styles.valor}>{formatCurrency(contrato.valor_total)}</Text>
        <Text style={styles.parcelas}>{contrato.parcelas_pagas}/{contrato.total_parcelas} parcelas</Text>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  nome: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  cliente: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  codigo: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  valor: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  parcelas: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  progressBg: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
