// Keep this list aligned with the routes that make CAPTCHA-protected API requests.
export function requiresRecaptcha(pathname: string): boolean {
    const path = pathname.replace(/\/+$/, '').toLowerCase() || '/';
    return ['/search', '/login', '/register', '/forgot-password'].includes(path);
}
