import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { Input, PrimaryButton, ContractFlowLogo } from '../components';
import { api, normalizarErro } from '../services/api';
import { salvarSessao } from '../services/storage';

export function Cadastro({ navigation }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleCadastro() {
    setErro('');

    if (!nome.trim() || nome.trim().length < 2) {
      setErro('Informe um nome válido.');
      return;
    }
    if (!email.trim()) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setCarregando(true);
    try {
      await api.register(nome.trim(), email.trim().toLowerCase(), senha);
      const data = await api.login(email.trim().toLowerCase(), senha);
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
              size={56}
              fontSize={typography.sizes.xl}
              direction="column"
            />
            <Text style={styles.subtitle}>Crie sua conta para começar.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Cadastro</Text>
            <Input
              label="Nome"
              placeholder="Seu nome completo"
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
            />
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.passwordContainer}>
              <Input
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!mostrarSenha}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setMostrarSenha(!mostrarSenha)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={mostrarSenha ? 'eye-off' : 'eye'}
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.passwordContainer}>
              <Input
                label="Confirmar senha"
                placeholder="Repita sua senha"
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                secureTextEntry={!mostrarConfirmarSenha}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={mostrarConfirmarSenha ? 'eye-off' : 'eye'}
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
            {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            {carregando ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <PrimaryButton title="Criar conta" onPress={handleCadastro} />
            )}

            <View style={styles.loginRow}>
              <Text style={styles.loginMuted}>Já tem uma conta?</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Entrar</Text>
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
    marginBottom: 32,
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
  erro: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  loginMuted: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  loginLink: {
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