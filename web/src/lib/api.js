let cachedActiveBaseUrl = null;

export const getCandidateApiUrls = () => {
  const list = [];
  if (import.meta.env.VITE_API_URL) {
    list.push(import.meta.env.VITE_API_URL);
  }
  list.push('http://localhost:5001/api');
  list.push('http://127.0.0.1:5001/api');
  return [...new Set(list)];
};

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

const findActiveBaseUrl = async () => {
  if (cachedActiveBaseUrl) {
    return cachedActiveBaseUrl;
  }

  const candidates = getCandidateApiUrls();
  const probePromises = candidates.map(async (baseUrl) => {
    const cleanBase = baseUrl.trim().replace(/\/$/, '');
    const rootUrl = cleanBase.replace(/\/api\/?$/, '');
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(rootUrl, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return cleanBase;
    } catch (e) {
      clearTimeout(id);
    }
    throw new Error('Unreachable candidate');
  });

  try {
    const winner = await firstSuccessfulPromise(probePromises);
    if (winner) {
      cachedActiveBaseUrl = winner;
      return winner;
    }
  } catch (e) {
    // Fallback if probe fails
  }

  cachedActiveBaseUrl = candidates[0];
  return candidates[0];
};

export const fetchApiWithFallback = async (endpoint, options = {}) => {
  const activeBaseUrl = await findActiveBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${activeBaseUrl}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

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
    cachedActiveBaseUrl = null;
    throw err;
  }
};
