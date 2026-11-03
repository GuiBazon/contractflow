import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { spacing, typography, useThemeStyles } from '../theme';

export function FilterChip({ label, active, onPress }) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.active]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors) => StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  active: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  textActive: {
    color: colors.onPrimary,
  },
});
