import React from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import "./cart.css";

const carrierCards = [
  {
    id: 1,
    title: "Express Logistics",
    rating: 4.8,
    active: 12,
    total: 156,
    vehicles: 8,
    transit: 12,
    phone: "+1 234 567 8900",
    email: "contact@express.com",
    location: "Zone A - Warehouse 1",
  },
  {
    id: 2,
    title: "Fast Track Transport",
    rating: 4.6,
    active: 8,
    total: 143,
    vehicles: 6,
    transit: 8,
    phone: "+1 234 567 8901",
    email: "info@fasttrack.com",
    location: "Zone B - Warehouse 2",
  },
];

const Cart = () => {

  return (
    <Box className="cart-container">

      {/* Header */}
      <Box className="cart-header">
        <Typography variant="h5" fontWeight="600">
          Carrier Management
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          className="add-btn"
        >
          Add Carrier
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box className="stats-grid">

        <Card className="stats-card gradient-card">
          <CardContent className="stats-content">
            <Box>
              <Typography variant="body2">Total Carriers</Typography>
              <Typography variant="h4" fontWeight="600">
                6
              </Typography>
            </Box>

            <Box className="icon-box icon-white">
              <LocalShippingIcon />
            </Box>
          </CardContent>
        </Card>


        <Card className="stats-card">
          <CardContent className="stats-content">
            <Box>
              <Typography variant="body2">Active Carriers</Typography>
              <Typography variant="h4" fontWeight="600" color="#16a34a">
                4
              </Typography>
            </Box>

            <Box className="icon-box icon-green">
              <Inventory2Icon sx={{ color: "#16a34a" }} />
            </Box>
          </CardContent>
        </Card>


        <Card className="stats-card">
          <CardContent className="stats-content">
            <Box>
              <Typography variant="body2">Active Deliveries</Typography>
              <Typography variant="h4" fontWeight="600" color="#f97316">
                41
              </Typography>
            </Box>

            <Box className="icon-box icon-orange">
              <LocalShippingIcon sx={{ color: "#f97316" }} />
            </Box>
          </CardContent>
        </Card>

      </Box>


      {/* Filter Buttons */}
      <Box className="filter-box">

        <Typography fontWeight={500}>Filter:</Typography>

        <Button
          variant="contained"
          className="filter-active"
        >
          All Carriers
        </Button>

        <Button
          variant="outlined"
          className="filter-outline"
        >
          Active
        </Button>

        <Button
          variant="outlined"
          className="filter-outline"
        >
          Inactive
        </Button>

      </Box>


      {/* Carrier Cards */}
      <Box className="carrier-grid">

        {carrierCards.map((card) => (

          <Card key={card.id} className="carrier-card">

            <CardContent>

              {/* Top Section */}
              <Box className="card-top">

                <Box className="card-left">

                  <Box className="icon-bg">
                    <LocalShippingIcon sx={{ color: "#0f9d8a" }} />
                  </Box>

                  <Box>
                    <Typography className="card-title">
                      {card.title}
                    </Typography>

                    <Box className="status-row">
                      <Box className="status-active">● Active</Box>
                      <Box className="rating">⭐ {card.rating}</Box>
                    </Box>

                  </Box>
                </Box>

                <Box className="active-count">
                  <Typography className="active-number">
                    {card.active}
                  </Typography>
                  <Typography variant="body2">
                    Active
                  </Typography>
                </Box>

              </Box>


              {/* Stats Section */}
              <Box className="inner-stats">

                <Box className="stat-box stat-total">
                  <Typography variant="body2">Total</Typography>
                  <Typography fontWeight={600}>
                    {card.total}
                  </Typography>
                </Box>

                <Box className="stat-box stat-vehicles">
                  <Typography variant="body2">Vehicles</Typography>
                  <Typography fontWeight={600}>
                    {card.vehicles}
                  </Typography>
                </Box>

                <Box className="stat-box stat-transit">
                  <Typography variant="body2">In Transit</Typography>
                  <Typography fontWeight={600}>
                    {card.transit}
                  </Typography>
                </Box>

              </Box>


              {/* Contact Info */}
              <Box className="contact">

                <Box className="contact-row">
                  <PhoneIcon fontSize="small" />
                  <Typography variant="body2">
                    {card.phone}
                  </Typography>
                </Box>

                <Box className="contact-row">
                  <EmailIcon fontSize="small" />
                  <Typography variant="body2">
                    {card.email}
                  </Typography>
                </Box>

                <Box className="contact-row">
                  <LocationOnIcon fontSize="small" />
                  <Typography variant="body2">
                    {card.location}
                  </Typography>
                </Box>

              </Box>


              {/* Buttons */}
              <Box className="card-buttons">

                <Button
                  fullWidth
                  variant="contained"
                  className="view-btn"
                >
                  View Details
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  className="assign-btn"
                >
                  Assign Task
                </Button>

              </Box>

            </CardContent>

          </Card>

        ))}

      </Box>

    </Box>
  );
};

export default Cart;
