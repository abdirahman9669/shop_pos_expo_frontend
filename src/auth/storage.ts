// src/auth/storage.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth.token';
const META_KEY  = 'auth.meta'; // { user, shop, expires_in }

export async function saveAuth(token: string, meta: any) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

export async function loadAuth() {
  const [token, metaJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    AsyncStorage.getItem(META_KEY),
  ]);
  const meta = metaJson ? JSON.parse(metaJson) : null;
  return { token, meta };
}

export async function clearAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    AsyncStorage.removeItem(META_KEY),
  ]);
}
