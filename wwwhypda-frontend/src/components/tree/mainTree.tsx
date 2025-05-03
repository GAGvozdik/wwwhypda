import * as React from 'react';
import Box from '@mui/material/Box';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
// import styles from '../menu.module.scss';
import styles from './treeStyles.module.scss';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';                 
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../../common/types';
import { UpdateTheme, UpdateOpenClose } from '../../redux/actions';
import {useEffect, useState, useRef} from 'react';
import CustomTreeItem from './customTreeItem';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';
import MenuIcon from '@mui/icons-material/Menu';
import axios from 'axios';
import SingleSkeleton from '../commonFeatures/singleSkeleton';


interface RockTypeData {
    rt_id: number;
    rt_name: string;
    rt_description: string | null;
    rt_wiki_link: string | null;
    rt_left: number;
    rt_right: number;
    rt_id_parent: number;
    rt_USCS: string | null;
    UID: string | null;
    PARENTUID: string | null;
    rt_status: number;
    status_name: string | null; 
}


const buildTree = (data: RockTypeData[]): JSX.Element[] => {
    
    const nodeMap: { [key: number]: RockTypeData } = {};
    data.forEach(node => nodeMap[node.rt_id] = node);

    
    const rootNodes = data.filter(node => node.rt_id_parent === -1);

    
    const createTreeItem = (nodeId: number): JSX.Element => {
        const node = nodeMap[nodeId];
        if (!node) {
            return(<></>)
        }; 

        const children = data.filter(child => child.rt_id_parent === node.rt_id);
        const childItems = children.map(child => createTreeItem(child.rt_id));

        return (
            <CustomTreeItem
                // sx={{ float: 'left'}}
                key={node.rt_id}
                name={node.rt_name}
                rt_id={node.rt_id.toFixed()}
                rt_name={node.rt_name}
            >
                    {childItems}
            </CustomTreeItem>
        );
    };

    
    return rootNodes.map(rootNode => createTreeItem(rootNode.rt_id));
};


export default function ModelsTreeDrawer() {
    const [treeData, setTreeData] = useState<RockTypeData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const isDarkTheme = useSelector((state: State) => state.isDarkTheme);
    const isOpenNow = useSelector((state: State) => state.open);

    // Загружаем данные
    useEffect(() => {
        const fetchRockTypes = async () => {
            try {
                const response = await axios.get<RockTypeData[]>('http://localhost:5000/api/rock_type');

                if (!response.data || response.data.length === 0) {
                    setError("No data received from the server.");
                } else {
                    setTreeData(response.data);
                }
            } catch (error: any) {
                setError(getErrorMessage(error));
            }
        };

        fetchRockTypes();
    }, []);

    // Отслеживаем загрузку
    useEffect(() => {
        if (treeData.length > 0 || error) {
            setLoading(false);
        }
    }, [treeData, error]);

    const getErrorMessage = (error: any): string => {
        if (error.response) {
            return `HTTP error! status: ${error.response.status}, data: ${error.response.data}`;
        } else if (error.request) {
            return 'Error: No response received from the server.';
        } else {
            return `Error: ${error.message}`;
        }
    };

    const tree = buildTree(treeData); // твоя функция построения дерева

    return (
        <div className={
            isOpenNow 
                ? `${styles.hidingDrawer} ${isDarkTheme ? styles.dark : ''}`
                : `${styles.openHidingDrawer} ${isDarkTheme ? styles.dark : ''}`
        }>
            <div 
            className={styles.treeBody}
            style={{
                backgroundColor: 'var(--drawer-color)',
                height: '100%',
                // borderRadius: '5px',
                overflowY: 'auto',
                overflowX: 'hidden',
            }}>
                {isOpenNow ? (
                    <></>
                ) : (
                    <SingleSkeleton loading={loading} error={error}>
                        <SimpleTreeView
                            sx={{
                                color: 'var(--tree-text)',
                                fontFamily: 'Afacad_Flux !important',
                                fontSize: 'var(--tree-font-size)'
                            }}
                        >
                            {tree}
                        </SimpleTreeView>
                    </SingleSkeleton>
                )}
            </div>
        </div>
    );
}







