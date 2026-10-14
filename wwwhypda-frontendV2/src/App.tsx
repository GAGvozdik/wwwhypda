import { Provider } from 'react-redux';
import store from './redux/store';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import MainWindow from './components/mainWindow/mainWindow';
import './App.css';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

function SiteContent() {
    const { pathname } = useLocation();
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    // Legal information remains accessible without contacting the CAPTCHA provider.
    if (['/privacy-policy', '/cookie-policy', '/user-agreement'].includes(pathname)) {
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
