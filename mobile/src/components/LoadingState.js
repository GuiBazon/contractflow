import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { spacing, typography, useThemeStyles } from '../theme';

export function LoadingState({ message = 'Carregando...' }) {
  const { colors, styles } = useThemeStyles(createStyles);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  text: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});
