import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { api, normalizarErro } from '../services/api';
import { Header, SearchInput, FilterChip, ContractCard, EmptyState, LoadingState, ErrorState } from '../components';

const filtros = ['Todos', 'Ativos', 'Vencidos', 'Encerrados', 'Cancelados'];

const FILTRO_STATUS = {
  Todos: undefined,
  Ativos: 'ATIVO',
  Vencidos: undefined,
  Encerrados: 'ENCERRADO',
  Cancelados: 'CANCELADO',
};

function estaVencido(contrato, hojeISO) {
  return contrato.data_fim && contrato.status === 'ATIVO' && contrato.data_fim < hojeISO;
}

export function Contratos() {
  const navigation = useNavigation();
  const [filtro, setFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [contratos, setContratos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregarContratos() {
    try {
      setErro('');
      const data = await api.listContratos({
        q: busca,
        status: FILTRO_STATUS[filtro],
        limit: 100,
      });
      let lista = data.data || [];
      if (filtro === 'Vencidos') {
        const hoje = new Date();
        const h = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        lista = lista.filter((c) => estaVencido(c, h));
      }
      setContratos(lista);
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarContratos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, filtro]);

  useFocusEffect(
    useCallback(() => {
      carregarContratos();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca, filtro])
  );

  function abrirNovoContrato() {
    navigation.navigate('ContratoForm');
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Contratos" rightIcon="add-circle-outline" onRightPress={abrirNovoContrato} />
        <LoadingState message="Carregando contratos..." />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Contratos" rightIcon="add-circle-outline" onRightPress={abrirNovoContrato} />
        <ErrorState message={erro} onRetry={carregarContratos} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Contratos" rightIcon="add-circle-outline" onRightPress={abrirNovoContrato} />
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
            {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <FlatList
          data={contratos}
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
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={carregarContratos} tintColor={colors.primary} />
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