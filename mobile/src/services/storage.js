import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "contractflow_token";
const USER_KEY = "contractflow_usuario";
// No Android/iOS o token usa o armazenamento seguro, como no exemplo SENAI.
// A prévia no navegador utiliza AsyncStorage, que é suportado no web.
export async function salvarSessao(token, usuario) {
  if (Platform.OS === "web") await AsyncStorage.setItem(TOKEN_KEY, token);
  else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  await salvarUsuario(usuario);
}
export async function salvarUsuario(usuario) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(usuario));
}
export async function getToken() {
  if (Platform.OS === "web") return AsyncStorage.getItem(TOKEN_KEY);
  const secure = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secure) return secure;
  // Migra uma sessão da versão anterior sem exigir reinstalação.
  const old = await AsyncStorage.getItem(TOKEN_KEY);
  if (old) {
    await SecureStore.setItemAsync(TOKEN_KEY, old);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  return old;
}
export async function getUsuario() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export async function limparSessao() {
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
