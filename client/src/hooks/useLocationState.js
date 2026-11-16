// import { useState, useCallback } from "react";
// import { DEFAULT_LOCATION } from "../components/constant/constants";

// export function useLocationState(initialLocations = [DEFAULT_LOCATION]) {
//   const [locations, setLocations] = useState(initialLocations);

// //   const addLocation = useCallback(
// //       (newLocation, parentCode) => {
// //           const newNode = {
// //               code: `${Date.now()}_${Math.random()}`,
// //               ...newLocation,
// //               children: [],
// //           };
// //           console.log(newLocation);

// //           const addRecursive = (nodes) =>
// //               nodes?.map((node) => {
// //                   if (node.code === parentCode) {
// //                       return { ...node, children: [...node.children, newNode] };
// //                   }
// //                   return { ...node, children: addRecursive(node.children) };
// //               });

// //           setLocations(addRecursive(locations));
// //       },
// //       [locations]
// //   );

// const addLocation = useCallback((newLocation, parentCode) => {
//     const newNode = {
//         code: `${Date.now()}_${Math.random()}`,
//         ...newLocation,
//         children: [],
//     };

//     setLocations((prev) => {
//         // 🌱 Add as ROOT node if no parentCode provided
//         if (!parentCode) {
//             return [...prev, newNode];
//         }

//         // 🌿 Add to a parent if parentCode exists
//         const addRecursive = (nodes = []) =>
//             nodes.map((node) => {
//                 if (node.code === parentCode) {
//                     return {
//                         ...node,
//                         children: [...node.children, newNode],
//                     };
//                 }
//                 return {
//                     ...node,
//                     children: addRecursive(node.children || []),
//                 };
//             });

//         return addRecursive(prev);
//     });
// }, []);

//   const removeLocation = useCallback(
//     (code) => {
//       const removeRecursive = (nodes) =>
//         nodes
//           .filter((node) => node.code !== code)
//           .map((n) => ({
//             ...n,
//             children: removeRecursive(n.children),
//           }));

//       setLocations(removeRecursive(locations));
//     },
//     [locations],
//   );

//   const updateLocation = useCallback(
//     (code, updates) => {
//       const updateRecursive = (nodes) =>
//         nodes.map((node) => {
//           if (node.code === code) {
//             return { ...node, ...updates };
//           }
//           return { ...node, children: updateRecursive(node.children) };
//         });

//       setLocations(updateRecursive(locations));
//     },
//     [locations],
//   );

//   return {
//     locations,
//     setLocations,
//     addLocation,
//     removeLocation,
//     updateLocation,
//   };
// }

// ----------------------------------------------------

// import { useState, useCallback } from "react";
// import { DEFAULT_LOCATION } from "../components/constant/constants";

// export function useLocationState() {
//     const [locations, setLocations] = useState([]);

//     // ⭐ Add Location (Root or Child)
//     const addLocation = useCallback((newLocation, parentCode) => {
//         const newNode = {
//             code: `${Date.now()}_${Math.random()}`,
//             ...newLocation,
//             children: [],
//         };

//         setLocations((prev) => {
//             // 🌱 Add as ROOT when parentCode is not given
//             if (!parentCode) {
//                 return [...prev, newNode];
//             }

//             // 🌿 Add as child when parent exists
//             const addRecursive = (nodes = []) =>
//                 nodes.map((node) => {
//                     if (node.code === parentCode) {
//                         return {
//                             ...node,
//                             children: [...node.children, newNode],
//                         };
//                     }
//                     return {
//                         ...node,
//                         children: addRecursive(node.children || []),
//                     };
//                 });

//             return addRecursive(prev);
//         });
//     }, []);

//     // ⭐ Remove Location (supports removing root or child)
//     const removeLocation = useCallback((code) => {
//         const removeRecursive = (nodes = []) =>
//             nodes
//                 .filter((node) => node.code !== code)
//                 .map((node) => ({
//                     ...node,
//                     children: removeRecursive(node.children || []),
//                 }));

//         setLocations((prev) => removeRecursive(prev));
//     }, []);

//     // ⭐ Update Location (root or nested)
//     const updateLocation = useCallback((code, updates) => {
//         const updateRecursive = (nodes = []) =>
//             nodes.map((node) => {
//                 if (node.code === code) {
//                     return { ...node, ...updates };
//                 }
//                 return {
//                     ...node,
//                     children: updateRecursive(node.children || []),
//                 };
//             });

//         setLocations((prev) => updateRecursive(prev));
//     }, []);

//     return {
//         locations,
//         setLocations,
//         addLocation,
//         removeLocation,
//         updateLocation,
//     };
// }

import { useState, useCallback } from "react";

export function useLocationState() {
  const [locations, setLocations] = useState([]);

  // ⭐ Add Location
  const addLocation = useCallback(
    (newLocation, parentCode = null) => {
      const newNode = {
        // code : `${newLocation.parent}_${newLocation.name}`,
        ...newLocation,
        children: [],
      }; 

      setLocations((prev) => {
        // 🟢 FIX: FIRST ROOT INSERT
        if (!parentCode) {
          return prev.length === 0 ? [newNode] : [...prev, newNode];
        }

        const addRecursive = (nodes) =>
          nodes.map((node) => {
            if (node.code === parentCode) {
              return {
                ...node,
                children: [...node.children, newNode],
              };
            }
            return {
              ...node,
              children: addRecursive(node.children),
            };
          });

        return addRecursive(prev);
      });
    },
    [locations],
  );

  // ⭐ Remove Location
  const removeLocation = useCallback((code) => {
    const removeRecursive = (nodes) =>
      nodes
        .filter((node) => node.code !== code)
        .map((node) => ({
          ...node,
          children: removeRecursive(node.children),
        }));

    setLocations((prev) => removeRecursive(prev));
  }, []);

  // ⭐ Update Location
  // const updateLocation = useCallback((code, updates) => {
  //   const updateRecursive = (nodes) =>
  //     nodes.map((node) => {
  //       if (node.code === code) {
  //         return { ...node, ...updates };
  //       }
  //       return {
  //         ...node,
  //         children: updateRecursive(node.children),
  //       };
  //     });

  //   setLocations((prev) => updateRecursive(prev));
  // }, []);

  const updateLocation = useCallback((code, updates) => {
    setLocations((prev) => {
      // 1. Locate the existing target structure within our current state
      let currentTarget = null;
      const findTarget = (nodes) => {
        for (const node of nodes) {
          if (node.code === code) currentTarget = node;
          if (node.children) findTarget(node.children);
        }
      };
      findTarget(prev);

      if (!currentTarget) return prev; // Node not found, guard clause return

      // Check if user changed the tree's hierarchical parent position assignment
      const hasParentChanged = updates.parent !== undefined && updates.parent !== currentTarget.parent;

      if (hasParentChanged) {
        // --- STRUCTURAL RELOCATION ---
        // A. Recursively isolate and pluck the node from its old structural segment
        const findAndRemoveNode = (nodes) => {
          let removedNode = null;
          const filtered = nodes
            .filter((node) => {
              if (node.code === code) {
                removedNode = node;
                return false;
              }
              return true;
            })
            .map((node) => {
              if (node.children && node.children.length > 0) {
                const [updatedChildren, found] = findAndRemoveNode(node.children);
                if (found) removedNode = found;
                return { ...node, children: updatedChildren };
              }
              return node;
            });
          return [filtered, removedNode];
        };

        const [treeWithoutNode, nodeToMove] = findAndRemoveNode(prev);
        if (!nodeToMove) return prev;

        // Formulate complete updated metadata state snapshot layer
        const fullyUpdatedNode = {
          ...nodeToMove,
          ...updates,
          children: nodeToMove.children, // Ensure historical lower down children remain uncompromised
        };

        // B. Inject updated leaf target into newly assigned parent branch container destinations
        if (!updates.parent) {
          // Promote target up directly to the root node structure array context layer
          return [...treeWithoutNode, fullyUpdatedNode];
        } else {
          // Travel into tree to splice it inside the correct parent
          const insertNodeRecursive = (nodes) =>
            nodes.map((node) => {
              if (node.code === updates.parent) {
                return {
                  ...node,
                  children: [...(node.children || []), fullyUpdatedNode],
                };
              }
              if (node.children && node.children.length > 0) {
                return {
                  ...node,
                  children: insertNodeRecursive(node.children),
                };
              }
              return node;
            });

          return insertNodeRecursive(treeWithoutNode);
        }
      } else {
        // --- INLINE PROPERTY UPDATE ---
        // Fallback to simple recursive map updates since parent position hierarchy was un-mutated
        const updateRecursive = (nodes) =>
          nodes.map((node) => {
            if (node.code === code) {
              return { ...node, ...updates };
            }
            return {
              ...node,
              children: updateRecursive(node.children || []),
            };
          });

        return updateRecursive(prev);
      }
    });
  }, []);

  return {
    locations,
    setLocations,
    addLocation,
    removeLocation,
    updateLocation,
  };
}
