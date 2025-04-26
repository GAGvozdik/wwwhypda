import React from 'react';
import { Provider } from 'react-redux';
import store from './redux/store';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import MainWindow from './components/mainWindow/mainWindow';

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



// npm install @reduxjs/toolkit
// npm install --save @types/react-redux
// npm install @mui/icons-material
// npm install @mui/material @mui/styled-engine-sc styled-components  
// npm install @types/react-router-dom
// npm install react-router-dom
// npm install sass
// npm install --save-dev @types/node

