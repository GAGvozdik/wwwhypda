import { isRecaptchaAction } from './recaptchaRoutes';
export const RECAPTCHA_CHANNEL = 'wwhypda-recaptcha-v1';
export interface CaptchaRequest {
    channel: typeof RECAPTCHA_CHANNEL; type: 'execute'; id: string; action: string;
}
export type CaptchaResponse = { channel: typeof RECAPTCHA_CHANNEL; id: string } &
    ({ type: 'token'; token: string } | { type: 'error' });
function record(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function requestId(value: unknown): value is string {
    return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
}
export function isCaptchaRequest(value: unknown): value is CaptchaRequest {
    return record(value) && Object.keys(value).length === 4 && value.channel === RECAPTCHA_CHANNEL &&
        value.type === 'execute' && requestId(value.id) && isRecaptchaAction(value.action);
}
export function isCaptchaResponse(value: unknown): value is CaptchaResponse {
    if (!record(value) || value.channel !== RECAPTCHA_CHANNEL || !requestId(value.id)) return false;
    if (value.type === 'error') return Object.keys(value).length === 3;
    return value.type === 'token' && Object.keys(value).length === 4 && typeof value.token === 'string' &&
        value.token.length > 0 && value.token.length <= 16384 && value.token.trim() === value.token;
}
