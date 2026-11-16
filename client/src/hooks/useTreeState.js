import { useState, useCallback } from "react";

export function useTreeState() {
    const [openNodes, setOpenNodes] = useState({});

const toggleNode = useCallback((code) => {
        setOpenNodes((prev) => ({ ...prev, [code]: !prev[code] }));
    }, []);

    const isNodeOpen = useCallback((code) => {
        return openNodes[code] || false;
    }, [openNodes]);

    // const openAllNodes = useCallback(() => {
    //     setOpenNodes((prev) => {
    //         const nodes = {};
    //         const traverse = (nodesArray) => {
    //             nodesArray?.forEach((node) => {
    //                 nodes[node.id] = true;
    //                 traverse(node.children);
    //             });
    //         };
    //         traverse(prev);
    //         return nodes;
    //     });
    // }, []);

    const openAllNodes = useCallback((treeData) => {
        const nodes = {};

        const traverse = (item) => {
            if (!item) return;

            if (Array.isArray(item)) {
                item.forEach((child) => traverse(child));
                return;
            }

            if (typeof item === "object") {
                if (item.code) nodes[item.code] = true;
                if (item.children) traverse(item.children);
            }
        };

        traverse(treeData);

        setOpenNodes(nodes);
    }, []);
    
    const closeAllNodes = useCallback(() => {
        setOpenNodes({});
    }, []);

    return {
        openNodes,
        setOpenNodes,
        toggleNode,
        isNodeOpen,
        openAllNodes,
        closeAllNodes,
    };
}