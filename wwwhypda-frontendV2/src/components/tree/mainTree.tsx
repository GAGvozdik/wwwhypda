import messages from '../../common/error_messages.json';
import * as React from 'react';
// import Box from '@mui/material/Box';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
// import { TreeItem } from '@mui/x-tree-view/TreeItem';
import styles from './treeStyles.module.scss';
// import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
// import { UpdateTheme, UpdateOpenClose } from '../../redux/actions';
import {useEffect, useState} from 'react';
import { findAllRockTypesId } from '../../common/catalog';
import { buildTree } from './treeBuilder';
import type { RockTypeData } from '../../common/types';
// import IconButton from '@mui/material/IconButton';
// import ClearIcon from '@mui/icons-material/Clear';
// import MenuIcon from '@mui/icons-material/Menu';
// import axios from 'axios';
import SingleSkeleton from '../commonFeatures/singleSkeleton';
import api from '../api';
import { useDispatch } from 'react-redux';
import { UpdateRTID, UpdateRTName } from '../../redux/actions';

const ModelsTreeDrawer: React.FC<{ onRootKnown?: (id: string | null) => void }> = ({ onRootKnown }) => {
    const dispatch = useDispatch();
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
                        onRootKnown?.(findAllRockTypesId(response.data));
                    }
                } catch {
                    setError(messages.tree_failed);
                }

        };

        fetchRockTypes();
    }, [onRootKnown]);

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
                    <SingleSkeleton loading={loading} error={error} height="100%" overlay borderRadius="0.5rem">
                        <SimpleTreeView
                            onItemSelectionToggle={(_event, itemId, selected) => {
                                const node = treeData.find(item => String(item.rt_id) === itemId);
                                if (selected && node) {
                                    dispatch(UpdateRTID(String(node.rt_id)));
                                    dispatch(UpdateRTName(node.rt_name));
                                }
                            }}
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