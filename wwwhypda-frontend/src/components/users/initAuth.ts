import { UpdateToken } from '../../redux/actions';

export default function isTokenValid(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now(); // токен ещё действителен
    } catch {
        return false;
    }
}


// redux/initAuth.ts

export const initAuth = (store: any) => {
    const token = localStorage.getItem('token');

    if (token && isTokenValid(token)) {
        store.dispatch(UpdateToken(token));
    } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        store.dispatch(UpdateToken(''));
    }
};
