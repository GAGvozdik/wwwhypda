import { UpdateToken } from './actions';

export const initAuth = (store: any) => {
    const token = localStorage.getItem('token');
    if (token) {
        store.dispatch(UpdateToken(token));
    }
};
