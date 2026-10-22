import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { spacing, typography, useThemeStyles } from '../theme';
import { ContractFlowLogo } from '../components';
import { api } from '../services/api';

export function Splash({ navigation }) {
  const { colors, styles } = useThemeStyles(createStyles);
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
          color={colors.accent}
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

const createStyles = (colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.card,
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
