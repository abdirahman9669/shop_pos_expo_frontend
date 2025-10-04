// src/config.ts

// 👇 Put your machine's LAN IP here (not localhost)
const LAN_IP = 'http://192.168.100.13:5000'; // ← EDIT ME

function guessBase() {
  if (typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)) {
    // Android emulator special host
    return 'http://192.168.100.13:5000';
  }
  return LAN_IP;
}

export const API_BASE = guessBase();

// 👇 Put your JWT token here
export const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImlhdCI6MTc1OTM2NTQwMSwiZXhwIjoxNzU5OTcwMjAxfQ.osrVTNhovX8cBJkOQOzPQ_8ZQj6gqQKBbAmnUC78pLo';

// 👇 Default headers helper
export const defaultHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token || TOKEN ? { Authorization: `Bearer ${token || TOKEN}` } : {}),
});