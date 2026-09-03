import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../utils/theme';

export function TimelineItem({ title, date, description, icon, isLast }) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.dot}>
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  left: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 28,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  date: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
});
