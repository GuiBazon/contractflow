import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, useThemeStyles } from '../theme';
import { rotuloAcaoDocumento, tipoDeDocumento } from '../services/documentos';

export function DocumentoAcao({ documento, onPress, compact = false, style }) {
  const { colors, styles } = useThemeStyles(createStyles);
  const tipo = tipoDeDocumento(documento?.mime, documento?.nome);
  const titulo = rotuloAcaoDocumento(documento?.mime, documento?.nome);
  const icone = tipo === 'pdf' ? 'document-text' : tipo === 'imagem' ? 'image' : 'document-attach';

  return (
    <TouchableOpacity
      style={[styles.button, compact && styles.compact, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={icone} size={compact ? 16 : 18} color={colors.accent} />
      </View>
      <Text style={styles.label}>{titulo}</Text>
      <Ionicons name="open-outline" size={compact ? 16 : 18} color={colors.accent} />
    </TouchableOpacity>
  );
}

const createStyles = (colors) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  compact: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
  },
});
