import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-api-url.com',
  withCredentials: true,  // чтобы посылать куки с запросами
});

// Перехватчик для обработки ошибок 401 (когда токен истек)
api.interceptors.response.use(
  response => response, // если запрос успешный, возвращаем ответ
  async error => {
    const originalRequest = error.config;
    
    // Проверка, не истёк ли токен
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // чтобы избежать бесконечного цикла

      // Отправляем запрос на обновление токенов
      try {
        const refreshResponse = await axios.post('/users/refresh', {}, { withCredentials: true });
        
        const newAccessToken = refreshResponse.data.access_token;
        // Сохраняем новый токен
        localStorage.setItem('access_token', newAccessToken);
        
        // Повторяем исходный запрос с новым токеном
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axios(originalRequest); // делаем повторный запрос с новым токеном
      } catch (refreshError) {
        // Если обновить токен не удалось, например, refresh токен истёк
        console.error('Unable to refresh token', refreshError);
        // Редирект на страницу логина или другой обработчик
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;


const apiWithAuth = axios.create({
  baseURL: 'https://your-api-url.com',
  withCredentials: true,
});

// Перехватываем запросы и добавляем токен авторизации
apiWithAuth.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token'); // или из куков, если используете их
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { apiWithAuth };
