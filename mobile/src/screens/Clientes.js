import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { api, normalizarErro } from '../services/api';
import { Header, SearchInput, ClientCard, EmptyState, LoadingState, ErrorState } from '../components';

export function Clientes() {
  const navigation = useNavigation();
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregarClientes() {
    try {
      setErro('');
      const data = await api.listClientes(busca);
      setClientes(data.data || []);
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  useFocusEffect(
    useCallback(() => {
      carregarClientes();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca])
  );

  function abrirNovoCliente() {
    navigation.navigate('ClienteForm');
  }

  function abrirCliente(cliente) {
    navigation.navigate('ClienteForm', { clienteId: cliente.id });
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Clientes" rightIcon="add-circle-outline" onRightPress={abrirNovoCliente} />
        <LoadingState message="Carregando clientes..." />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Clientes" rightIcon="add-circle-outline" onRightPress={abrirNovoCliente} />
        <ErrorState message={erro} onRetry={carregarClientes} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Clientes" rightIcon="add-circle-outline" onRightPress={abrirNovoCliente} />
      <View style={styles.body}>
        <SearchInput
          placeholder="Buscar clientes por nome ou CPF/CNPJ..."
          value={busca}
          onChangeText={setBusca}
        />
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <FlatList
          data={clientes}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ClientCard cliente={item} onPress={() => abrirCliente(item)} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Nenhum cliente encontrado"
              message="Toque em + para cadastrar seu primeiro cliente."
            />
          }
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={carregarClientes} tintColor={colors.primary} />
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