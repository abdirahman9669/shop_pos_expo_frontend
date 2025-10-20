// src/config.ts
// src/api/authedFetch.ts

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
export const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImp0aSI6IjNkNGZjMzRmLTgxMWItNDlmMS05MDVjLTJjMmMyYzZkNzUyOCIsImlhdCI6MTc2MDg1MzM1NSwiZXhwIjoxNzYxNDU4MTU1fQ.x9ahnDSANCMm1A7GrLuTUH95MRN32Xfl99mlyD6u66k';
// 👇 Default headers helper
export const defaultHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token || TOKEN ? { Authorization: `Bearer ${token || TOKEN}` } : {}),
});