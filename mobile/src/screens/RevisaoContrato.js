import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { Header, PrimaryButton, SecondaryButton } from '../components';

const itens = [
  { id: 1, codigo: 'CT-2023-001', cliente: 'João Oliveira', valor: 15000, status: 'OK' },
  { id: 2, codigo: 'CT-2023-002', cliente: 'Maria Santos', valor: 20000, status: 'OK' },
  { id: 3, codigo: 'CT-2023-003', cliente: 'Carlos Pereira', valor: 8500, status: 'OK' },
  { id: 4, codigo: 'CT-2023-004', cliente: 'Empresa XPTO LTDA', valor: 45000, status: 'ATENÇÃO' },
  { id: 5, codigo: 'CT-2023-005', cliente: 'Fernanda Lima', valor: 12000, status: 'DUPLICADO' },
];

export function RevisaoContrato() {
  const navigation = useNavigation();
  const [confirma, setConfirma] = useState(false);

  const totalValor = itens.reduce((s, i) => s + i.valor, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Revisar importação" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{itens.length}</Text>
            <Text style={styles.summaryLabel}>Contratos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{itens.filter((i) => i.status === 'OK').length}</Text>
            <Text style={styles.summaryLabel}>Válidos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {itens.filter((i) => i.status !== 'OK').length}
            </Text>
            <Text style={styles.summaryLabel}>Atenção</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(totalValor)}</Text>
            <Text style={styles.summaryLabel}>Valor total</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contratos importados</Text>
        <View style={styles.list}>
          {itens.map((i) => (
            <View key={i.id} style={styles.item}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemCodigo}>{i.codigo}</Text>
                <Text style={styles.itemCliente}>{i.cliente}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemValor}>{formatCurrency(i.valor)}</Text>
                <Text style={[styles.itemStatus, i.status === 'OK' ? styles.statusOk : styles.statusWarn]}>
                  {i.status}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.alert}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <Text style={styles.alertText}>
            {itens.filter((i) => i.status !== 'OK').length} contrato(s) precisam de atenção. Verifique duplicados
            e dados incompletos antes de confirmar.
          </Text>
        </View>

        <View style={styles.confirmRow}>
          <Ionicons
            name={confirma ? 'checkbox' : 'square-outline'}
            size={22}
            color={colors.primary}
            onPress={() => setConfirma(!confirma)}
          />
          <TouchableOpacity onPress={() => setConfirma(!confirma)} style={styles.confirmTouch}>
            <Text style={styles.confirmText}>
              Confirmo que revisei os dados e desejo importar {itens.length} contratos.
            </Text>
          </TouchableOpacity>
        </View>

        <PrimaryButton
          title="Confirmar importação"
          disabled={!confirma}
          onPress={() => navigation.navigate('Mais')}
        />
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
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  list: {
    marginBottom: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemCodigo: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  itemCliente: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemValor: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  itemStatus: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statusOk: {
    color: colors.success,
  },
  statusWarn: {
    color: colors.warning,
  },
  alert: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  alertText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  confirmTouch: {
    flex: 1,
  },
  confirmText: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  spacer: {
    marginVertical: spacing.sm,
  },
});
