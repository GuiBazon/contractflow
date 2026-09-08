import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { ContractFlowLogo } from '../components';
import { api } from '../services/api';

export function Splash({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const logado = await api.verificarSessao();
      navigation.replace(logado ? 'MainTabs' : 'Login');
    }, 1200);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ContractFlowLogo
          size={88}
          color={colors.primary}
          fontSize={typography.sizes.title}
          direction="column"
          showSubtitle
          subtitle="Gestão inteligente de contratos e recebíveis"
          subtitleSize={typography.sizes.md}
        />
      </View>
      <Text style={styles.version}>v1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  version: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
  },
});
