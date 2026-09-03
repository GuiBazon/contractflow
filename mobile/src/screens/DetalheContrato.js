import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';
import { contratos } from '../data';
import { Header, StatusBadge, InstallmentCard, TimelineItem, PrimaryButton } from '../components';

const tabs = [
  { key: 'parcelas', label: 'Parcelas', icon: 'layers-outline' },
  { key: 'pagamentos', label: 'Pagamentos', icon: 'cash-outline' },
  { key: 'timeline', label: 'Timeline', icon: 'time-outline' },
];

export function DetalheContrato() {
  const route = useRoute();
  const navigation = useNavigation();
  const [tab, setTab] = useState('parcelas');

  const contrato = contratos.find((c) => c.id === route.params?.contratoId);
  if (!contrato) return null;

  const progress = contrato.total_parcelas > 0
    ? contrato.parcelas_pagas / contrato.total_parcelas
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Detalhes" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <Text style={styles.nome}>{contrato.nome}</Text>
              <Text style={styles.cliente}>{contrato.cliente}</Text>
              <Text style={styles.codigo}>{contrato.codigo}</Text>
            </View>
            <StatusBadge status={contrato.status} size="medium" />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="wallet-outline" size={16} color={colors.primary} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Valor total</Text>
                <Text style={styles.infoValue}>{formatCurrency(contrato.valor_total)}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Parcelas</Text>
                <Text style={styles.infoValue}>{contrato.parcelas_pagas}/{contrato.total_parcelas}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progresso</Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={t.icon} size={16} color={tab === t.key ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {tab === 'parcelas' && contrato.parcelas.map((p) => (
            <InstallmentCard key={p.id} parcela={p} />
          ))}

          {tab === 'pagamentos' &&
            (contrato.parcelas.filter((p) => p.status === 'PAGO').length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="cash-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>Nenhum pagamento registrado</Text>
              </View>
            ) : (
              contrato.parcelas.filter((p) => p.status === 'PAGO').map((p) => (
                <InstallmentCard key={p.id} parcela={p} />
              ))
            ))}

          {tab === 'timeline' && (
            <View style={styles.timeline}>
              <TimelineItem
                title="Contrato criado"
                date={formatDate(contrato.data_inicio)}
                description={`Contrato ${contrato.codigo} registrado no sistema`}
                icon="document-text-outline"
              />
              <TimelineItem
                title={`${contrato.parcelas_pagas} parcelas pagas`}
                date={`Último: ${formatDate(contrato.parcelas.find((p) => p.status === 'PAGO')?.data_pagamento || contrato.data_inicio)}`}
                description={`${formatCurrency(contrato.parcelas_pagas * contrato.valor_parcela)} recebidos`}
                icon="checkmark-circle-outline"
                isLast
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Registrar pagamento"
          onPress={() => {
            const proxima = contrato.parcelas.find(
              (p) => p.status === 'EM ABERTO' || p.status === 'ATRASADO'
            );
            if (proxima) {
              navigation.navigate('RegistrarPagamento', {
                contratoId: contrato.id,
                parcelaNumero: proxima.numero,
              });
            }
          }}
        />
      </View>
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
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  nome: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cliente: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  codigo: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  progressSection: {},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  progressPct: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  progressBg: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  tabContent: {
    minHeight: 200,
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.sm,
  },
  emptyTabText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  timeline: {
    paddingLeft: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
