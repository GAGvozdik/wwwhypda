import type * as React from 'react';
import type { RockTypeData } from '../../common/types';
import { findAllRockTypesId } from '../../common/catalog';
import messages from '../../common/error_messages.json';
import CustomTreeItem from './customTreeItem';

export const buildTree = (data: RockTypeData[]): React.ReactNode[] => {

    if (!Array.isArray(data)) {
        return [];
    }

    const allRootId = findAllRockTypesId(data);
    const nodeMap: { [key: number]: RockTypeData } = {};
    data.forEach(node => nodeMap[node.rt_id] = node);


    const rootNodes = data.filter(node => node.rt_id_parent === -1);


    const createTreeItem = (nodeId: number, depth = 0): React.ReactNode => {
        const node = nodeMap[nodeId];
        if (!node) {
            return(<></>)
        };

        const children = data.filter(child => child.rt_id_parent === node.rt_id);
        const childItems = children.map(child => createTreeItem(child.rt_id, depth + 1));

        return (
            <CustomTreeItem
                key={node.rt_id}
                name={String(node.rt_id) === allRootId ? messages.search_all_rock_types : node.rt_name}
                rt_id={node.rt_id.toFixed()}
                depth={depth}
                isRoot={String(node.rt_id) === allRootId}
                isGroup={children.length > 0}
                rt_name={node.rt_name}
            >
                    {childItems}
            </CustomTreeItem>
        );
    };


    return rootNodes.map(rootNode => createTreeItem(rootNode.rt_id));
};


