import React from "react";
import "./sidebar.css";
import { NavLink } from "react-router-dom";

// Material UI icons
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import LocationSearchingIcon from "@mui/icons-material/LocationSearching";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";

import { ROUTES } from "../constant/routes";

const Sidebar = ({ isOpen }) => {
  return (
    <div className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
      <div className="sidebar-content">

        {/* TOP MENU */}
        <ul className="menu-top">
          <li>
            <NavLink
              to={ROUTES.HOME}
              end
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <DashboardIcon className="icon" />
              <span className="link-text">Dashboard</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to={ROUTES.HOME_MATERIALS}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Inventory2OutlinedIcon className="icon" />
              <span className="link-text">Materials</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to={ROUTES.HOME_LOCATION}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <PlaceOutlinedIcon className="icon" />
              <span className="link-text">Location</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to={ROUTES.HOME_TRACKING}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <LocationSearchingIcon className="icon" />
              <span className="link-text">Tracking</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to={ROUTES.HOME_ANALYTICS}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <AnalyticsOutlinedIcon className="icon" />
              <span className="link-text">Analytics</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to={ROUTES.HOME_RECIPE_MIX}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <LocalShippingOutlinedIcon className="icon" />
              <span className="link-text">Recipe Mix</span>
            </NavLink>
          </li>
        </ul>

        {/* BOTTOM MENU */}
        <ul className="menu-bottom">
          <li>
            <NavLink
              to={ROUTES.SETTINGS}
              end
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <SettingsIcon className="icon" />
              <span className="link-text">Settings</span>
            </NavLink>
          </li>
        </ul>

      </div>
    </div>
  );
};

export default Sidebar;