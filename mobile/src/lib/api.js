import { Platform } from 'react-native';
import Constants from 'expo-constants';

let cachedActiveBaseUrl = null;

/**
 * Derives candidate API URLs for the backend server (Port 5001).
 * Automatically resolves Expo packager host IP, Android emulator (10.0.2.2), and localhost.
 */
export const getCandidateApiUrls = () => {
  const list = [];

  // Extract host IP from Expo Constants (auto-resolves current laptop IP for Expo Go)
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const rawHost = hostUri.split(':')[0];
    // Only use hostUri if it's an IP address, avoiding Expo tunnel domains (.exp.direct / .ngrok)
    if (rawHost && /^\d+\.\d+\.\d+\.\d+$/.test(rawHost)) {
      list.push(`http://${rawHost}:5001/api`);
    }
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    list.push(process.env.EXPO_PUBLIC_API_URL);
  }

  // Active laptop LAN IP
  list.push('http://172.29.82.25:5001/api');

  // Android Emulator default
  if (Platform.OS === 'android') {
    list.push('http://10.0.2.2:5001/api');
  }

  // iOS Simulator / Web / Local default
  list.push('http://localhost:5001/api');
  list.push('http://127.0.0.1:5001/api');

  return [...new Set(list)];
};

/**
 * Helper to return the first successfully resolved promise.
 */
const firstSuccessfulPromise = (promises) => {
  return new Promise((resolve, reject) => {
    let rejectCount = 0;
    if (!promises || promises.length === 0) {
      return reject(new Error('No promises provided'));
    }
    promises.forEach((p) => {
      Promise.resolve(p)
        .then(resolve)
        .catch(() => {
          rejectCount++;
          if (rejectCount === promises.length) {
            reject(new Error('All candidates failed'));
          }
        });
    });
  });
};

/**
 * Fast parallel probe to discover which candidate URL is actively responding.
 */
const findActiveBaseUrl = async () => {
  if (cachedActiveBaseUrl) {
    try {
      const rootUrl = cachedActiveBaseUrl.replace(/\/api\/?$/, '');
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(rootUrl, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return cachedActiveBaseUrl;
    } catch (e) {
      cachedActiveBaseUrl = null;
    }
  }

  const candidates = getCandidateApiUrls();
  
  // Fast parallel probe across all candidates with 2-second limit
  const probePromises = candidates.map(async (baseUrl) => {
    const cleanBase = baseUrl.trim().replace(/\/$/, '');
    const rootUrl = cleanBase.replace(/\/api\/?$/, '');
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    
    try {
      const res = await fetch(rootUrl, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        return cleanBase;
      }
    } catch (e) {
      clearTimeout(id);
    }
    throw new Error('Unreachable candidate');
  });

  try {
    const winner = await firstSuccessfulPromise(probePromises);
    if (winner) {
      cachedActiveBaseUrl = winner;
      console.log(`[API Helper] Active backend resolved: ${winner}`);
      return winner;
    }
  } catch (e) {
    // Fallback if probe fails
  }

  return candidates[0];
};

/**
 * Robust fetch API helper with fast backend host resolution.
 * Eliminates sequential timeouts on unreachable IPs and accommodates ML model processing time.
 */
export const fetchApiWithFallback = async (endpoint, options = {}) => {
  const activeBaseUrl = await findActiveBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${activeBaseUrl}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for ML model execution

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    } else {
      const errText = await res.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch (e) { errJson = { error: errText }; }
      throw new Error(errJson.error || errJson.message || `HTTP ${res.status}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[API Connection] Request to ${url} failed: ${err.message}`);
    cachedActiveBaseUrl = null; // Clear cache on error so next call re-probes
    throw err;
  }
};
