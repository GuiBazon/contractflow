import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { spacing, typography, useThemeStyles } from '../theme';

export function SecondaryButton({ title, onPress, style, danger }) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.btn, danger && styles.btnDanger, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, danger && styles.textDanger]}>{title}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors) => StyleSheet.create({
  btn: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.accent,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  btnDanger: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  textDanger: {
    color: colors.danger,
  },
});
