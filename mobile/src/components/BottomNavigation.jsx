import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../utils/theme';

export function BottomNavigation({ state, navigation }) {
  const tabs = [
    { name: 'Inicio', label: 'Inicio', icon: 'home-outline', activeIcon: 'home' },
    { name: 'Contratos', label: 'Contratos', icon: 'document-text-outline', activeIcon: 'document-text' },
    { name: 'Clientes', label: 'Clientes', icon: 'people-outline', activeIcon: 'people' },
    { name: 'Agenda', label: 'Agenda', icon: 'calendar-outline', activeIcon: 'calendar' },
    { name: 'Financeiro', label: 'Financeiro', icon: 'wallet-outline', activeIcon: 'wallet' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const isActive = state.routes[state.index].name === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isActive ? colors.primary : colors.inactive}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  label: {
    fontSize: 10,
    color: colors.inactive,
    marginTop: 2,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
