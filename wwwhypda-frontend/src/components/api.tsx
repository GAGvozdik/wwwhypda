import axios from 'axios';

const isDevMode = process.env.DEV_MODE === "true";

const getBaseURL = () => {
  if (isDevMode) {
    return process.env.REACT_APP_BASE_URL_DOCKER;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

export default api;
