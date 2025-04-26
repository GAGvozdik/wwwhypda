import DataTable from '../search/dataTable';
import SearchResultsTable from '../search/searchResultsTable';
import React from 'react';
import styles from '../menu.module.scss';
import axios from 'axios';
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {useEffect, useState, useRef} from 'react';


const Documents: React.FC = () => {

    return (
        <div className={styles.treeText}>
            <h2>Documents</h2>
            {/* <SearchResultsTable/> */}
        </div>
    );
};

export default Documents;

