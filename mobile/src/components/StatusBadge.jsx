import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

export function StatusBadge({ status, size = 'small' }) {
  const scheme = {
    ATIVO: { bg: colors.primaryLight, text: colors.primary },
    VENCIDO: { bg: colors.dangerLight, text: colors.danger },
    ENCERRADO: { bg: colors.surface, text: colors.textSecondary },
    PAGO: { bg: colors.successLight, text: colors.success },
    'EM ABERTO': { bg: colors.warningLight, text: colors.warning },
    FUTURO: { bg: colors.surface, text: colors.textMuted },
    ATRASADO: { bg: colors.dangerLight, text: colors.danger },
    CONFIRMADO: { bg: colors.successLight, text: colors.success },
    PENDENTE: { bg: colors.warningLight, text: colors.warning },
    ALTA: { bg: colors.successLight, text: colors.success },
    MEDIA: { bg: colors.warningLight, text: colors.warning },
    BAIXA: { bg: colors.dangerLight, text: colors.danger },
  }[status] || { bg: colors.surface, text: colors.textSecondary };

  return (
    <View style={[styles.badge, { backgroundColor: scheme.bg }, size === 'medium' && styles.medium]}>
      <Text style={[styles.text, { color: scheme.text }, size === 'medium' && styles.textMedium]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  medium: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  textMedium: {
    fontSize: 13,
  },
});
