import React from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export interface WithRecaptchaProps {
  executeRecaptcha?: (action?: string) => Promise<string>;
}

const withRecaptcha = <P extends object>(WrappedComponent: React.ComponentType<P & WithRecaptchaProps>) => {
  const WithRecaptchaComponent: React.FC<P> = (props) => {
    const isCypressTest = process.env.REACT_APP_CYPRESS_TEST === 'true';

    if (isCypressTest) {
        const dummyExecuteRecaptcha = async (action?: string) => {
            console.log(`[Test Mode] reCAPTCHA executed for action: ${action}`);
            return 'test-token';
        };
        return <WrappedComponent {...props} executeRecaptcha={dummyExecuteRecaptcha} />;
    }

    const { executeRecaptcha } = useGoogleReCaptcha();
    return <WrappedComponent {...props} executeRecaptcha={executeRecaptcha} />;
  };

  return WithRecaptchaComponent;
};

export default withRecaptcha;