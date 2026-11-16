import React, { useState } from "react";
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import Tooltip from '@mui/material/Tooltip';
import './navbar.css';
import { Link, useNavigate } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import UnileverLogo from "../../Assests/images/unilever-logo.jpg";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";


const Navbar = ({ onToggleSidebar }) => {

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOptionClick = (option) => {
    handleClose();
    if (option === "Admin") {
      navigate("admin");
    } else if (option === "Signout") {
      // Add your signout logic here
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      navigate("/login");
    }
  };
  return (
<nav className="navbar">
  <div className="navbar-left">
    {/* <button className="menu-btn" onClick={onToggleSidebar}>☰</button> */}
       <div
      className="navbar-title"
      onClick={() => navigate("/home")}
      style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
    >
      Track & Trace
    </div>
  </div>

  <div className="navbar-center">
 
  </div>

<div className="navbar-right">
  <div className="date-box">
    <CalendarTodayIcon className="calendar-icon" />
    {new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })}
  </div>

  <button className="admin-btn" onClick={handleClick}>
    <AccountBoxIcon sx={{ fontSize: 18 }} />
    
  </button>

  <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
    {/* <MenuItem onClick={() => handleOptionClick("Admin")}>Admin</MenuItem> */}
    <MenuItem onClick={() => handleOptionClick("Signout")}>Signout</MenuItem>
  </Menu>
</div>


</nav>

  );
};

export default Navbar;
