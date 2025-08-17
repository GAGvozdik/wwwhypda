import React from 'react';
import { Provider } from 'react-redux';
import store from './redux/store';
import { BrowserRouter as Router } from 'react-router-dom';
import MainWindow from './components/mainWindow/mainWindow';
import './App.css';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export default function App() {
    const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

    if (!recaptchaSiteKey) {
        return <div>reCAPTCHA site key not found in environment variables.</div>;
    }

    return (
        <div>
            <Provider store={store}>
                <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
                    <Router>
                        <MainWindow />
                    </Router>
                </GoogleReCaptchaProvider>
            </ Provider>
        </div>
    );
}
