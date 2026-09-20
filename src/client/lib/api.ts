interface ApiOptions {
  method?: string;
  body?: unknown;
}

async function request(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body } = options;

  const config: RequestInit = {
    method,
    credentials: 'include',
    headers: {} as Record<string, string>,
  };

  if (body) {
    (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`/api${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data;
}

const api = {
  get: (endpoint: string) => request(endpoint),
  post: (endpoint: string, body: unknown) => request(endpoint, { method: 'POST', body }),
  put: (endpoint: string, body: unknown) => request(endpoint, { method: 'PUT', body }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
};

export default api;
