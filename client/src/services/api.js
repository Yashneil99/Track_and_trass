import axios from "axios";
import { refreshToken, logout } from "../features/auth/authSlice";

let store;

export const setStore = (_store) => {
  store = _store;
};

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];
let csrfToken = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

export const initializeCsrfToken = async () => {
  try {
    const csrfApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      withCredentials: true,
    });

    const response = await csrfApi.get('/api/csrf-token');
    csrfToken = response.data.csrfToken;
    console.log("CSRF token initialized:", csrfToken);
    return csrfToken;
  } catch (error) {
    console.error("Failed to initialize CSRF token:", error);
    throw error;
  }
};

export const getCsrfToken = async () => {
  if (csrfToken) {
    return csrfToken;
  }

  try {
    const csrfApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      withCredentials: true,
    });

    const response = await csrfApi.get('/api/csrf-token');
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error("Failed to get CSRF token:", error);
    throw new Error("Failed to obtain CSRF token. Please refresh the page.");
  }
};

api.interceptors.request.use(async (config) => {

  delete config.headers['Authorization'];

  const requiresCsrf = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase()) &&
                      !config.url.includes('/login') &&
                      !config.url.includes('/register');

  if (requiresCsrf) {
    try {
      const token = await getCsrfToken();
      config.headers['X-CSRF-Token'] = token;
    } catch (error) {
      console.error("CSRF token required but failed to obtain:", error);
      throw new Error("CSRF token required. Please refresh the page and try again.");
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 403 && err.response?.data?.message?.includes("invalid csrf token")) {
      console.error("CSRF token invalid, clearing and retrying...");
      csrfToken = null;
      try {
        const token = await getCsrfToken();
        original.headers['X-CSRF-Token'] = token;
        return api(original);
      } catch (retryError) {
        console.error("CSRF retry failed:", retryError);
        store.dispatch(logout());
        return Promise.reject(new Error("Session expired. Please refresh the page and login again."));
      }
    }

    if (err.response?.status === 403 && err.response?.data?.message?.includes("locked")) {
      store.dispatch(logout());
      return Promise.reject(new Error("Account locked: " + err.response.data.message));
    }

    if (err.response?.status === 429) {
      return Promise.reject(new Error("Too many requests. Please try again later."));
    }

    if (err.response?.status === 400 && err.response?.data?.errors) {
      return Promise.reject({
        ...err,
        validationErrors: err.response.data.errors
      });
    }

    if (err.response?.status === 401 && !original._retry && store) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(original);
          })
          .catch((e) => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await store.dispatch(refreshToken());
        processQueue(null, null);
        return api(original);
      } catch (e) {
        processQueue(e, null);
        store.dispatch(logout());
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
