// src/lib/axios.ts
import axios from "axios";
import { API_BASE } from "./config"; // 👈 import base URL

const api = axios.create({
  baseURL: API_BASE, // 👈 now dynamic
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh expired token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          // use API_BASE dynamically here too
          const res = await axios.post(`${API_BASE}/token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccess = res.data.access;
          localStorage.setItem("access_token", newAccess);

          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest); // retry request
        } catch (err) {
          console.error("Token refresh failed:", err);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login"; // optional: redirect to login
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
