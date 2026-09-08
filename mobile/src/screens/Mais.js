import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { Header } from '../components';
import { getUsuario, limparSessao } from '../services/storage';

export function Mais() {
  const navigation = useNavigation();
  const [usuario, setUsuario] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getUsuario().then((u) => setUsuario(u));
    }, [])
  );

  const nome = usuario ? usuario.nome : '';
  const email = usuario ? usuario.email : '';
  const inicial = nome ? nome.trim().charAt(0).toUpperCase() : '?';

  async function handleSair() {
    await limparSessao();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  function abrirTab(tab) {
    navigation.navigate('MainTabs', { screen: tab });
  }

  function sobreApp() {
    Alert.alert(
      'ContractFlow',
      `Gerencie contratos, clientes, parcelas e pagamentos de forma simples e offline-first.\n\nVersão: 1.0.0`
    );
  }

  const itensMenu = [
    { key: 'calculadora', icon: 'calculator-outline', title: 'Calculadora financeira', onPress: () => navigation.navigate('Calculadora') },
    { key: 'calendario', icon: 'calendar-outline', title: 'Calendário', onPress: () => abrirTab('Agenda') },
    { key: 'relatorios', icon: 'bar-chart-outline', title: 'Relatórios (Financeiro)', onPress: () => abrirTab('Financeiro') },
    { key: 'sobre', icon: 'information-circle-outline', title: 'Sobre o App', onPress: sobreApp },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Mais" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.perfilCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>
          <View style={styles.perfilInfo}>
            <Text style={styles.perfilNome}>{nome || 'Não identificado'}</Text>
            <Text style={styles.perfilEmail}>{email || '—'}</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {itensMenu.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, idx > 0 && styles.menuItemBorder]}
              onPress={item.onPress}
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