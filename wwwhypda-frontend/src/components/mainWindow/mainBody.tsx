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
import styles from "./windowStyles.module.scss"; 

import { useSelector, useDispatch } from 'react-redux';
import { UpdateTheme, UpdateOpenClose } from '../../redux/actions';
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../../common/types';

import { useMediaQuery } from 'react-responsive';

import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from '../pages/home';
import About from '../pages/about';
import NotFound from '../pages/notFound';
import Contribute from '../pages/contribute';



import Search from '../search/search';
import Documents from '../pages/documents';

import Account from '../users/accounts/account';

import InputPageRead from '../pages/InputPageRead';
import InputPage from '../pages/inputPage'; 
import InputPageEdit from '../pages/inputPageEdit';

import ProtectedRoute from '../users/routes/protectedRoute';
import Login from '../users/auth/login';
import Register from '../users/auth/registration';
// import Dashboard from './pages/Dashboard';

import { AppProvider } from '@toolpad/core/AppProvider';
import ForgotPassword from '../users/auth/forgotPassword';

import SuperuserAccount from '../users/accounts/superuser';
import SuperProtectedRoute from '../users/routes/superProtectedRoute';
import { ModalProvider } from '../modal/modalContext';

export default function MainMenu() {

    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);  
    const modalRootRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={modalRootRef} className={`${styles.bodyMenuItem} ${isDarkTheme ? styles.dark : ''}`}>
            <ModalProvider modalRootRef={modalRootRef}>
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
                        element={<ProtectedRoute><Account /></ProtectedRoute>} 
                    />

                    <Route 
                        path="/superaccount" 
                        element={<SuperProtectedRoute><SuperuserAccount /></SuperProtectedRoute>} 
                    />

                    <Route 
                        path="/check_suggestions" 
                        element={<SuperProtectedRoute><InputPageRead /></SuperProtectedRoute>} 
                    />

                    <Route 
                        path="/edit" 
                        element={<ProtectedRoute><InputPageEdit /></ProtectedRoute>} 
                    />

                    <Route
                        path="/input"
                        element={
                            <ProtectedRoute>
                                <InputPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/contribute"
                        element={<Contribute />}
                    />

                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                </Routes>
            </ModalProvider>
        </div>
    )
};