import messages from '../../common/error_messages.json';
import * as React from 'react';
// import Box from '@mui/material/Box';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
// import { TreeItem } from '@mui/x-tree-view/TreeItem';
import styles from './treeStyles.module.scss';
// import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
// import { UpdateTheme, UpdateOpenClose } from '../../redux/actions';
import {useEffect, useState} from 'react';
import CustomTreeItem from './customTreeItem';
// import IconButton from '@mui/material/IconButton';
// import ClearIcon from '@mui/icons-material/Clear';
// import MenuIcon from '@mui/icons-material/Menu';
// import axios from 'axios';
import SingleSkeleton from '../commonFeatures/singleSkeleton';
import api from '../api';

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


const buildTree = (data: RockTypeData[]): React.ReactNode[] => {

    if (!Array.isArray(data)) {
        return [];
    }

    const nodeMap: { [key: number]: RockTypeData } = {};
    data.forEach(node => nodeMap[node.rt_id] = node);


    const rootNodes = data.filter(node => node.rt_id_parent === -1);


    const createTreeItem = (nodeId: number): React.ReactNode => {
        const node = nodeMap[nodeId];
        if (!node) {
            return(<></>)
        };

        const children = data.filter(child => child.rt_id_parent === node.rt_id);
        const childItems = children.map(child => createTreeItem(child.rt_id));

        return (
            <CustomTreeItem
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


const ModelsTreeDrawer: React.FC = () => {
    const [treeData, setTreeData] = useState<RockTypeData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRockTypes = async () => {
                try {

                    const response = await api.get<RockTypeData[]>('/rocks/rock_type');

                    if (!response.data || response.data.length === 0) {
                        setError(messages.tree_empty);
                    } else {
                        setTreeData(response.data);
                    }
                } catch {
                    setError(messages.tree_failed);
                }

        };

        fetchRockTypes();
    }, []);

    useEffect(() => {
        if (treeData.length > 0 || error) {
            setLoading(false);
        }
    }, [treeData, error]);


    const tree = buildTree(treeData);

    return (
        <section id="rock-type-tree" className={styles.treePanel} aria-label={messages.ui_rock_type}>
            <div
            className={styles.treeBody}
            style={{
                backgroundColor: 'var(--drawer-color)',
            }}>
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
            </div>
        </section>
    );
};

export default ModelsTreeDrawer;