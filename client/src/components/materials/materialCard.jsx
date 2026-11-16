// src/components/admin/materialCard.jsx
import React, { useState } from "react";
import {
  Card, Typography, Grid, IconButton,
  CardActions, Button, Box, Skeleton
} from "@mui/material";
import ChecklistIcon from '@mui/icons-material/Checklist';
import { useDispatch } from "react-redux";
import { updateMaterial, fetchMaterials } from "../../features/material/materialSlice";
import MaterialInformation from "./MaterialInformation";
import Icon from '@mdi/react';
import { mdiCubeOutline } from '@mdi/js';
import "./materialCard.css";

const MaterialCardSkeleton = () => (
  <Grid item xs={12} sm={6} md={3}>
    <Card className="custom-card" style={{ padding: 16 }}>
      <Skeleton variant="text" width="60%" height={28} />
      <Skeleton variant="text" width="40%" height={20} style={{ marginTop: 6 }} />

      <Box style={{ marginTop: 20, display: "flex", alignItems: "center" }}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton width="30%" style={{ marginLeft: 10 }} />
      </Box>
    </Card>
  </Grid>
);

const MaterialCard = ({ cardData, loading }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const handleSelectedMaterial = (material) => {
    setSelectedMaterial(material);
    setOpen(true);
  };

  const handleSaveMaterial = async (updatedMaterial) => {
    const resultAction = await dispatch(updateMaterial(updatedMaterial));

    if (updateMaterial.fulfilled.match(resultAction)) {
      dispatch(fetchMaterials());
      setOpen(false);
    } else {
      alert("Update failed: " + resultAction.payload);
    }
  };

  return (
    <Box className="card-container">
      <Grid container spacing={2} justifyContent="center">
        {loading
          ? Array.from(new Array(8)).map((_, i) => (
            <MaterialCardSkeleton key={i} />
          ))
          : cardData?.map((material) => (
            <Grid item xs={12} sm={6} md={3} key={material.material_id}>

              <Card
                className="custom-card"
                onClick={() => handleSelectedMaterial(material)}
                style={{ cursor: "pointer" }}
              >

                <Box>
                  <Typography className="card-title">
                    {material.name}
                  </Typography>
                  <Icon path={mdiCubeOutline}
                    title="material icon"
                    size={1}
                    horizontal
                    vertical
                    rotate={360}
                    color="black"
                    spin
                  />
                </Box>

                <Typography className="card-description">
                  {material.code}
                </Typography>

                {/* <Typography fontSize='10px'>
                    {material.description}
                  </Typography> */}

                <Box className="node-box">


                  <Typography className="node-text">
                    Quantity : {material.quantity} {material.uom}
                  </Typography>
                </Box>    

              </Card>
            </Grid>
          ))}
      </Grid>

      <MaterialInformation
        open={open}
        handleClose={() => setOpen(false)}
        selectedMaterial={selectedMaterial}
        onSave={handleSaveMaterial}
      />
    </Box>
  );
};

export default MaterialCard;
