import React from 'react';
import styles from './treeStyles.module.scss';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

import { State, UpdateRTIDAction, UpdateRTNameAction } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import { UpdateRTID, UpdateRTName } from '../../redux/actions';
import {useState} from 'react';

interface CustomTreeItemProps {
    children?: React.ReactNode;
    name: string;
    className?: string;
    path?: string;
    rt_id: string;
    rt_name: string;
}

const CustomTreeItem: React.FC<CustomTreeItemProps> = ({ children, className, path, name, rt_id, rt_name}) => {

    const [localRTID, setRTID] = useState(rt_id); 
    const [localRTName, setRTName] = useState(rt_name); 

    const dispatch = useDispatch();

    const toggleTheme = () => {
        setRTID(localRTID); 
        dispatch<UpdateRTIDAction>(UpdateRTID(localRTID)); 

        setRTName(localRTName); 
        dispatch<UpdateRTNameAction>(UpdateRTName(localRTName)); 
    };

    return (
        <>
        {path ? 
            <Link to={path} style={{borderRadius: '15px',fontFamily: 'Afacad_Flux !important', textDecoration: 'none', fontSize: 'var(--tree-font-size)'}}>
                <TreeItem  
                    onClick={toggleTheme}
                    itemId={name}
                    label={name}
                    sx={{ 
                        '.MuiTreeItem-label': {borderRadius: '15px',fontFamily: 'Afacad_Flux !important', fontSize: 'var(--tree-font-size)'},
                        // '& .MuiTreeItem-content.Mui-selected ': { borderRadius: '0px', backgroundColor: 'red' },
                        '& .MuiTreeItem-content:hover': {borderRadius: '15px', backgroundColor: 'var(--tree-hover)', color: 'var(--tree-text)' }, 
                        // '& .MuiTreeItem-conten': { paddingLeft: '100px' }, 
                        // '& .MuiTreeItem- group': { padding: '6vh' }, 
                        color: 'var(--tree-text)',
                        '--TreeView-itemChildrenIndentation': '3vh',
                        '& .MuiTreeItem-content': {paddingLeft: '1.5vh', borderRadius: '15px',},
                        '& .MuiTreeItem-iconContainer': {width: '0px',borderRadius: '15px',},
                    }}
                >
                    {children ? children : ''}
                </TreeItem>
            </Link>
            :
            <TreeItem 
                onClick={toggleTheme}
                itemId={name}
                label={name}
                sx={{ 
                    '.MuiTreeItem-label': {fontFamily: 'Afacad_Flux !important', fontSize: 'var(--tree-font-size)'},
                    // '& .MuiTreeItem-content.Mui-selected ': { borderRadius: '0px', backgroundColor: 'red' },
                    '& .MuiTreeItem-content:hover': { backgroundColor: 'var(--tree-hover)', color: 'var(--tree-text)' }, 
                    // '& .MuiTreeItem-conten': { paddingLeft: '100px' }, 
                    // '& .MuiTreeItem-group': { padding: '6vh' }, 

                    color: 'var(--tree-text)',
                    '--TreeView-itemChildrenIndentation': '2.5vh',
                    '& .MuiTreeItem-content': {paddingLeft: '1.5vh', backgroundColor: ''},
                    '& .MuiTreeItem-iconContainer': {display: children ? '' : ''},
                    borderRadius: '15px',
                }}
            >
                {children ? children : ''}
            </TreeItem>
        }
        </>

    );
};

export default CustomTreeItem;




    // font-family: Afacad_Flux !important;
    // font-size: var(--under-menu-font-size);



