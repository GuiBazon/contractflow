import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from './colors';

export const TEMA_KEY = 'contractflow_tema';

const ThemeContext = createContext(null);

const estilosBoot = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1120',
    gap: 16,
  },
  nome: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
});

export function ThemeProvider({ children }) {
  const [modo, setModo] = useState(null);

  useEffect(() => {
    let ativo = true;
    let finalizado = false;

    const concluir = (valor) => {
      if (!ativo || finalizado) {
        return;
      }

      finalizado = true;
      setModo(valor);
    };

    const temporizador = setTimeout(() => concluir('claro'), 800);

    const carregarTema = async () => {
      let salvo = null;

      try {
        salvo = await AsyncStorage.getItem(TEMA_KEY);
      } catch (error) {
        salvo = null;
      }

      clearTimeout(temporizador);
      concluir(salvo === 'escuro' ? 'escuro' : 'claro');
    };

    carregarTema();

    return () => {
      ativo = false;
      clearTimeout(temporizador);
    };
  }, []);

  const definirModo = useCallback(async (novoModo) => {
    const valor = novoModo === 'escuro' ? 'escuro' : 'claro';
    setModo(valor);

    try {
      await AsyncStorage.setItem(TEMA_KEY, valor);
    } catch (error) {
      console.warn('Não foi possível salvar a preferência de tema.', error);
    }
  }, []);

  const value = useMemo(
    () => ({
      modo,
      escuro: modo === 'escuro',
      colors: modo === 'escuro' ? darkColors : lightColors,
      definirModo,
    }),
    [modo, definirModo]
  );

  if (!modo) {
    return (
      <View style={estilosBoot.container}>
        <StatusBar style="light" backgroundColor="#0B1120" />
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={estilosBoot.nome}>ContractFlow</Text>
      </View>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const contexto = useContext(ThemeContext);

  if (!contexto) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider.');
  }

  return contexto;
}

export function useThemeStyles(factory) {
  const { colors: temaColors } = useTheme();
  const styles = useMemo(() => factory(temaColors), [factory, temaColors]);

  return { colors: temaColors, styles };
}
