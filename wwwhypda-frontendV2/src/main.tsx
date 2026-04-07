// import { StrictMode } from 'react'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import { ModuleRegistry } from 'ag-grid-community';
import { ClientSideRowModelModule, PaginationModule, ValidationModule } from 'ag-grid-community';

import { Provider } from 'react-redux';
import store from './redux/store';
import App from './App';

// СТРОГО ЗАКОММЕНТИРОВАНО:
// import { AllEnterpriseModules } from 'ag-grid-enterprise';
// ModuleRegistry.registerModules(AllEnterpriseModules);

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    PaginationModule,
    ValidationModule
]);

// import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();