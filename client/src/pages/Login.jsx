import React, { useState, useEffect } from 'react';
import cultureImgLocal from '../assets/Gemini_Generated_Image_ekus7aekus7aekus.png';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const authSharedStyles = {
  pageWrapper: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
  },
  leftColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem',
    background: 'rgba(10, 15, 28, 0.8)', 
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  },
  rightColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
  },
  splashImg: {
    maxWidth: '100%',
    maxHeight: '600px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
    animation: 'slideInUp 1s ease-out forwards',
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.6rem',
    width: '100%',
    maxWidth: '520px',
  },
  galleryImg: {
    width: '100%',
    height: '140px',
    objectFit: 'cover',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
  },
  cultureImg: {
    width: '420px',
    height: '420px',
    objectFit: 'cover',
    borderRadius: '18px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
  },
  leftSqueezed: {
    flex: '0 0 110px',
    padding: '1rem',
    justifyContent: 'center',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headline: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginTop: '2rem',
    textAlign: 'center',
    lineHeight: 1.2,
    color: 'var(--text-primary)',
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    padding: '3rem 2.5rem',
    borderRadius: '24px',
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    textAlign: 'center',
  },
  headerP: {
    color: 'var(--text-secondary, #94a3b8)',
    marginTop: '0.5rem',
    fontSize: '0.95rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  footer: {
    textAlign: 'center',
    marginTop: '2rem',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  }
};

const Login = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const { updateFeedPreferences } = useLanguage();
  const [btnHover, setBtnHover] = useState(false);
  const [createHover, setCreateHover] = useState(false);
  const [inputsHover, setInputsHover] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSqueezed, setIsSqueezed] = useState(window.innerWidth <= 520);

  // Dynamic window resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsSqueezed(window.innerWidth <= 520);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();

    // Read form values
    const form = e.target;
    const fd = new FormData(form);
    const identifier = fd.get('identifier') || fd.get('email') || '';
    const password = fd.get('password') || '';

    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const match = users.find(u => (u.email === identifier || u.profileName === identifier) && u.password === password);
      if (match) {
        const userJson = JSON.stringify(match);
        sessionStorage.setItem('currentUser', userJson);
        localStorage.setItem('currentUser', userJson);
        window.dispatchEvent(new Event('authchange'));
        
        // Reset language setup if it's a new session or different user
        updateFeedPreferences({ isInitialSetupDone: false });
        
        if(setIsAuthenticated) setIsAuthenticated(true);
        navigate('/home');
        return;
      }
      alert('Invalid credentials. Please check your email/username and password.');
    } catch (err) {
      console.error('Login error', err);
      alert('Login failed due to an error. See console.');
    }
  };

  

  const getInputStyle = (id) => ({
    padding: '0.8rem 1.2rem',
    borderRadius: '8px',
    border: inputsHover[id] ? '1px solid var(--saffron)' : '1px solid rgba(255, 255, 255, 0.1)',
    background: inputsHover[id] ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
    boxShadow: inputsHover[id] ? '0 0 10px rgba(249, 115, 22, 0.2)' : 'none',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    fontFamily: 'inherit',
    transition: 'all 0.3s',
    outline: 'none',
  });

  const getBtnStyle = () => ({
    background: 'linear-gradient(135deg, var(--saffron), var(--gold))',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '16px',
    fontSize: '1.05rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: btnHover ? '0 8px 25px rgba(249, 115, 22, 0.5)' : 'none',
    transform: btnHover ? 'translateY(-2px)' : 'none',
  });

  const getOutlineBtnStyle = (isHovered) => ({
    background: 'transparent',
    color: isHovered ? 'var(--saffron)' : 'var(--text-primary)',
    border: isHovered ? '1px solid var(--saffron)' : '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem',
    borderRadius: '16px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.8rem',
    textDecoration: 'none',
    width: '100%',
    boxSizing: 'border-box'
  });

  return (
    <div style={{ ...authSharedStyles.pageWrapper, flexDirection: isMobile ? 'column' : 'row' }}>
      
      {/* Left Column Graphic Area - Hide on Mobile */}
      {(!isMobile || window.innerHeight > 800) && !isSqueezed && ( // Also hide if vertical space is very tight or squeezed
        <div style={authSharedStyles.leftColumn}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', width: '100%' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
              <img
                src={cultureImgLocal}
                alt="culture"
                style={authSharedStyles.cultureImg}
              />
            </div>

            <h2 style={authSharedStyles.headline}>
              Discover beautiful moments <br/> from your <span style={{ color: 'var(--saffron)' }}>close friends</span>.
            </h2>
          </div>
        </div>
      )}

      {/* Right Column Auth Form */}
      <div style={authSharedStyles.rightColumn}>
        
        {/* Mobile Top Icon */}
        {isMobile && (
            <img 
              src="/src/assets/logo.png" 
              alt="App Logo" 
              style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '2rem', animation: 'slideInUp 0.6s ease-out forwards' }} 
            />
          )}

        <div style={authSharedStyles.card} className="animate-up">
          <div style={authSharedStyles.header}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
              Travel<span style={{ color: 'var(--saffron)' }}>India</span>
            </h1>
            <p style={authSharedStyles.headerP}>Log into TravelIndia</p>
          </div>

          <form onSubmit={handleLogin} style={authSharedStyles.form}>
            <div style={authSharedStyles.inputGroup}>
              <input 
                type="text" 
                name="identifier"
                placeholder="Profile name or email" 
                required 
                style={getInputStyle('identifier')}
                onFocus={() => setInputsHover({...inputsHover, identifier: true})}
                onBlur={() => setInputsHover({...inputsHover, identifier: false})}
              />
            </div>
            
            <div style={authSharedStyles.inputGroup}>
              <input 
                type="password" 
                name="password"
                placeholder="Password" 
                required 
                style={getInputStyle('pass')}
                onFocus={() => setInputsHover({...inputsHover, pass: true})}
                onBlur={() => setInputsHover({...inputsHover, pass: false})}
              />
            </div>

            <button 
              type="submit" 
              style={getBtnStyle()}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
            >
              Log in
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>Forgot password?</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {/* Create New Account Button */}
            <Link 
              to="/register" 
              style={getOutlineBtnStyle(createHover)}
              onMouseEnter={() => setCreateHover(true)}
              onMouseLeave={() => setCreateHover(false)}
            >
              New to TravelIndia? Sign up
            </Link>
          </div>

          
        </div>
      </div>

    </div>
  );
};

export default Login;
