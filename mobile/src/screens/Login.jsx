import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography } from '../utils/theme';
import { Input, PrimaryButton } from '../components';
import { api, setToken } from '../services/api';

export function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleLogin() {
    setErro('');
    setCarregando(true);

    try {
      const data = await api.login(email, senha);
      setToken(data.token);
      navigation.replace('MainTabs');
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.topSection}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoIconText}>CF</Text>
            </View>
            <Text style={styles.logoText}>ContractFlow</Text>
            <Text style={styles.subtitle}>Gestão de contratos e recebíveis</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Entrar na sua conta</Text>
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Senha"
              placeholder="Sua senha"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
            />
            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            {carregando ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <PrimaryButton title="Entrar" onPress={handleLogin} />
            )}
          </View>

          <Text style={styles.footer}>ContractFlow v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoIconText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: typography.sizes.title,
  },
  logoText: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: spacing.xxxl,
  },
  formTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
