import React, { useState } from 'react';

const RightPanel = () => {
  const [hoveredFollow, setHoveredFollow] = useState(null);

  const trends = [
    { topic: '#Diwali2026', posts: '1.2M posts' },
    { topic: '#IndianCinema', posts: '850K posts' },
    { topic: '#CricketLive', posts: '2.4M posts' },
    { topic: '#YogaDay', posts: '450K posts' },
  ];

  const suggestions = [
    { name: 'Aditi Rao', role: 'Digital Artist', avatar: 'https://i.pravatar.cc/150?img=5' },
    { name: 'Vikram Singh', role: 'Photographer', avatar: 'https://i.pravatar.cc/150?img=8' },
    { name: 'Neha Gupta', role: 'Travel Blogger', avatar: 'https://i.pravatar.cc/150?img=9' },
  ];

  const glassStyle = {
    background: 'var(--glass-bg, rgba(15, 23, 42, 0.4))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))',
    boxShadow: 'var(--glass-shadow, 0 8px 32px 0 rgba(0, 0, 0, 0.37))',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  };

  const panelStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
    paddingRight: '8px',
  };

  const titleStyle = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '0.8rem',
  };

  const listStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  };

  const getFollowBtnStyle = (index) => ({
    marginLeft: 'auto',
    background: hoveredFollow === index ? 'var(--saffron, #f97316)' : 'transparent',
    border: '1px solid var(--saffron, #f97316)',
    color: hoveredFollow === index ? 'white' : 'var(--saffron, #f97316)',
    padding: '0.4rem 1rem',
    borderRadius: '15px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <aside style={panelStyle} className="animate-up">
      
      {/* Trending Box */}
      <div style={glassStyle}>
        <h3 style={titleStyle}>Trending in India 📈</h3>
        <div style={listStyle}>
          {trends.map((trend, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{trend.topic}</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{trend.posts}</span>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}>⋮</button>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Connections Box */}
      <div style={{ ...glassStyle, marginTop: '1.5rem' }}>
        <h3 style={titleStyle}>Suggested Connections 🤝</h3>
        <div style={listStyle}>
          {suggestions.map((user, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img 
                src={user.avatar} 
                alt={user.name} 
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--saffron)' }} 
              />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{user.name}</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.role}</span>
              </div>
              <button 
                style={getFollowBtnStyle(index)}
                onMouseEnter={() => setHoveredFollow(index)}
                onMouseLeave={() => setHoveredFollow(null)}
              >
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
      
    </aside>
  );
};

export default RightPanel;
