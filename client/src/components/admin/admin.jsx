import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import MaterialForm from './materialForm';
import LocationForm from './locationForm';
import MovementForm from './movementForm';
import ProcessForm from './processForm';
import './admin.css';

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState(0);

  const handleChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Tabs
        value={activeTab}
        onChange={handleChange}
        variant="fullWidth"
        TabIndicatorProps={{
          style: {
            backgroundColor: '#009688',   // teal indicator
            height: '4px',
            borderRadius: '4px',
          },
        }}
        sx={{
          background: '#E0F2F1',          // mint background
          borderRadius: '12px',
          mb: 2,
          '& .MuiTab-root': {
            fontWeight: 600,
            color: '#005e4eff',
            textTransform: 'none',
            fontSize: '16px',
            padding: '12px 16px',
          },
          '& .Mui-selected': {
            color: '#009688 !important', // highlight selected tab
          },
          '& .MuiTabs-flexContainer': {
            borderRadius: '12px',
          },
        }}
      >
        <Tab label="Material Details" />
        <Tab label="Location Details" />
        <Tab label="Material Movements" />
        {/* <Tab label="Process Definitions" /> */}
      </Tabs>

      {/* TAB PANELS */}
      <TabPanel value={activeTab} index={0}>
        <MaterialForm />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <LocationForm />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <MovementForm />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <ProcessForm />
      </TabPanel>
    </Box>
  );
}

function TabPanel({ value, index, children }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ mt: 2 }}>{children}</Box>}
    </div>
  );
}
