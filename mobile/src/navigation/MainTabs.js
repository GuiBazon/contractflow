import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomNavigation } from '../components';
import { Dashboard } from '../screens/Dashboard';
import { Contratos } from '../screens/Contratos';
import { Clientes } from '../screens/Clientes';
import { Agenda } from '../screens/Agenda';
import { Financeiro } from '../screens/Financeiro';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Inicio" component={Dashboard} />
      <Tab.Screen name="Contratos" component={Contratos} />
      <Tab.Screen name="Clientes" component={Clientes} />
      <Tab.Screen name="Agenda" component={Agenda} />
      <Tab.Screen name="Financeiro" component={Financeiro} />
    </Tab.Navigator>
  );
}
