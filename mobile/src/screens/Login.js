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
import { Ionicons } from '@expo/vector-icons';
import { Input, PrimaryButton, ContractFlowLogo } from '../components';
import { api, normalizarErro } from '../services/api';
import { salvarSessao } from '../services/storage';

export function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  function validarFormulario() {
    const emailLimpo = email.trim();

    if (!emailLimpo) {
      setErro('Digite seu e-mail.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setErro('E-mail invalido.');
      return false;
    }

    if (!senha) {
      setErro('Digite sua senha.');
      return false;
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
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

      if (!data || !data.token) {
        throw new Error('Resposta invalida do servidor.');
      }

      await salvarSessao(data.token, data.usuario);
      navigation.replace('MainTabs');
    } catch (e) {
      setErro(normalizarErro(e));
    } finally {
      setCarregando(false);
    }
  }

  function handleEsqueciSenha() {
    Alert.alert(
      'Recuperacao de senha',
      'A funcionalidade de recuperacao de senha sera implementada em breve.',
    );
  }

  function handleCriarConta() {
    Alert.alert(
      'Criar conta',
      'A tela de criacao de conta sera implementada em breve.',
    );
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
          <View style={styles.topSection}>
            <ContractFlowLogo
              size={60}
              fontSize={typography.sizes.title}
              direction="column"
            />

            <Text style={styles.subtitle}>
              Controle que flui com seu negocio.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>
              Entrar na sua conta
            </Text>

            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(texto) => {
                setEmail(texto);
                setErro('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!carregando}
              accessibilityLabel="Campo de e-mail"
              returnKeyType="next"
            />

            <View style={styles.passwordContainer}>
              <Input
                label="Senha"
                placeholder="Sua senha"
                value={senha}
                onChangeText={(texto) => {
                  setSenha(texto);
                  setErro('');
                }}
                secureTextEntry={!mostrarSenha}
                editable={!carregando}
                accessibilityLabel="Campo de senha"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                maxLength={50}
              />

              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setMostrarSenha(!mostrarSenha)}
                disabled={carregando}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={
                  mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'
                }
                accessibilityRole="button"
              >
                <Ionicons
                  name={mostrarSenha ? 'eye-off' : 'eye'}
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            {erro ? (
              <View style={styles.errorContainer}>
                <Text style={styles.erro}>{erro}</Text>
              </View>
            ) : null}

            {carregando ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Entrando...</Text>
              </View>
            ) : (
              <PrimaryButton
                title="Entrar"
                onPress={handleLogin}
                accessibilityLabel="Entrar na conta"
              />
            )}

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={handleEsqueciSenha}
              disabled={carregando}
              accessibilityLabel="Esqueci minha senha"
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <View style={styles.createAccountRow}>
              <Text style={styles.createAccountMuted}>
                Nao tem uma conta?
              </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('Cadastro')}
                disabled={carregando}
                accessibilityLabel="Criar conta"
                accessibilityRole="button"
              >
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
    paddingVertical: spacing.xl,
  },

  topSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl + 8,
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

  passwordContainer: {
    position: 'relative',
  },

  showPasswordButton: {
    position: 'absolute',
    right: spacing.sm,
    top: 'auto',
    bottom: spacing.xxl,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorContainer: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },

  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },

  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
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
