// src/config.ts

// 👇 Put your machine's LAN IP here (not localhost)
const LAN_IP = 'http://192.168.100.13:5000'; // ← EDIT ME

// Smart default for emulators/simulators (keeps phone use simple too)
function guessBase() {
  // Android emulator special host:
  // - If you ever run on Android emulator, use 10.0.2.2
  // iOS simulator (on a Mac) can use localhost, but phone needs LAN_IP.
  if (typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)) {
    return 'http://192.168.100.13:5000';
  }
  return LAN_IP;
}

export const API_BASE = guessBase();

// If you ever need auth later:
export const defaultHeaders = (token?: string) =>
  token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } 
        : { 'Content-Type': 'application/json' };