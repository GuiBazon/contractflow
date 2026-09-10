import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Input, PrimaryButton, ContractFlowLogo } from '../components';
import { api, normalizarErro } from '../services/api';
import { salvarSessao } from '../services/storage';

export function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  async function handleLogin() {
    try {
      const data = await api.login(email.trim(), senha);
      await salvarSessao(data.token, data.usuario);
      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert('Erro', normalizarErro(e));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ContractFlowLogo size={48} fontSize={typography.sizes.lg} direction="column" />

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

      <PrimaryButton title="Entrar" onPress={handleLogin} />

      <Text style={styles.footer}>ContractFlow v1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  footer: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
