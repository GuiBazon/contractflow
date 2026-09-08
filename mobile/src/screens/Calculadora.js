import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { Header, Input, PrimaryButton, SecondaryButton } from '../components';
import { formatCurrency, hojeISO } from '../utils/format';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Cálculo de parcelas de um contrato novo.
// Regras iguais ao backend (financeiroService/contratoService):
//  - valor_parcela = valor_total / quantidade (a última absorve a diferença de centavos)
//  - vencimentos = data_inicio + N meses
//  - atraso: multa = valor × multa% / 100 (única vez)
//           juros = valor × juros% / 100 / 30 × diasAtraso (proporcional ao dia)
function simularParcelas({ valorTotal, quantidade, dataInicio, jurosMensal, multaPercentual }) {
  const base = Number((valorTotal / quantidade).toFixed(2));
  const valores = Array(quantidade).fill(base);
  const soma = base * quantidade;
  const diferenca = Number((valorTotal - soma).toFixed(2));
  valores[valores.length - 1] = Number((valores[valores.length - 1] + diferenca).toFixed(2));

  let [year, month, day] = String(dataInicio).split('-').map(Number);
  if (day === 1) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  const parcelas = valores.map((valor, i) => {
    const ultimoDia = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const dia = Math.min(day, ultimoDia);
    const dataVenc = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    const multicMontada = v => Number((v * multaPercentual / 100).toFixed(2));
    const juros30Dias = v => Number((v * jurosMensal / 100).toFixed(2));
    const jurosDia = v => Number((v * jurosMensal / 100 / 30).toFixed(2));

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return {
      numero: i + 1,
      valor,
      data_vencimento: dataVenc,
      multa: multicMontada(valor),
      juros_mes: juros30Dias(valor),
      juros_por_dia: jurosDia(valor),
    };
  });

  const totalComMultaJuros = parcelas.reduce((s, p) => s + p.valor + p.multa + p.juros_mes, 0);
  return { parcelas, totalComMultaJuros };
}

export function Calculadora() {
  const navigation = useNavigation();
  const [valorTotal, setValorTotal] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [juros, setJuros] = useState('');
  const [multa, setMulta] = useState('');
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);

  function validar() {
    const valor = Number(String(valorTotal).replace(',', '.'));
    if (!valor || Number.isNaN(valor) || valor <= 0) return 'Informe um valor total válido.';
    const qtd = Number(quantidade);
    if (!qtd || !Number.isInteger(qtd) || qtd < 1 || qtd > 120) return 'Informe a quantidade de parcelas (1 a 120).';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) return 'Data de início inválida (use AAAA-MM-DD).';
    return '';
  }

  function calcular() {
    const msg = validar();
    setErro(msg);
    if (msg) {
      setResultado(null);
      return;
    }
    const res = simularParcelas({
      valorTotal: Number(String(valorTotal).replace(',', '.')),
      quantidade: Number(quantidade),
      dataInicio,
      jurosMensal: Number(String(juros).replace(',', '.')) || 0,
      multaPercentual: Number(String(multa).replace(',', '.')) || 0,
    });
    setResultado(res);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Calculadora financeira" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.caption}>
          Simule parcelas, juros e multas de um contrato usando as mesmas regras do sistema.
        </Text>

        <Input label="Valor total (R$)" placeholder="24.000,00" value={valorTotal} onChangeText={setValorTotal} keyboardType="numeric" />
        <Input label="Quantidade de parcelas" placeholder="12" value={quantidade} onChangeText={setQuantidade} keyboardType="number-pad" />
        <Input label="Data de início (vencimentos a partir do mês seguinte)" placeholder="AAAA-MM-DD" value={dataInicio} onChangeText={setDataInicio} />
        <Input label="Juros ao mês (%) - para atrasos" placeholder="0,00" value={juros} onChangeText={setJuros} keyboardType="numeric" />
        <Input label="Multa (%) - por atraso" placeholder="0,00" value={multa} onChangeText={setMulta} keyboardType="numeric" />

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <PrimaryButton title="Calcular" onPress={calcular} />

        {resultado ? (
          <View style={styles.resultadoCard}>
            <Text style={styles.resultadoTitle}>Resultado da simulação</Text>
            {resultado.parcelas.map((p) => {
              const data = p.data_vencimento.split('-');
              return (
                <View key={p.numero} style={styles.parcelaRow}>
                  <View style={styles.parcelaInfo}>
                    <Text style={styles.parcelaNumero}>Parcela {String(p.numero).padStart(2, '0')}</Text>
                    <Text style={styles.parcelaData}>
                      Vence {Number(data[2])} {MESES[Number(data[1]) - 1]} {data[0]}
                    </Text>
                  </View>
                  <View style={styles.parcelaValores}>
                    <Text style={styles.parcelaValor}>{formatCurrency(p.valor)}</Text>
                    {p.multa > 0 || p.juros_mes > 0 ? (
                      <Text style={styles.parcelaExtra}>
                        multa {formatCurrency(p.multa)} • juros/mês {formatCurrency(p.juros_mes)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            <View style={styles.resumo}>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Valor total financiado</Text>
                <Text style={styles.resumoValue}>{formatCurrency(resultado.totalComMultaJuros)}</Text>
              </View>
              <Text style={styles.resumoHint}>
                Multa única de {formatCurrency(resultado.parcelas[0].multa)} e juros de {formatCurrency(resultado.parcelas[0].juros_mes)}/mês por parcela em atraso.
              </Text>
              <Text style={styles.resumoHint}>
                Os vencimentos são gerados no mesmo dia da data de início, no mês seguinte em diante.
              </Text>
            </View>

            <View style={styles.spacer} />
            <SecondaryButton title="Limpar" onPress={() => { setResultado(null); setErro(''); }} />
          </View>
        ) : null}
        <View style={styles.spacer} />
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
  caption: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  resultadoCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  resultadoTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  parcelaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  parcelaInfo: {
    flex: 1,
  },
  parcelaNumero: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  parcelaData: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  parcelaValores: {
    alignItems: 'flex-end',
  },
  parcelaValor: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  parcelaExtra: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  resumo: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resumoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  resumoValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  resumoHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  spacer: {
    marginVertical: spacing.md,
  },
});