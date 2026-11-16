import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/navbar/navbar';
import Sidebar from '../../components/sidebar/sidebar';
import './home.css';

const Home = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
  <div className="home-layout">
    {/* Fixed Navbar */}
    <div className="home-navbar">
      <Navbar onToggleSidebar={handleToggleSidebar} />
    </div>

    <div className="home-main">
      {/* Fixed Sidebar */}
      <div className={`home-sidebar ${isSidebarOpen ? "" : "collapsed"}`}>
        <Sidebar isOpen={isSidebarOpen} />
      </div>

      {/* Main Content */}
      <div className="home-content">
        <Outlet /> {/* Child pages render here */}
      </div>
    </div>
  </div>
);

};

export default Home;
