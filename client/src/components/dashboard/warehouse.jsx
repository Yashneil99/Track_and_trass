// import { Box, Grid, List, Typography, Divider } from "@mui/material";
// import { RenderLocations } from "../../pages/dashboard/ongoingMovements";
// import { FloorPlan } from "../../pages/dashboard/floorPlan";
// import { useEffect, useState } from "react";
// import { SelectedLocationMovement } from "../../pages/dashboard/selectedLocationMovement";

// export default function WarehouseDashboard({ locations = [] }) {
//   const [onGoing, setOnGoing] = useState(new Set());
//   const [currentCode, setCurrentCode] = useState(null);
//   const [previousCode, setPreviousCode] = useState(null);
//   const [selectedMaterial, setSelectedMaterial] = useState(null);

//   const handleClick = (material) => {
//     setSelectedMaterial(material);

//     setTimeout(() => {
//       setSelectedMaterial(null);
//     }, 15000);
//   };

//   useEffect(() => {
//     const transitSet = new Set();
//     let activeCurrent = null;
//     let activePrevious = null;

//     const findTransitNodes = (nodes) => {
//       nodes.forEach((n) => {
//         if (n.status === "In Transit") {
//           transitSet.add(n);
//           activeCurrent = n.code;
//           activePrevious = n.previous_location;
//         }
//         if (n.children) findTransitNodes(n.children);
//       });
//     };

//     findTransitNodes(locations);
//     setOnGoing(transitSet);
//     setCurrentCode(activeCurrent);
//     setPreviousCode(activePrevious);
//   }, [locations]);



//   return (
// <Grid
//   container
//   sx={{
//     display: "flex",
//     flexDirection: "row",
//     flexWrap: "nowrap",
//     mt: 2,
//     height: "100%",
//     overflow: "hidden", // prevent horizontal scrollbar
//   }}
// >
//   {/* Left side: Floor Plan */}
//   <Grid
//     item
//     sx={{
//       px: 2,
//       height: "79vh",
//       flexGrow: 1, // take all available space
//       flexBasis: selectedMaterial ? "calc(100% - 350px)" : "100%", 
//       transition: "flex-basis 0.3s ease", // smooth shrink
//       overflowY: "auto",
//       borderRadius: 2,
//       border: "1px solid #DDD",
//       boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
//       bgcolor: "#FFF",
//     }}
//   >
//     <Typography
//       variant="h6"
//       fontWeight={700}
//       sx={{
//         p: 2,
//         borderBottom: "1px solid #EEE",
//         textAlign: "center",
//         mb: 1,
//       }}
//     >
//       Floor Plan
//     </Typography>

//     {locations.map((node) => (
//       <FloorPlan
//         key={node.code}
//         node={node}
//         currentCode={currentCode}
//         previousCode={previousCode}
//         handleClick={handleClick}
//       />
//     ))}
//   </Grid>

//   {/* Right side: show only if something is selected */}
//   {selectedMaterial && (
//     <Grid item sx={{ width: 350 }}>
//       <Box
//         sx={{
//           height: "79vh",
//           bgcolor: "#FFF",
//           borderRadius: 2,
//           border: "1px solid #DDD",
//           boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
//           overflowY: "auto",
//           transition: "all 0.3s ease",
//         }}
//       >
//         <Box>
//           <SelectedLocationMovement material={selectedMaterial} />
//         </Box>
//         <Typography
//           variant="h6"
//           fontWeight={700}
//           sx={{ p: 2, borderBottom: "1px solid #EEE", textAlign: "center" }}
//         >
//           Ongoing Movements
//         </Typography>
//         <Box sx={{ p: 1.5 }}>
//           <RenderLocations nodes={Array.from(onGoing)} />
//         </Box>
//       </Box>
//     </Grid>
//   )}
// </Grid>

//   );
// }


import { Box, Grid, Typography } from "@mui/material";
import { RenderLocations } from "../../pages/dashboard/ongoingMovements";
import { FloorPlan } from "../../pages/dashboard/floorPlan";
import { useEffect, useState } from "react";
import { SelectedLocationMovement } from "../../pages/dashboard/selectedLocationMovement";

export default function WarehouseDashboard({ locations = [] }) {
  const [onGoing, setOnGoing] = useState(new Set());
  const [currentCode, setCurrentCode] = useState(null);
  const [previousCode, setPreviousCode] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const handleClick = (material) => {
    setSelectedMaterial(material.materials);
    setSelectedNode(material);

    setTimeout(() => {
      setSelectedMaterial(null);
    }, 15000);
  };

  useEffect(() => {
    const transitSet = new Set();
    let activeCurrent = null;
    let activePrevious = null;

    const findTransitNodes = (nodes) => {
      nodes.forEach((n) => {
        // FIXED: materials is an array, not an object
        if (Array.isArray(n.materials)) {
          const transitMaterial = n.materials.find(
            (m) => m.status === "In Transit"
          );

          if (transitMaterial) {
            transitSet.add(n);
            activeCurrent = n.code;
            activePrevious = transitMaterial.previous_location || null;
          }
        }

        if (n.children) findTransitNodes(n.children);
      });
    };

    findTransitNodes(locations);

    setOnGoing(transitSet);
    setCurrentCode(activeCurrent);
    setPreviousCode(activePrevious);
  }, [locations]);

  return (
    <Grid
      container
      sx={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        mt: 2,
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* LEFT SIDE — Floor Plan */}
      <Grid
        item
        sx={{
          px: 2,
          height: "79vh",
          flexGrow: 1,
          flexBasis: selectedMaterial ? "calc(100% - 350px)" : "100%",
          transition: "flex-basis 0.3s ease",
          overflowY: "auto",
          borderRadius: 2,
          border: "1px solid #DDD",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          bgcolor: "#FFF",
        }}
      >
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{
            p: 2,
            borderBottom: "1px solid #EEE",
            textAlign: "center",
            mb: 1,
          }}
        >
          Floor Plan
        </Typography>

        {locations.map((node) => (
          <FloorPlan
            key={node.code}
            node={node}
            currentCode={currentCode}
            previousCode={previousCode}
            handleClick={handleClick}
          />
        ))}
      </Grid>

      {/* RIGHT PANEL — Material Details + Ongoing Movement */}
      {selectedMaterial && (
        <Grid item sx={{ width: 350 }}>
          <Box
            sx={{
              height: "79vh",
              bgcolor: "#FFF",
              borderRadius: 2,
              border: "1px solid #DDD",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              overflowY: "auto",
              transition: "all 0.3s ease",
            }}
          >
            {/* <SelectedLocationMovement material={selectedMaterial} /> */}
            <SelectedLocationMovement
              location={selectedNode}
              materials={selectedNode?.materials}
            />

            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ p: 2, borderBottom: "1px solid #EEE", textAlign: "center" }}
            >
              Ongoing Movements
            </Typography>

            <Box sx={{ p: 1.5 }}>
              <RenderLocations nodes={Array.from(onGoing)} />
            </Box>
          </Box>
        </Grid>
      )}
    </Grid>
  );
}