import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  Switch, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { formatCurrency } from '../utils/format';
import { api, normalizarErro } from '../services/api';
import { Header, Input, PrimaryButton, StatusBadge, LoadingState, ErrorState } from '../components';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatVencimento(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]}`;
}

export function RegistrarPagamento() {
  const route = useRoute();
  const navigation = useNavigation();
  const contratoId = route.params?.contratoId;
  const parcelaNumero = route.params?.parcelaNumero;

  const [contrato, setContrato] = useState(null);
  const [parcela, setParcela] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [valorPago, setValorPago] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [metodo, setMetodo] = useState('PIX');
  const [aplicarDesconto, setAplicarDesconto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const metodosDisponiveis = ['PIX', 'Transferência', 'Boleto', 'Cartão de Crédito', 'Dinheiro'];

  useEffect(() => {
    async function carregar() {
      try {
        setErro('');
        const [contratoData, parcelasData] = await Promise.all([
          api.getContrato(contratoId),
          api.listParcelas(contratoId),
        ]);
        setContrato(contratoData);
        const parcelas = parcelasData.data || [];
        const alvo = parcelaNumero
          ? parcelas.find((p) => String(p.numero) === String(parcelaNumero))
          : parcelas.find((p) => p.situacao === 'PENDENTE' || p.situacao === 'VENCIDA');
        setParcela(alvo || null);
        if (alvo) {
          setValorPago(String(alvo.valor));
        }
      } catch (e) {
        setErro(normalizarErro(e));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [contratoId, parcelaNumero]);

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Registrar pagamento" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <LoadingState message="Carregando parcela..." />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Registrar pagamento" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorState message={erro} onRetry={() => setCarregando(true)} />
      </SafeAreaView>
    );
  }

  if (!contrato || !parcela) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Registrar pagamento" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <ErrorState message="Nenhuma parcela em aberto para pagamento" onRetry={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  async function handleConfirmar() {
    setSalvando(true);
    try {
      await api.createPagamento(contratoId, {
        parcela_id: parcela.id,
        valor: Number(String(valorPago).replace(',', '.')),
        data_pagamento: dataPagamento,
        forma_pagamento: metodo,
      });
      setSucesso(true);
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (sucesso) {
    const nome = contrato.descricao || contrato.tipo || contrato.numero || 'contrato';
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Pagamento registrado!</Text>
          <Text style={styles.successMessage}>
            A parcela #{parcela.numero} de {nome} foi marcada como paga.
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

  const nome = contrato.descricao || contrato.tipo || contrato.numero || 'Contrato';
  const restante = Number(parcela.valor) - Number(parcela.pago || 0);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Registrar pagamento" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.contratoCard}>
          <View style={styles.parcelaRowTop}>
            <Text style={styles.parcelaResumo}>
              Parcela {String(parcela.numero).padStart(2, '0')} • {contrato.numero}
            </Text>
            <StatusBadge status={parcela.situacao || parcela.status} />
          </View>
          <Text style={styles.contratoNome}>{nome}</Text>
          <Text style={styles.contratoCliente}>{contrato.cliente_nome}</Text>
          <View style={styles.divider} />
          <Text style={styles.parcelaValor}>{formatCurrency(parcela.valor)}</Text>
          <Text style={styles.parcelaData}>Vencimento: {formatVencimento(parcela.data_vencimento)}</Text>
        </View>

        {erro ? (
          <Text style={styles.erroTexto}>{erro}</Text>
        ) : null}

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
            <Text style={styles.descontoSub}>Desconto por pagamento antecipado{restante > 0 && restante < Number(parcela.valor) ? ` (restam R$ ${restante.toFixed(2)})` : ''}</Text>
          </View>
          <Switch
            value={aplicarDesconto}
            onValueChange={setAplicarDesconto}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>

        {salvando ? (
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
  parcelaRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  parcelaResumo: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
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
  erroTexto: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginBottom: spacing.md,
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