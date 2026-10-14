import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import store from './redux/store';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import MainWindow from './components/mainWindow/mainWindow';
import './App.css';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { requiresRecaptcha } from './components/commonFeatures/recaptchaRoutes';

function SiteContent() {
    const { pathname } = useLocation();
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    const needsRecaptcha = requiresRecaptcha(pathname);
    const [initialNeedsRecaptcha] = useState(needsRecaptcha);

    useEffect(() => {
        // Reload across this boundary to discard scripts, frames and timers from the previous document.
        // Removing the React provider alone cannot undo all execution of a third-party script.
        if (needsRecaptcha !== initialNeedsRecaptcha) window.location.reload();
    }, [needsRecaptcha, initialNeedsRecaptcha]);

    if (needsRecaptcha !== initialNeedsRecaptcha) return null;
    // Legal information remains accessible without contacting the CAPTCHA provider.
    if (!needsRecaptcha) {
        return <MainWindow />;
    }
    if (!recaptchaSiteKey) {
        return <div>reCAPTCHA site key not found in environment variables.</div>;
    }
    return <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey} useRecaptchaNet><MainWindow /></GoogleReCaptchaProvider>;
}

export default function App() {
    return <Provider store={store}><Router><SiteContent /></Router></Provider>;
}
