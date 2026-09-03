import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../utils/theme';
import { formatCurrency, formatDate } from '../utils/format';
import { StatusBadge } from './StatusBadge';

export function InstallmentCard({ parcela }) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.numero}>#{parcela.numero}</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.valor}>{formatCurrency(parcela.valor)}</Text>
        <Text style={styles.data}>{formatDate(parcela.data_vencimento)}</Text>
      </View>
      <StatusBadge status={parcela.status} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  left: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  numero: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  center: {
    flex: 1,
    marginRight: spacing.sm,
  },
  valor: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  data: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
