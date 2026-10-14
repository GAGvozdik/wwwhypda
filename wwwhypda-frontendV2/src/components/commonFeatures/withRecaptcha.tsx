import React from 'react';
import { useContext } from 'react';
import { RecaptchaRequestContext } from './recaptchaContext';

export interface WithRecaptchaProps {
  executeRecaptcha?: (action?: string) => Promise<string>;
}

const withRecaptcha = <P extends object>(WrappedComponent: React.ComponentType<P & WithRecaptchaProps>) => {
  const WithRecaptchaComponent: React.FC<P> = (props) => {
    const executeRecaptcha = useContext(RecaptchaRequestContext);
    const isCypressTest = import.meta.env.VITE_CYPRESS_TEST === 'true';

    if (isCypressTest) {
      const dummyExecuteRecaptcha = async (action?: string) => {
        console.log(`[Test Mode] reCAPTCHA executed for action: ${action}`);
        return 'test-token';
      };
      return <WrappedComponent {...props} executeRecaptcha={dummyExecuteRecaptcha} />;
    }
    
    return <WrappedComponent {...props} executeRecaptcha={executeRecaptcha} />;
  };

  return WithRecaptchaComponent;
};

export default withRecaptcha;