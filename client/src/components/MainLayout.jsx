import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const NAV_HEIGHT = 72; // px
const BOTTOM_NAV_HEIGHT = 64; // px (mobile bottom nav)

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Messages page needs a rigid, non-scrolling outlet so its own flex layout works
  const isMessagesPage = location.pathname === '/messages';

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  };

  // BottomNav is position:fixed — doesn't consume layout space.
  // But we still need to account for it in content height / padding:
  //   - Messages page: rigid height so its flex layout manages scroll internally
  //   - Other pages: normal scroll + paddingBottom so content isn't under the fixed nav
  const chatOpen = isMessagesPage && new URLSearchParams(location.search).get('chat');
  const mobileHeight = chatOpen
    ? `calc(100vh - ${NAV_HEIGHT}px)` // full height when BottomNav is hidden
    : `calc(100vh - ${NAV_HEIGHT}px)`; // same — BottomNav is fixed, padding handles the rest

  const layoutStyle = isMobile ? {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    margin: '0 auto',
    padding: isMessagesPage ? 0 : '0.75rem',
    height: mobileHeight,
    overflow: isMessagesPage ? 'hidden' : 'auto',
    overflowX: 'hidden',
    // Extra bottom space on non-messages pages so content clears the fixed BottomNav
    paddingBottom: isMessagesPage ? 0 : `${BOTTOM_NAV_HEIGHT + 12}px`,
    flex: 1,
    minHeight: 0,
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
        <Outlet />
      </div>
      {isMobile && <BottomNav />}
    </div>
  );
};

export default MainLayout;
