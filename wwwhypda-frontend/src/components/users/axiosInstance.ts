// axiosInstance.ts
import axios from 'axios';
import store from '../../redux/store';
import { UpdateToken } from '../../redux/actions';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000',
});

// Response interceptor for handling 401 errors
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            console.warn('Token expired or unauthorized');

            // Clear token from store and localStorage
            store.dispatch(UpdateToken(""));
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login
            window.location.href = '/login'; // force redirect
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
