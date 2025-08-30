import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';

const getBaseURL = () => {
  if (isProduction) {
    return '/api';
  }
  return process.env.REACT_APP_BASE_URL_LOCAL;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

export default api;
