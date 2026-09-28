import axios from 'axios';

export const TOKEN_KEY = 'tgf_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode); session continues in memory only */
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalises errors so every caller can simply show error.message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    // A 5xx without our JSON body means the API itself is unreachable (e.g. the dev proxy got no answer).
    const serverDown = !error.response || (status >= 500 && !data?.message);
    const normalised = new Error(
      data?.message ||
        (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : null) ||
        (serverDown ? 'We could not reach our server right now. Please try again in a moment.' : 'Something went wrong')
    );
    normalised.status = status;
    normalised.details = data?.details;
    if (status === 401 && getToken()) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(normalised);
  }
);

export default api;
