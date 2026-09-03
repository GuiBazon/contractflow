import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { Header } from '../components';
import { getUsuario, limparSessao } from '../services/storage';

const itensMenu = [
  { key: 'relatorios', icon: 'bar-chart-outline', title: 'Relatórios' },
  { key: 'configuracoes', icon: 'settings-outline', title: 'Configurações' },
  { key: 'notificacoes', icon: 'notifications-outline', title: 'Notificações' },
  { key: 'ajuda', icon: 'help-circle-outline', title: 'Ajuda & Suporte' },
  { key: 'sobre', icon: 'information-circle-outline', title: 'Sobre o App' },
];

export function Mais() {
  const navigation = useNavigation();
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    getUsuario().then((u) => setUsuario(u));
  }, []);

  const nome = usuario ? usuario.nome : 'Ana Souza';
  const email = usuario ? usuario.email : 'ana@contractflow.com';
  const inicial = nome.split(' ')[0][0].toUpperCase();

  async function handleSair() {
    await limparSessao();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Mais" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.perfilCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>
          <View style={styles.perfilInfo}>
            <Text style={styles.perfilNome}>{nome}</Text>
            <Text style={styles.perfilEmail}>{email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </View>

        <View style={styles.menu}>
          {itensMenu.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, idx > 0 && styles.menuItemBorder]}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.sairBtn} onPress={handleSair} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.sairText}>Sair da Conta</Text>
        </TouchableOpacity>

        <Text style={styles.versao}>ContractFlow v1.0.0</Text>
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
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  perfilInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  perfilNome: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  perfilEmail: {
    fontSize: typography.sizes.sm,
    color: colors.white,
    opacity: 0.85,
    marginTop: 2,
  },
  menu: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  menuItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    flex: 1,
  },
  sairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  sairText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },
  versao: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
