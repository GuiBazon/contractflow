import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

export function Header({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  rightLabel = 'Mais opções',
  onLeftPress,
  onRightPress,
  rightIcon2,
  rightLabel2 = 'Ação secundária',
  onRightPress2,
}) {
  return (
    <View style={styles.container}>
      {leftIcon ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={onLeftPress} style={styles.iconBtn}>
          <Ionicons name={leftIcon} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.rightIcons}>
        {rightIcon2 && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={rightLabel2} onPress={onRightPress2} style={styles.iconBtn}>
            <Ionicons name={rightIcon2} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {rightIcon && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={rightLabel} onPress={onRightPress} style={styles.iconBtn}>
            <Ionicons name={rightIcon} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightIcons: {
    flexDirection: 'row',
  },
});
