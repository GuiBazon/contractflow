import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Login } from "../screens/Login";
import { Cadastro } from "../screens/Cadastro";
import { Splash } from "../screens/Splash";
import { MainTabs } from "./MainTabs";
import { DetalheContrato } from "../screens/DetalheContrato";
import { DetalheCliente } from "../screens/DetalheCliente";
import { FormCliente } from "../screens/FormCliente";
import { FormContrato } from "../screens/FormContrato";
import { ImportarContrato } from "../screens/ImportarContrato";
import { RevisaoContrato } from "../screens/RevisaoContrato";
import { RegistrarPagamento } from "../screens/RegistrarPagamento";
import { Mais } from "../screens/Mais";
import { Calculadora } from "../screens/Calculadora";
import { DespesaForm } from "../screens/DespesaForm";
import { ParcelasExtras } from "../screens/ParcelasExtras";
import { ParcelaForm } from "../screens/ParcelaForm";
import { Alertas } from "../screens/Alertas";
import { Relatorios } from "../screens/Relatorios";
import { Documentos } from "../screens/Documentos";
import { Configuracoes } from "../screens/Configuracoes";
import { Usuarios, UsuarioForm } from "../screens/Usuarios";

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Cadastro" component={Cadastro} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="DetalheContrato" component={DetalheContrato} />
      <Stack.Screen name="DetalheCliente" component={DetalheCliente} />
      <Stack.Screen name="FormCliente" component={FormCliente} />
      <Stack.Screen name="FormContrato" component={FormContrato} />
      <Stack.Screen name="ImportarContrato" component={ImportarContrato} />
      <Stack.Screen name="RevisaoContrato" component={RevisaoContrato} />
      <Stack.Screen name="RegistrarPagamento" component={RegistrarPagamento} />
      <Stack.Screen name="Mais" component={Mais} />
      <Stack.Screen name="Calculadora" component={Calculadora} />
      <Stack.Screen name="DespesaForm" component={DespesaForm} />
      <Stack.Screen name="RenovarContrato" component={FormContrato} />
      <Stack.Screen name="ParcelasExtras" component={ParcelasExtras} />
      <Stack.Screen name="ParcelaForm" component={ParcelaForm} />
      <Stack.Screen name="Alertas" component={Alertas} />
      <Stack.Screen name="Relatorios" component={Relatorios} />
      <Stack.Screen name="Documentos" component={Documentos} />
      <Stack.Screen name="Configuracoes" component={Configuracoes} />
      <Stack.Screen name="Usuarios" component={Usuarios} />
      <Stack.Screen name="UsuarioForm" component={UsuarioForm} />
    </Stack.Navigator>
  );
}
