import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { api, normalizarErro } from '../services/api';
import { Header, FilterChip, FinancialCard, ErrorState, LoadingState } from '../components';

const filtros = ['Todas', 'Entradas', 'Saídas'];

export function Financeiro() {
  const [filtro, setFiltro] = useState('Todas');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [contratos, setContratos] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [despesas, setDespesas] = useState([]);

  useEffect(() => {
    async function carregar() {
      try {
        setErro('');
        const [contratosData, receitasData] = await Promise.all([
          api.listContratos({ limit: 100 }),
          api.listReceitas({ limit: 100 }),
        ]);
        setContratos(contratosData.data || []);
        setReceitas(receitasData.data || []);
        setDespesas([]);
      } catch (e) {
        setErro(normalizarErro(e));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const transacoes = [
    ...receitas.map((r) => ({
      id: `r${r.id}`,
      descricao: `Pagamento - ${r.contrato_numero} Parcela ${r.parcela_numero}`,
      valor: Number(r.valor),
      data: r.data_pagamento,
      tipo: 'ENTRADA',
      contrato_codigo: r.contrato_numero,
    })),
    ...despesas,
  ];

  const recebimentoEsperado = contratos
    .filter((c) => c.status === 'ATIVO')
    .reduce((sum, c) => sum + Number(c.pendente || 0), 0);

  const totalRecebido = receitas.reduce((s, r) => s + Number(r.valor || 0), 0);

  const filtradas = transacoes.filter((t) => {
    if (filtro === 'Todas') return true;
    return filtro === 'Entradas' ? t.tipo === 'ENTRADA' : t.tipo === 'SAIDA';
  });

  const agora = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    meses.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }) });
  }

  const fluxo = meses.map((mes) =>
    receitas
      .filter((r) => {
        const d = new Date(r.data_pagamento);
        return `${d.getFullYear()}-${d.getMonth()}` === mes.chave;
      })
      .reduce((s, r) => s + Number(r.valor || 0), 0)
  );
  const maxFluxo = Math.max(...fluxo, 1);

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Financeiro" />
        <LoadingState message="Carregando financeiro..." />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Financeiro" />
        <ErrorState message={erro} onRetry={() => setCarregando(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Financeiro" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Recebimento Esperado</Text>
            <Text style={styles.cardValue}>{formatCurrency(recebimentoEsperado)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Recebido</Text>
            <Text style={[styles.cardValue, { color: colors.success }]}>{formatCurrency(totalRecebido)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fluxo de Caixa (6 Meses)</Text>
        </View>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {meses.map((mes, i) => (
              <View key={mes.chave} style={styles.barCol}>
                <Text style={styles.barValue}>{`${(fluxo[i] / 1000).toFixed(0)}k`}</Text>
                <View style={styles.barWrap}>
                  <View style={[styles.bar, { height: `${Math.max((fluxo[i] / maxFluxo) * 100, 2)}%` }]} />
                </View>
                <Text style={styles.barLabel}>{mes.rotulo.split('.').join('')}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Transações Recentes</Text>
          <View style={styles.filtrosRow}>
            {filtros.map((f) => (
              <FilterChip key={f} label={f} active={filtro === f} onPress={() => setFiltro(f)} />
            ))}
          </View>
        </View>

        <View style={styles.transacoes}>
          {filtradas.slice(0, 20).map((t) => (
            <FinancialCard key={t.id} transacao={t} />
          ))}
          {filtradas.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
            </View>
          )}
        </View>
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
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  barWrap: {
    height: 100,
    width: 28,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  transactionsHeader: {
    marginBottom: spacing.md,
  },
  filtrosRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  transacoes: {
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
});