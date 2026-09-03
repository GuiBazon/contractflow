import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../utils/theme';
import { formatCurrency, formatDate } from '../utils/format';

export function FinancialCard({ transacao }) {
  const isEntrada = transacao.tipo === 'ENTRADA';

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: isEntrada ? colors.successLight : colors.dangerLight }]}>
        <Ionicons
          name={isEntrada ? 'arrow-down' : 'arrow-up'}
          size={16}
          color={isEntrada ? colors.success : colors.danger}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.desc} numberOfLines={1}>{transacao.descricao}</Text>
        <Text style={styles.data}>{formatDate(transacao.data)}</Text>
      </View>
      <Text style={[styles.valor, { color: isEntrada ? colors.success : colors.danger }]}>
        {isEntrada ? '+' : '-'} {formatCurrency(transacao.valor)}
      </Text>
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  desc: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  data: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  valor: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
