import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const CLIP_PATH =
  'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48';

export function ContractFlowLogo({
  size = 28,
  color = colors.primary,
  showText = true,
  fontSize = 24,
  textColor = colors.textPrimary,
  fontWeight = '700',
  showSubtitle = false,
  subtitle = '',
  subtitleColor = colors.textSecondary,
  subtitleSize = 14,
  direction = 'row',
  style,
}) {
  if (direction === 'column') {
    return (
      <View style={[styles.column, style]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d={CLIP_PATH}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        {showText && (
          <Text style={[styles.nameColumn, { fontSize, color: textColor, fontWeight }]}>
            ContractFlow
          </Text>
        )}
        {showSubtitle && subtitle ? (
          <Text style={[styles.subtitleColumn, { fontSize: subtitleSize, color: subtitleColor }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d={CLIP_PATH}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {showText && (
        <Text style={[styles.name, { fontSize, color: textColor, fontWeight }]}>
          ContractFlow
        </Text>
      )}
      {showSubtitle && subtitle ? (
        <Text style={[styles.subtitle, { fontSize: subtitleSize, color: subtitleColor }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    alignItems: 'center',
  },
  name: {
    marginLeft: 8,
    letterSpacing: -0.4,
  },
  nameColumn: {
    marginTop: 12,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 6,
    textAlign: 'center',
  },
  subtitleColumn: {
    marginTop: 8,
    textAlign: 'center',
  },
});
