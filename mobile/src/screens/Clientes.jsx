import React, { useState } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text } from 'react-native';
import { colors, spacing, typography } from '../utils/theme';
import { clientes } from '../data';
import { Header, SearchInput, ClientCard, EmptyState } from '../components';

export function Clientes() {
  const [busca, setBusca] = useState('');

  const filtrados = clientes.filter((c) =>
    c.nome_razao_social.toLowerCase().includes(busca.toLowerCase()) ||
    c.cpf_cnpj.includes(busca)
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Clientes" />
      <View style={styles.body}>
        <SearchInput
          placeholder="Buscar clientes por nome ou CPF/CNPJ..."
          value={busca}
          onChangeText={setBusca}
        />
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <FlatList
          data={filtrados}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ClientCard cliente={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Nenhum cliente encontrado"
              message="Tente ajustar a busca."
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
