const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  const accessToken = localStorage.getItem('access_token');
  if (!skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  fetchOptions.headers = headers;
  const url = `${BASE_URL}${endpoint}`;
  
  let response = await fetch(url, fetchOptions);
  
  // Handle 401 Unauthorized / Token Expiry
  if (response.status === 401 && !skipAuth) {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          
          if (refreshRes.ok) {
            const tokens = await refreshRes.json();
            localStorage.setItem('access_token', tokens.access_token);
            localStorage.setItem('refresh_token', tokens.refresh_token);
            isRefreshing = false;
            onRefreshed(tokens.access_token);
          } else {
            isRefreshing = false;
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.dispatchEvent(new Event('auth_session_expired'));
            throw new Error('Session expired');
          }
        }
        
        // Wait for refresh to complete, then retry
        const newAccessToken = await new Promise<string>((resolve) => {
          subscribeTokenRefresh((token) => resolve(token));
        });
        
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        fetchOptions.headers = headers;
        response = await fetch(url, fetchOptions);
        
      } catch (err) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.dispatchEvent(new Event('auth_session_expired'));
        throw err;
      }
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.dispatchEvent(new Event('auth_session_expired'));
    }
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'An error occurred while fetching data');
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json() as Promise<T>;
}
