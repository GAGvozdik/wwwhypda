import axios from 'axios';

const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  return 'http://localhost:5000';
};

const api = axios.create({
  baseURL: getBaseURL(),
});


export default api;
