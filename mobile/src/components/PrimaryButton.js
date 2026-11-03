import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { spacing, typography, useThemeStyles } from '../theme';

export function PrimaryButton({ title, onPress, style, disabled }) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors) => StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.onPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});
