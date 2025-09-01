import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import "./components/menu.module.scss";
import { Provider } from 'react-redux';
import store from './redux/store';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

if (!recaptchaSiteKey) {
  throw new Error("REACT_APP_RECAPTCHA_SITE_KEY is not set in the environment variables.");
}

root.render(
  <React.StrictMode>
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      <Provider store={store}>
        <App />
      </Provider>
    </GoogleReCaptchaProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();