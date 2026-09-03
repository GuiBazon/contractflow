import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  Switch, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../utils/theme';
import { formatCurrency } from '../utils/format';
import { contratos } from '../data';
import { Header, Input, PrimaryButton, StatusBadge } from '../components';

export function RegistrarPagamento() {
  const route = useRoute();
  const navigation = useNavigation();
  const contrato = contratos.find((c) => c.id === route.params?.contratoId);
  const parcela = contrato?.parcelas.find((p) => p.numero === route.params?.parcelaNumero);

  const [valorPago, setValorPago] = useState(parcela ? String(parcela.valor) : '');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [metodo, setMetodo] = useState('PIX');
  const [aplicarDesconto, setAplicarDesconto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const metodosDisponiveis = ['PIX', 'Transferência', 'Boleto', 'Cartão de Crédito', 'Dinheiro'];

  if (!contrato || !parcela) return null;

  async function handleConfirmar() {
    setCarregando(true);
    await new Promise((r) => setTimeout(r, 600));
    setCarregando(false);
    setSucesso(true);
  }

  if (sucesso) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Pagamento registrado!</Text>
          <Text style={styles.successMessage}>
            A parcela #{parcela.numero} de {contrato.nome} foi marcada como paga.
          </Text>
          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Valor</Text>
              <Text style={styles.successValue}>{formatCurrency(Number(valorPago))}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Método</Text>
              <Text style={styles.successValue}>{metodo}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Data</Text>
              <Text style={styles.successValue}>{dataPagamento}</Text>
            </View>
          </View>
          <PrimaryButton title="Voltar ao contrato" onPress={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Registrar pagamento" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.contratoCard}>
          <Text style={styles.contratoNome}>{contrato.nome}</Text>
          <Text style={styles.contratoCliente}>{contrato.cliente}</Text>
          <Text style={styles.contratoCodigo}>{contrato.codigo}</Text>
          <View style={styles.parcelaRow}>
            <Text style={styles.parcelaLabel}>Parcela</Text>
            <StatusBadge status={parcela.status} />
          </View>
          <Text style={styles.parcelaValor}>{formatCurrency(parcela.valor)}</Text>
          <Text style={styles.parcelaData}>Vencimento: {parcela.data_vencimento}</Text>
        </View>

        <Text style={styles.sectionTitle}>Dados do pagamento</Text>

        <Input
          label="Valor pago"
          placeholder="0,00"
          value={valorPago}
          onChangeText={setValorPago}
          keyboardType="numeric"
        />

        <Input
          label="Data do pagamento"
          placeholder="AAAA-MM-DD"
          value={dataPagamento}
          onChangeText={setDataPagamento}
        />

        <Text style={styles.metodoLabel}>Método de pagamento</Text>
        <View style={styles.metodos}>
          {metodosDisponiveis.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.metodoItem, metodo === m && styles.metodoItemActive]}
              onPress={() => setMetodo(m)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={metodo === m ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={metodo === m ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.metodoText, metodo === m && styles.metodoTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.descontoRow}>
          <View style={styles.descontoTextWrap}>
            <Text style={styles.descontoTitle}>Aplicar desconto</Text>
            <Text style={styles.descontoSub}>Desconto por pagamento antecipado</Text>
          </View>
          <Switch
            value={aplicarDesconto}
            onValueChange={setAplicarDesconto}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <PrimaryButton title="Confirmar pagamento" onPress={handleConfirmar} />
        )}
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
  contratoCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  contratoNome: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  contratoCliente: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contratoCodigo: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  parcelaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  parcelaLabel: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  parcelaValor: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  parcelaData: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  metodoLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metodos: {
    marginBottom: spacing.lg,
  },
  metodoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metodoItemActive: {},
  metodoText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  metodoTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  descontoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  descontoTextWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  descontoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  descontoSub: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  successContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successMessage: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  successLabel: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  successValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
});
