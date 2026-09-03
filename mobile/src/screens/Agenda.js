import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { eventosAgenda } from '../data';
import { Header, FilterChip, CalendarEvent } from '../components';

const filtros = ['Hoje', 'Amanhã', 'Próximos 7 dias', 'Todos'];

export function Agenda() {
  const [filtro, setFiltro] = useState('Hoje');

  const filtrados = eventosAgenda.filter((e) => {
    if (filtro === 'Todos') return true;
    const dias = filtro === 'Hoje' ? 0 : filtro === 'Amanhã' ? 1 : 7;
    const diasDiferenca = (new Date(e.data) - new Date()) / (1000 * 3600 * 24);
    return diasDiferenca >= -0.5 && diasDiferenca <= dias;
  });

  const agrupados = {};
  filtrados.forEach((e) => {
    const chave = e.data;
    if (!agrupados[chave]) agrupados[chave] = [];
    agrupados[chave].push(e);
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Agenda" />
      <View style={styles.body}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
          {filtros.map((f) => (
            <FilterChip key={f} label={f} active={filtro === f} onPress={() => setFiltro(f)} />
          ))}
        </ScrollView>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {Object.keys(agrupados).sort().map((data) => (
            <View key={data} style={styles.dayGroup}>
              <Text style={styles.dayTitle}>{data}</Text>
              {agrupados[data].map((e) => (
                <CalendarEvent key={e.id} evento={e} />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  filtros: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  dayGroup: {
    marginBottom: spacing.lg,
  },
  dayTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
});
