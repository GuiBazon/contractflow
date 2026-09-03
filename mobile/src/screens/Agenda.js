import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { eventosAgenda } from '../data';
import { Header, CalendarEvent } from '../components';

const MES = 8;
const ANO = 2026;
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function Agenda() {
  const [diaSelecionado, setDiaSelecionado] = useState(15);

  const primeiroDia = new Date(ANO, MES, 1);
  const diasNoMes = new Date(ANO, MES + 1, 0).getDate();
  const offset = primeiroDia.getDay();

  const celulas = [];
  for (let i = 0; i < offset; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  const eventosDoDia = eventosAgenda.filter((e) => {
    const [y, m, d] = e.data.split('-').map(Number);
    return y === ANO && m === MES + 1 && d === diaSelecionado;
  });

  const labelDia = String(diaSelecionado).padStart(2, '0');

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Calendário" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>Setembro 2026</Text>
            <TouchableOpacity>
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

        <Text style={styles.sectionTitle}>Eventos em {labelDia} de Setembro</Text>

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
