import React from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export interface WithRecaptchaProps {
  executeRecaptcha?: (action?: string) => Promise<string>;
}

const withRecaptcha = <P extends object>(WrappedComponent: React.ComponentType<P & WithRecaptchaProps>) => {
  const WithRecaptchaComponent: React.FC<P> = (props) => {
    const { executeRecaptcha } = useGoogleReCaptcha();
    return <WrappedComponent {...props} executeRecaptcha={executeRecaptcha} />;
  };

  return WithRecaptchaComponent;
};

export default withRecaptcha;
