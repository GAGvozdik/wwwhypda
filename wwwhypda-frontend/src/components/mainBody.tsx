// import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AdbIcon from '@mui/icons-material/Adb';
import logo2 from './logo4.png';

import { useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
import {useEffect, useState, useRef} from 'react';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import IconButton from '@mui/material/IconButton';
import styles from "./menu.module.scss" 

import { useSelector, useDispatch } from 'react-redux';
import { UpdateTheme, UpdateOpenClose } from '../redux/actions';
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../common/types';

import { useMediaQuery } from 'react-responsive';

import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './pages/home';
import About from './pages/about';
import NotFound from './pages/notFound';
import Contribute from './pages/contribute';
import Search from './pages/search';
import Documents from './pages/documents';

import Account from './pages/account';
import InputPage from './pages/inputPage'; 
import ProtectedRoute from './users/protectedRoute';
import Login from './users/login';
import Register from './users/registration';
// import Dashboard from './pages/Dashboard';

import { AppProvider } from '@toolpad/core/AppProvider';
import ForgotPassword from './users/forgotPassword';





export default function MainMenu() {

    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);  

    const token = useSelector((state: State) => state.token);
    
    return (
        <div className={`${styles.bodyMenuItem} ${isDarkTheme ? styles.dark : ''}`}>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                {/* <Route path="/contribute" element={<Contribute />} /> */}
                <Route path="/documents" element={<Documents />} />
                <Route path="/about" element={<About />} />
                <Route path="/notfound" element={<NotFound />} /> 

                {/* <Route path="/account" element={
                    <AppProvider>
                        <Account onSignIn={handleSignIn} />
                    </AppProvider>
                } />  */}

                <Route
                    path="/account"
                    element={
                        <ProtectedRoute>
                            <Account />
                        </ProtectedRoute>
                    }
                />
                
                {/* <Route
                    path="/input"
                    element={<InputPage />}
                /> */}

                <Route
                    path="/input"
                    element={
                        <ProtectedRoute>
                            <InputPage />
                        </ProtectedRoute>
                    }
                />

                <Route path="/login" element={<Login />} />

                <Route
                    path="/contribute"
                    element={<Contribute />}
                />

                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

            </Routes>
        </div>
    )
};