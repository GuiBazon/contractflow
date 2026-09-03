import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Input, PrimaryButton, ContractFlowLogo } from '../components';
import { api, normalizarErro } from '../services/api';
import { salvarSessao } from '../services/storage';

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
      await salvarSessao(data.token, data.usuario);
      navigation.replace('MainTabs');
    } catch (e) {
      setErro(normalizarErro(e));
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
            <ContractFlowLogo
              size={64}
              fontSize={typography.sizes.title}
              direction="column"
            />
            <Text style={styles.subtitle}>Controle que flui com seu negócio.</Text>
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

            <TouchableOpacity style={styles.linkBtn} onPress={() => {}}>
              <Text style={styles.linkText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <View style={styles.createAccountRow}>
              <Text style={styles.createAccountMuted}>Não tem uma conta?</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.createAccountLink}>Criar conta</Text>
          </TouchableOpacity>
            </View>
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
    marginBottom: 40,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  linkBtn: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  createAccountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  createAccountMuted: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  createAccountLink: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
