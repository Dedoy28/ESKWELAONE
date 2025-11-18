// src/lib/config.ts

// 1. Define ONE variable for your backend's base URL.
//    In local dev, this is 'http://localhost:8000'.
//    In production, this will be 'https://eskwelaone-backend.onrender.com'.
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// 2. Build the API URL (for Axios)
export const API_BASE = `${BACKEND_URL}/api`;

// 3. Build the WebSocket URL (for your WebSocket client)
//    This replaces 'http' with 'ws' (or 'https' with 'wss' for production)
export const WS_BASE_URL = BACKEND_URL.replace(/^http/, "ws");