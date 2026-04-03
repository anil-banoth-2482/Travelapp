import React, { useState, useEffect } from 'react';
import cultureImgLocal from '../assets/Gemini_Generated_Image_ekus7aekus7aekus.png';
import logoImg from '../assets/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch, setAuthToken } from '../utils/api';
import { useAuth } from '../context/AuthContext';

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

const Login = () => {
  const navigate = useNavigate();
  const { updateFeedPreferences } = useLanguage();
  const { setUser } = useAuth();
  const [btnHover, setBtnHover] = useState(false);
  const [createHover, setCreateHover] = useState(false);
  const [inputsHover, setInputsHover] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSqueezed, setIsSqueezed] = useState(window.innerWidth <= 520);
  const [error, setError] = useState(null); // { type: 'no_account' | 'wrong_password' | 'error', msg: string }
  const [loading, setLoading] = useState(false);

  // Dynamic window resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsSqueezed(window.innerWidth <= 520);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.target;
    const fd = new FormData(form);
    const identifier = (fd.get('identifier') || fd.get('email') || '').trim();
    const password = fd.get('password') || '';

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: identifier, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err.error || '').toLowerCase();
        // 401 with 'invalid credentials' covers both no-account and wrong-password
        // We treat it as "no account" when the user hasn't registered yet
        // The backend returns the same message for security, so we guide them gently
        setError({ type: 'no_account', msg: null });
        return;
      }

      const data = await res.json();
      // The new backend sends `accessToken`, legacy sends `token`
      const token = data.accessToken || data.token;
      if (token) setAuthToken(token);
      setUser(data.user || null);
      updateFeedPreferences({ isInitialSetupDone: false });
      navigate('/home');
    } catch (err) {
      console.error('Login error', err);
      setError({ type: 'error', msg: 'Could not reach the server. Please try again.' });
    } finally {
      setLoading(false);
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
              src={logoImg}
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
                placeholder="Email or username" 
                required 
                style={getInputStyle('identifier')}
                onFocus={() => { setInputsHover({...inputsHover, identifier: true}); setError(null); }}
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
                onFocus={() => { setInputsHover({...inputsHover, pass: true}); setError(null); }}
                onBlur={() => setInputsHover({...inputsHover, pass: false})}
              />
            </div>

            {/* ── In-page error banner ── */}
            {error && (
              <div style={{
                background: error.type === 'no_account'
                  ? 'rgba(249,115,22,0.1)'
                  : 'rgba(239,68,68,0.1)',
                border: `1px solid ${error.type === 'no_account' ? 'rgba(249,115,22,0.4)' : 'rgba(239,68,68,0.4)'}`,
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}>
                {error.type === 'no_account' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--saffron, #f97316)', fontSize: '0.92rem' }}>
                      <span>⚠️</span> No account found with these credentials
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Haven't joined yet?{' '}
                      <Link to="/register" style={{ color: 'var(--saffron, #f97316)', fontWeight: 600, textDecoration: 'none' }}>
                        Create a free account →
                      </Link>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#ef4444', fontSize: '0.92rem' }}>
                    <span>❌</span> {error.msg || 'Something went wrong. Try again.'}
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              style={{ ...getBtnStyle(), opacity: loading ? 0.7 : 1 }}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
            >
              {loading ? 'Signing in…' : 'Log in'}
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
