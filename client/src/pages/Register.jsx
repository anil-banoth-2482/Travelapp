import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authSharedStyles } from './Login';
import cultureImgLocal from '../assets/Gemini_Generated_Image_ekus7aekus7aekus.png';
import { useLanguage } from '../context/LanguageContext';

const Register = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const { updateFeedPreferences } = useLanguage();
  const [btnHover, setBtnHover] = useState(false);
  const [loginHover, setLoginHover] = useState(false);
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

  const handleRegister = (e) => {
    e.preventDefault();

    // Collect form data and store locally (clientside for now)
    const form = e.target;
    const fd = new FormData(form);
    const user = {
      firstName: fd.get('firstName') || '',
      lastName: fd.get('lastName') || '',
      profileName: fd.get('profileName') || '',
      email: fd.get('email') || '',
      password: fd.get('password') || '',
      nativeLanguage: fd.get('nativeLanguage') || '',
      state: fd.get('state') || ''
    };

    // Save into localStorage as an array of users and set current user
    try {
      const existing = localStorage.getItem('users');
      const users = existing ? JSON.parse(existing) : [];
      users.push(user);
      localStorage.setItem('users', JSON.stringify(users));
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      window.dispatchEvent(new Event('authchange'));
      
      // Reset language setup for the new user
      updateFeedPreferences({ isInitialSetupDone: false });
    } catch (err) {
      console.error('Failed to save user locally', err);
    }

    if (setIsAuthenticated) setIsAuthenticated(true);
    navigate('/home');
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
    width: '100%',
    boxSizing: 'border-box'
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
    marginTop: '0.5rem',
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
      
      {/* Left Column Graphic Area - Hide on Mobile or when squeezed */}
      {(!isMobile || window.innerHeight > 800) && !isSqueezed && (
        <div style={authSharedStyles.leftColumn}>
          <img src={cultureImgLocal} alt="Social Culture" style={authSharedStyles.cultureImg} />
          <h2 style={authSharedStyles.headline}>
            Discover beautiful moments <br/> from your <span style={{ color: 'var(--saffron)' }}>close friends</span>.
          </h2>
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
              Join Travel<span style={{ color: 'var(--saffron)' }}>India</span>
            </h1>
            <p style={authSharedStyles.headerP}>Sign up to see photos and videos from your friends.</p>
          </div>

          <form onSubmit={handleRegister} style={authSharedStyles.form}>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                name="firstName"
                placeholder="First Name" 
                required 
                style={{ ...getInputStyle('first'), flex: 1 }}
                onFocus={() => setInputsHover({...inputsHover, first: true})}
                onBlur={() => setInputsHover({...inputsHover, first: false})}
              />
              <input 
                type="text" 
                name="lastName"
                placeholder="Last Name" 
                required 
                style={{ ...getInputStyle('last'), flex: 1 }}
                onFocus={() => setInputsHover({...inputsHover, last: true})}
                onBlur={() => setInputsHover({...inputsHover, last: false})}
              />
            </div>

            <div style={{ marginTop: '0.6rem' }}>
              <input
                type="text"
                name="profileName"
                placeholder="Profile name (unique)"
                required
                style={getInputStyle('profile')}
                onFocus={() => setInputsHover({...inputsHover, profile: true})}
                onBlur={() => setInputsHover({...inputsHover, profile: false})}
              />
            </div>
            
            <div style={authSharedStyles.inputGroup}>
              <input 
                type="email" 
                name="email"
                placeholder="Email"
                required 
                style={getInputStyle('email')}
                onFocus={() => setInputsHover({...inputsHover, email: true})}
                onBlur={() => setInputsHover({...inputsHover, email: false})}
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

            {/* New fields: native language and Indian state */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <select
                required
                name="nativeLanguage"
                style={{ ...getInputStyle('language'), flex: 1 }}
                onFocus={() => setInputsHover({...inputsHover, language: true})}
                onBlur={() => setInputsHover({...inputsHover, language: false})}
              >
                <option value="">Native language (select)</option>
                <option>Hindi</option>
                <option>Bengali</option>
                <option>Telugu</option>
                <option>Marathi</option>
                <option>Tamil</option>
                <option>Urdu</option>
                <option>Gujarati</option>
                <option>Kannada</option>
                <option>Malayalam</option>
                <option>Punjabi</option>
                <option>Odia</option>
                <option>Assamese</option>
                <option>Other</option>
              </select>

              <select
                required
                name="state"
                style={{ ...getInputStyle('state'), flex: 1 }}
                onFocus={() => setInputsHover({...inputsHover, state: true})}
                onBlur={() => setInputsHover({...inputsHover, state: false})}
              >
                <option value="">State (select)</option>
                <option>Andhra Pradesh</option>
                <option>Arunachal Pradesh</option>
                <option>Assam</option>
                <option>Bihar</option>
                <option>Chhattisgarh</option>
                <option>Goa</option>
                <option>Gujarat</option>
                <option>Haryana</option>
                <option>Himachal Pradesh</option>
                <option>Jharkhand</option>
                <option>Karnataka</option>
                <option>Kerala</option>
                <option>Madhya Pradesh</option>
                <option>Maharashtra</option>
                <option>Manipur</option>
                <option>Meghalaya</option>
                <option>Mizoram</option>
                <option>Nagaland</option>
                <option>Odisha</option>
                <option>Punjab</option>
                <option>Rajasthan</option>
                <option>Sikkim</option>
                <option>Tamil Nadu</option>
                <option>Telangana</option>
                <option>Tripura</option>
                <option>Uttar Pradesh</option>
                <option>Uttarakhand</option>
                <option>West Bengal</option>
                <option>Delhi</option>
                <option>Puducherry</option>
              </select>
            </div>

            <button 
              type="submit" 
              style={getBtnStyle()}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
            >
              Sign up
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
              OR
            </div>
            

            {/* Switch to Login Button */}
            <Link 
              to="/login" 
              style={getOutlineBtnStyle(loginHover)}
              onMouseEnter={() => setLoginHover(true)}
              onMouseLeave={() => setLoginHover(false)}
            >
              Have an account? Log in
            </Link>
          </div>

          
        </div>
      </div>
      
    </div>
  );
};

export default Register;
