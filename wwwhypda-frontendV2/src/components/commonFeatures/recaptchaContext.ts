import { createContext } from 'react';
export type CaptchaExecutor = (action?: string) => Promise<string>;
export const RecaptchaRequestContext = createContext<CaptchaExecutor | undefined>(undefined);
