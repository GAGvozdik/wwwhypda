import axios from 'axios';

console.log("Executing updated api.tsx file - v3. If you see this, the build is working.");

const api = axios.create({
  baseURL: '/api',
});

export default api;
