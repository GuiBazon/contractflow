import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../utils/theme';
import { Header } from '../components';

const itensMenu = [
  { key: 'perfil', icon: 'person-outline', title: 'Perfil', subtitle: 'Ana Souza' },
  { key: 'clientes', icon: 'people-outline', title: 'Importar clientes', subtitle: 'importar de planilha' },
  { key: 'contratos', icon: 'document-text-outline', title: 'Importar contratos', subtitle: 'importar de planilha' },
  { key: 'notificacoes', icon: 'notifications-outline', title: 'Notificações', subtitle: 'alertas e lembretes' },
  { key: 'configuracoes', icon: 'settings-outline', title: 'Configurações', subtitle: 'preferências ou conta' },
  { key: 'ajuda', icon: 'help-circle-outline', title: 'Central de ajuda', subtitle: 'dúvidas frequentes' },
];

const versao = {
  nome: 'ContractFlow',
  versao: 'v1.0.0',
  desc: 'Gestão de contratos e recebíveis',
};

export function Mais() {
  const navigation = useNavigation();

  function handlePress(key) {
    if (key === 'clientes' || key === 'contratos') {
      navigation.navigate('Importacao');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Mais" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.perfilCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.perfilInfo}>
            <Text style={styles.perfilNome}>Ana Souza</Text>
            <Text style={styles.perfilEmail}>ana@contractflow.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>

        <View style={styles.menu}>
          {itensMenu.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, idx > 0 && styles.menuItemBorder]}
              onPress={() => handlePress(item.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSub}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.versaoCard}>
          <Ionicons name="logo-react" size={20} color={colors.primary} />
          <View style={styles.versaoInfo}>
            <Text style={styles.versaoNome}>{versao.nome} {versao.versao}</Text>
            <Text style={styles.versaoDesc}>{versao.desc}</Text>
          </View>
        </View>
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
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.white,
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
    color: colors.textPrimary,
  },
  perfilEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
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
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  menuSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  versaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  versaoInfo: {
    flex: 1,
  },
  versaoNome: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  versaoDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
