import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { api, normalizarErro } from '../services/api';
import { Header, CalendarEvent, ErrorState, LoadingState } from '../components';

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function situacaoParaStatus(situacao) {
  if (situacao === 'VENCIDA') return 'ATRASADO';
  if (situacao === 'PAGA') return 'PAGO';
  return 'PENDENTE';
}

export function Agenda() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [diaSelecionado, setDiaSelecionado] = useState(hoje.getDate());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [parcelas, setParcelas] = useState([]);

  useEffect(() => {
    async function carregar() {
      try {
        setErro('');
        setParcelas(await api.listTodasParcelas());
      } catch (e) {
        setErro(normalizarErro(e));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const primeiroDia = new Date(ano, mes, 1);
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const offset = primeiroDia.getDay();

  const celulas = [];
  for (let i = 0; i < offset; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  const eventosAgenda = parcelas
    .filter((p) => p.situacao === 'PENDENTE' || p.situacao === 'VENCIDA')
    .map((p) => ({
      id: p.id,
      titulo: 'Vencimento Parcela',
      data: String(p.data_vencimento).split('T')[0],
      hora: '00:00',
      valor: Number(p.valor),
      status: situacaoParaStatus(p.situacao),
      contrato_codigo: p.contrato_numero,
      cliente: p.cliente_nome,
      parcela: p,
    }));

  const eventosDoDia = eventosAgenda.filter((e) => {
    const [y, m, d] = e.data.split('-').map(Number);
    return y === ano && m === mes + 1 && d === diaSelecionado;
  });

  const labelDia = String(diaSelecionado).padStart(2, '0');
  const nomeMes = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long' });

  function mudarMes(delta) {
    const d = new Date(ano, mes + delta, 1);
    setMes(d.getMonth());
    setAno(d.getFullYear());
    setDiaSelecionado(1);
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Calendário" />
        <LoadingState message="Carregando agenda..." />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Calendário" />
        <ErrorState message={erro} onRetry={() => setCarregando(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Calendário" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => mudarMes(-1)}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{`${nomeMes[0].toUpperCase()}${nomeMes.slice(1)} ${ano}`}</Text>
            <TouchableOpacity onPress={() => mudarMes(1)}>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {DIAS_SEMANA.map((d, i) => (
              <Text key={i} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {celulas.map((dia, i) => {
              if (dia === null) return <View key={`e${i}`} style={styles.dayCell} />;
              return (
                <TouchableOpacity
                  key={dia}
                  style={[styles.dayCell, dia === diaSelecionado && styles.daySelected]}
                  onPress={() => setDiaSelecionado(dia)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayText, dia === diaSelecionado && styles.dayTextSelected]}>
                    {dia}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Vencimentos em {labelDia} de {nomeMes}</Text>

        {eventosDoDia.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum evento neste dia</Text>
          </View>
        ) : (
          eventosDoDia.map((e) => <CalendarEvent key={e.id} evento={e} />)
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
  calendarCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  monthTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.semibold,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  dayText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
});