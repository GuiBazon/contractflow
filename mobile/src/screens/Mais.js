import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, useTheme, useThemeStyles } from '../theme';
import { Header } from '../components';
import { getUsuario, limparSessao } from '../services/storage';

export function Mais() {
  const { colors, escuro, definirModo } = useTheme();
  const { styles } = useThemeStyles(createStyles);
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
          <View style={styles.menuItem}>
            <Ionicons
              name={escuro ? 'moon' : 'sunny-outline'}
              size={20}
              color={colors.accent}
            />
            <View style={styles.aparenciaInfo}>
              <Text style={styles.aparenciaTitulo}>Modo escuro</Text>
              <Text style={styles.menuSubtitle}>
                {escuro ? 'Ativado' : 'Desativado'}
              </Text>
            </View>
            <Switch
              value={escuro}
              onValueChange={(valor) => definirModo(valor ? 'escuro' : 'claro')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.onPrimary}
              ios_backgroundColor={colors.border}
              accessibilityLabel="Alternar modo escuro"
            />
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
              <Ionicons name={item.icon} size={20} color={colors.accent} />
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

const createStyles = (colors) => StyleSheet.create({
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
    backgroundColor: colors.onPrimary,
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
    color: colors.onPrimary,
  },
  perfilEmail: {
    fontSize: typography.sizes.sm,
    color: colors.onPrimary,
    opacity: 0.85,
    marginTop: 2,
  },
  menu: {
    backgroundColor: colors.card,
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
  aparenciaInfo: {
    flex: 1,
  },
  aparenciaTitulo: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  sairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
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