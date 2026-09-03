import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { Header, PrimaryButton, SecondaryButton } from '../components';

const campos = [
  { key: 'cliente', label: 'Cliente', value: 'Carol Antunes' },
  { key: 'cnpj', label: 'CNPJ', value: '12.871.002/0001-99' },
  { key: 'valor', label: 'Valor', value: 'R$ 24.000,00' },
  { key: 'parcelas', label: 'Parcelas', value: '12x de R$ 2.000,00' },
  { key: 'inicio', label: 'Início', value: '10/03/2026' },
  { key: 'vencimento', label: 'Vencimento', value: 'Dia 15 de cada mês' },
];

const confidence = [
  { field: 'Cliente', level: 'ALTA' },
  { field: 'CNPJ', level: 'ALTA' },
  { field: 'Valor', level: 'ALTA' },
  { field: 'Parcelas', level: 'MÉDIA' },
];

function ConfidenceBadge({ level }) {
  const cor =
    level === 'ALTA' ? colors.success
    : level === 'MÉDIA' ? colors.warning
    : colors.danger;
  const fundo =
    level === 'ALTA' ? colors.successLight
    : level === 'MÉDIA' ? colors.warningLight
    : colors.dangerLight;

  return (
    <View style={[styles.badge, { backgroundColor: fundo }]}>
      <Text style={[styles.badgeText, { color: cor }]}>{level}</Text>
    </View>
  );
}

export function RevisaoContrato() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Revisar informações" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.docHeader}>
          <View style={styles.docIcon}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName}>documento_contrato_carol.pdf</Text>
            <Text style={styles.docSize}>Confira os dados detectados pela IA</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dados detectados</Text>
        <View style={styles.fieldsCard}>
          {campos.map((c, i) => (
            <View key={c.key} style={[styles.fieldRow, i > 0 && styles.fieldBorder]}>
              <View style={styles.fieldInfo}>
                <Text style={styles.fieldLabel}>{c.label}</Text>
                <Text style={styles.fieldValue}>{c.value}</Text>
              </View>
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                <Text style={styles.editText}>Editar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Confiança da extração</Text>
        <View style={styles.confCard}>
          {confidence.map((c) => (
            <View key={c.field} style={styles.confRow}>
              <Text style={styles.confField}>{c.field}</Text>
              <ConfidenceBadge level={c.level} />
            </View>
          ))}
        </View>

        <PrimaryButton title="Confirmar importação" onPress={() => navigation.navigate('Mais')} />
        <View style={styles.spacer} />
        <SecondaryButton title="Voltar" onPress={() => navigation.goBack()} />
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
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  docSize: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldsCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  fieldBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fieldInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  fieldValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  editText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  confCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  spacer: {
    marginVertical: spacing.xs,
  },
});
