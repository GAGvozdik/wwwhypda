import { installRecaptchaFrame } from './recaptchaFrameRuntime';
installRecaptchaFrame(window, document, import.meta.env.VITE_RECAPTCHA_SITE_KEY);
