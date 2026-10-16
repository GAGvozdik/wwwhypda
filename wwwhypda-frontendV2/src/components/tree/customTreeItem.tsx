import React from 'react';
// import styles from './treeStyles.module.scss';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Link } from 'react-router-dom';
// import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

// import {useState} from 'react';

interface CustomTreeItemProps {
    children?: React.ReactNode;
    name: string;
    className?: string;
    path?: string;
    rt_id: string;
    rt_name: string;
    depth?: number;
    isRoot?: boolean;
    isGroup?: boolean;
}

const CustomTreeItem: React.FC<CustomTreeItemProps> = ({ children, path, name, rt_id, depth = 0, isRoot = false, isGroup = false}) => {



    // const toggleTheme = (e: React.MouseEvent) => {
    //     e.stopPropagation();
    //     dispatch<UpdateRTIDAction>(UpdateRTID(rt_id));
    //     dispatch<UpdateRTNameAction>(UpdateRTName(rt_name));
    //     console.log('ci rt_name = ', rt_name);
    // };
    // const toggleTheme = () => {
    //     dispatch<UpdateRTIDAction>(UpdateRTID(rt_id));
    //     dispatch<UpdateRTNameAction>(UpdateRTName(rt_name));
    //     console.log('ci rt_name = ', rt_name);
    // };

    const labelSize = isRoot ? 'var(--tree-root-font-size)' : isGroup ? 'var(--tree-group-font-size)' : 'var(--tree-font-size)';
    const indentation = `calc(0.75rem + ${depth} * 1.25rem)`;
    return (
        <>
        {path ?
            <Link to={path} style={{borderRadius: '15px',fontFamily: 'Afacad_Flux !important', textDecoration: 'none', fontSize: 'var(--tree-font-size)'}}>
                <TreeItem
                    itemId={rt_id}
                    label={name}
                    sx={{
                        '& > .MuiTreeItem-content > .MuiTreeItem-label': {borderRadius: '15px',fontFamily: 'Afacad_Flux !important', fontSize: labelSize, fontWeight: isRoot || isGroup ? 700 : 400},
                        // '& .MuiTreeItem-content.Mui-selected ': { borderRadius: '0px', backgroundColor: 'red' },
                        '& > .MuiTreeItem-content:hover': {borderRadius: '15px', backgroundColor: 'var(--tree-hover)', color: 'var(--tree-text)' },
                        // '& .MuiTreeItem-conten': { paddingLeft: '100px' },
                        // '& .MuiTreeItem- group': { padding: '6vh' },
                        color: 'var(--tree-text)',
                        '--TreeView-itemChildrenIndentation': '0rem',
                        '& > .MuiTreeItem-content': {paddingLeft: indentation, borderRadius: '15px',},
                        '& .MuiTreeItem-iconContainer': {width: '1rem',borderRadius: '15px',},
                    }}
                >
                    {children ? children : ''}
                </TreeItem>
            </Link>
            :
            <TreeItem
                itemId={rt_id}
                label={name}
                sx={{
                    '& > .MuiTreeItem-content > .MuiTreeItem-label': {fontFamily: 'Afacad_Flux !important', fontSize: labelSize, fontWeight: isRoot || isGroup ? 700 : 400},
                    // '& .MuiTreeItem-content.Mui-selected ': { borderRadius: '0px', backgroundColor: 'red' },
                    '& > .MuiTreeItem-content:hover': { backgroundColor: 'var(--tree-hover)', color: 'var(--tree-text)' },
                    // '& .MuiTreeItem-conten': { paddingLeft: '100px' },
                    // '& .MuiTreeItem-group': { padding: '6vh' },

                    color: 'var(--tree-text)',
                    '--TreeView-itemChildrenIndentation': '0rem',
                    '& > .MuiTreeItem-content': {paddingLeft: indentation, backgroundColor: ''},
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



