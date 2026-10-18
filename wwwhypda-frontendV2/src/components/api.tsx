import { maintenanceActive, setMaintenance } from './commonFeatures/maintenanceState';
import axios, { CanceledError } from 'axios';
import { sessionEvent, sessionVersion, sessionUnavailable, resumeAccountSession, endAccountSession, requireCurrentTerms, clearTermsRequirement } from './users/accountSession';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export default api;

// Поздний ответ старой сессии не восстанавливает личные данные после удаления.
const versions = new WeakMap<object, number>();
const requests = new Map<object, AbortController>();
window.addEventListener(sessionEvent, () => {
  if (sessionUnavailable()) {
    for (const controller of requests.values()) controller.abort();
    requests.clear();
  }
});
api.interceptors.request.use((config) => {
  const path = '/' + (config.url || '').replace(/^\//, '');
  if (maintenanceActive() && path !== '/maintenance-status') throw new CanceledError('Temporary maintenance');
  const protectedRequest = path.startsWith('/input/') || path.startsWith('/admin/') ||
    ['/users/check', '/users/super_check', '/users/refresh'].includes(path) ||
    (path === '/users/' && config.method !== 'post' && config.method !== 'options');
  if (sessionUnavailable() && protectedRequest) throw new CanceledError('Session unavailable');
  const controller = new AbortController();
  config.signal = config.signal || controller.signal;
  requests.set(config, controller);
  versions.set(config, sessionVersion());
  return config;
});
api.interceptors.response.use((response) => {
  requests.delete(response.config);
  if (versions.get(response.config) !== sessionVersion()) throw new CanceledError('Session changed');
  if (response.config.url === '/users/login') {
    resumeAccountSession();
    clearTermsRequirement();
  }
  return response;
}, (error: unknown) => {
  if (axios.isAxiosError(error) && error.config) {
    requests.delete(error.config);
    if (error.response?.status === 503 && error.response.data?.code === 'site_maintenance') setMaintenance(true);
    if (error.response?.status === 409 && error.response.data?.code === 'terms_acceptance_required' &&
        error.config.url !== '/users/login') requireCurrentTerms();
    if (error.response?.status === 401 && error.response.data?.code === 'account_unavailable') {
      endAccountSession();
    }
    if (versions.get(error.config) !== sessionVersion()) throw new CanceledError('Session changed');
  }
  return Promise.reject(error);
});
