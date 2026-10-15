import { Provider } from 'react-redux';
import store from './redux/store';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import MainWindow from './components/mainWindow/mainWindow';
import './App.css';
import RecaptchaProvider from './components/commonFeatures/recaptchaProvider';

function SiteContent() {
    const { pathname } = useLocation();
    // Historical lifecycle, replaced by an explicitly disposable CAPTCHA document:
    // Reload across this boundary to discard scripts, frames and timers from the previous document.
    // Removing the React provider alone cannot undo all execution of a third-party script.
    // Legal information remains accessible without contacting the CAPTCHA provider.
    return <RecaptchaProvider pathname={pathname}><MainWindow /></RecaptchaProvider>;
}

export default function App() {
    return <Provider store={store}><Router><SiteContent /></Router></Provider>;
}
