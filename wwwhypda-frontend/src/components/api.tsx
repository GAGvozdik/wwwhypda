import axios from 'axios';

const getBaseURL = () => {
  if (window.location.hostname === 'localhost') {
    return process.env.REACT_APP_BASE_URL_LOCAL;
  }
  return process.env.REACT_APP_BASE_URL_DOCKER;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

export default api;
