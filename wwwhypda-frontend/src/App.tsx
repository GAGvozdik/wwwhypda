import React from 'react';
import { Provider } from 'react-redux';
import store from './redux/store';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import MainWindow from './components/mainWindow/mainWindow';
import './App.css';

export default function App() {

    return (
        <div>
            <Provider store={store}>
                <Router>
                    <MainWindow />
                </Router>
            </ Provider>
        </div>
    );
}