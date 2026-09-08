import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

export function ClientCard({ cliente, onPress }) {
  const initials = cliente.nome_razao_social
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const doc = cliente.cpf_cnpj;
  const isCnpj = doc.replace(/\D/g, '').length > 11;
  const docLabel = isCnpj ? 'CNPJ' : 'CPF';
  const totalContratos =
    cliente.total_contratos !== undefined
      ? cliente.total_contratos
      : cliente.contratos_ativos;
  const contratosLabel = `${totalContratos} ${totalContratos === 1 ? 'Ativo' : 'Ativos'}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nome} numberOfLines={1}>{cliente.nome_razao_social}</Text>
        <Text style={styles.doc}>{docLabel} {doc}</Text>
        <Text style={styles.contratos}>{contratosLabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  initials: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  info: {
    flex: 1,
  },
  nome: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  doc: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contratos: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
});
