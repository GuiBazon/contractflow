import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, typography, useThemeStyles } from '../theme';
import { formatCurrency } from '../utils/format';
import { StatusBadge } from './StatusBadge';

export function CalendarEvent({ evento, onPress }) {
  const { colors, styles } = useThemeStyles(createStyles);
  const coresStatus = {
    PAGO: colors.success,
    'EM ABERTO': colors.warning,
    FUTURO: colors.accent,
    ATRASADO: colors.danger,
    CONFIRMADO: colors.success,
    PENDENTE: colors.warning,
  };
  const cor = coresStatus[evento.status] || colors.textMuted;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cor, borderLeftWidth: 3 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{evento.hora === '00:00' ? 'Dia todo' : evento.hora}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.titulo}>{evento.titulo}</Text>
        <Text style={styles.cliente}>{evento.cliente}</Text>
        <View style={styles.footer}>
          <Text style={styles.codigo}>{evento.contrato_codigo}</Text>
          {evento.valor > 0 && <Text style={styles.valor}>{formatCurrency(evento.valor)}</Text>}
          <StatusBadge status={evento.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeContainer: {
    width: 56,
    marginRight: spacing.md,
    alignItems: 'center',
  },
  time: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  content: {
    flex: 1,
  },
  titulo: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cliente: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  codigo: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  valor: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
  },
});
