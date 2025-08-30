import axios from 'axios';

const isDevMode = process.env.DEV_MODE === "true";

const getBaseURL = () => {
  if (!isDevMode) {
    return process.env.REACT_APP_BASE_URL_LOCAL;
  }
  return process.env.REACT_APP_BASE_URL_DOCKER;
};


const api = axios.create({
  baseURL: getBaseURL(),
});

export default api;
