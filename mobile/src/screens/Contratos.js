import React, { useState } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { contratos } from '../data';
import { Header, SearchInput, FilterChip, ContractCard, EmptyState } from '../components';

const filtros = ['Todos', 'Ativos', 'Vencidos', 'Encerrados'];

export function Contratos() {
  const navigation = useNavigation();
  const [filtro, setFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');

  const filtrados = contratos.filter((c) => {
    const matchFiltro =
      filtro === 'Todos' ||
      (filtro === 'Ativos' && c.status === 'ATIVO') ||
      (filtro === 'Vencidos' && c.status === 'VENCIDO') ||
      (filtro === 'Encerrados' && c.status === 'ENCERRADO');
    const matchBusca =
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      c.codigo.toLowerCase().includes(busca.toLowerCase());
    return matchFiltro && matchBusca;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Contratos" rightIcon="add-circle-outline" />
      <View style={styles.body}>
        <SearchInput
          placeholder="Pesquisar contratos..."
          value={busca}
          onChangeText={setBusca}
        />
        <View style={styles.filtrosRow}>
          <FlatList
            data={filtros}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <FilterChip
                label={item}
                active={filtro === item}
                onPress={() => setFiltro(item)}
              />
            )}
            contentContainerStyle={styles.filtros}
          />
        </View>
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filtrados.length} contrato{filtrados.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <FlatList
          data={filtrados}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ContractCard
              contrato={item}
              onPress={() => navigation.navigate('DetalheContrato', { contratoId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="Nenhum contrato encontrado"
              message="Tente ajustar os filtros ou a busca."
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  filtrosRow: {
    marginTop: spacing.md,
  },
  filtros: {
    paddingRight: spacing.lg,
  },
  countRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  countText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
