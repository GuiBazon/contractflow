import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { StatusBadge } from './StatusBadge';

const statusColor = {
  PAGO: '#16A34A',
  'EM ABERTO': '#F59E0B',
  FUTURO: '#2563EB',
  ATRASADO: '#DC2626',
  CONFIRMADO: '#16A34A',
  PENDENTE: '#F59E0B',
};

export function CalendarEvent({ evento }) {
  const cor = statusColor[evento.status] || colors.textMuted;

  return (
    <View style={[styles.card, { borderLeftColor: cor, borderLeftWidth: 3 }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
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
    color: colors.primary,
  },
});
