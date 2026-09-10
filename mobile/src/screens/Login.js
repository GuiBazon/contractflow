import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
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

  function validarFormulario() {
    if (!email.trim()) {
      setErro('Digite seu e-mail.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('E-mail invalido.');
      return false;
    }

    if (!senha || senha.length < 6) {
      setErro('Senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    return true;
  }

  async function handleLogin() {
    setErro('');

    if (carregando) return;
    if (!validarFormulario()) return;

    setCarregando(true);

    try {
      const data = await api.login(email.trim(), senha);
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ContractFlowLogo
              size={56}
              fontSize={typography.sizes.title}
              direction="column"
            />
            <Text style={styles.subtitle}>Controle que flui com seu negocio.</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setErro(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!carregando}
            />

            <Input
              label="Senha"
              placeholder="Sua senha"
              value={senha}
              onChangeText={(t) => { setSenha(t); setErro(''); }}
              secureTextEntry
              editable={!carregando}
              maxLength={50}
            />

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}

            {carregando ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Entrando...</Text>
              </View>
            ) : (
              <PrimaryButton title="Entrar" onPress={handleLogin} />
            )}

            <TouchableOpacity onPress={() => Alert.alert('Recuperacao', 'Em breve.')} disabled={carregando}>
              <Text style={styles.link}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <Text style={styles.muted}>Nao tem conta?</Text>
              <TouchableOpacity onPress={() => Alert.alert('Criar conta', 'Em breve.')} disabled={carregando}>
                <Text style={styles.linkBold}>Criar conta</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  form: {
    marginBottom: spacing.xxxl,
  },
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  link: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: typography.sizes.md,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  linkBold: {
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
