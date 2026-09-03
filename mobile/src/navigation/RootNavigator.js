import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Login } from '../screens/Login';
import { Splash } from '../screens/Splash';
import { MainTabs } from './MainTabs';
import { DetalheContrato } from '../screens/DetalheContrato';
import { ImportarContrato } from '../screens/ImportarContrato';
import { RevisaoContrato } from '../screens/RevisaoContrato';
import { RegistrarPagamento } from '../screens/RegistrarPagamento';
import { Mais } from '../screens/Mais';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="DetalheContrato" component={DetalheContrato} />
      <Stack.Screen name="ImportarContrato" component={ImportarContrato} />
      <Stack.Screen name="RevisaoContrato" component={RevisaoContrato} />
      <Stack.Screen name="RegistrarPagamento" component={RegistrarPagamento} />
      <Stack.Screen name="Mais" component={Mais} />
    </Stack.Navigator>
  );
}
