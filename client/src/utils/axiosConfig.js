import axios from "axios";

// Central axios configuration used across the app
// In Vite (client-side) use import.meta.env.VITE_* for environment variables.
// `process` is not defined in the browser which caused the runtime error.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

axios.defaults.baseURL = API_BASE;
// Attach token from localStorage automatically
axios.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token && (!config.headers || !config.headers.Authorization)) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      /* ignore */
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Optional: central response handler to surface auth issues
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    // Log server-provided error details to console for easier debugging
    if (error && error.response) {
      console.warn(
        "API response error:",
        error.response.status,
        error.response.data
      );
      // If auth failed or forbidden, clear stored auth and redirect to login
      if (error.response.status === 401 || error.response.status === 403) {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
        } catch {
          /* ignore */
        }
        // Redirect to login page to re-authenticate
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
