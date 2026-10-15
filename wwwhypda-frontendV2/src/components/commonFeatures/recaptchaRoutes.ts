// Keep this list aligned with the routes that make CAPTCHA-protected API requests.
const actions: Record<string, readonly string[]> = {
    '/search': ['search'],
    '/login': ['login'],
    '/register': ['register', 'confirm_registration', 'resend_code'],
    '/forgot-password': ['request_password_reset', 'resend_password_reset', 'confirm_password_reset'],
};
export function recaptchaRoute(pathname: string): string {
    return pathname.replace(/\/+$/, '').toLowerCase() || '/';
}
export function requiresRecaptcha(pathname: string): boolean {
    return recaptchaRoute(pathname) in actions;
}
export function allowsRecaptchaAction(pathname: string, action: unknown): action is string {
    return typeof action === 'string' && (actions[recaptchaRoute(pathname)]?.includes(action) ?? false);
}
export function isRecaptchaAction(action: unknown): action is string {
    return typeof action === 'string' && Object.values(actions).some(values => values.includes(action));
}
