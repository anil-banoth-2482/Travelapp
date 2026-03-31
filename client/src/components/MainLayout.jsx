import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  };
  const NAV_HEIGHT = 72; // px — adjust if your Navbar has a different height

  const layoutStyle = isMobile ? {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
    width: '100%',
    margin: '0 auto',
    padding: '1rem',
    height: `calc(100vh - ${NAV_HEIGHT}px)`,
    overflowY: 'auto',
  } : {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '2rem',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    padding: '2rem',
    height: `calc(100vh - ${NAV_HEIGHT}px)`,
    overflowY: 'auto',
  };

  return (
    <div style={containerStyle}>
      <Navbar />
      <div style={layoutStyle}>
        {!isMobile && <Sidebar />}
        {/* Dynamic content will be injected where <Outlet /> is */}
        <Outlet />
      </div>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default MainLayout;
