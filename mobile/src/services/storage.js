import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'contractflow_token';
const USER_KEY = 'contractflow_usuario';

export async function salvarSessao(token, usuario) {
  try {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(usuario)],
    ]);
  } catch (error) {
    console.warn('Erro ao salvar sessão', error);
  }
}

export async function getToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

export async function getUsuario() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export async function limparSessao() {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.warn('Erro ao limpar sessão', error);
  }
}
