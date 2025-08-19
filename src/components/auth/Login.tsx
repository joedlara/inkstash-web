import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../api/supabase/supabaseClient';
import { FcGoogle } from 'react-icons/fc';
import { IoEye, IoEyeOff } from 'react-icons/io5';
import '../../styles/auth/login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const validateInput = () => {
    if (!emailOrUsername.trim()) {
      setError('Email or username is required');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    setError(null);
    return true;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateInput()) return;

    setLoading(true);
    setError(null);

    try {
      // Check if input is email or username
      const isEmail = emailOrUsername.includes('@');
      let email = emailOrUsername;

      // If it's a username, we need to get the email from the users table
      if (!isEmail) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', emailOrUsername.toLowerCase())
          .single();

        if (userError || !userData) {
          setError('Username not found');
          setLoading(false);
          return;
        }
        email = userData.email;
      }

      // Sign in with email
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email/username or password');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard
      if (data.session) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-top-bar" />

      <div className="login-container">
        <div className="login-card">
          <h1>Welcome back</h1>
          <p>Sign in to your InkStash account</p>

          <button
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <FcGoogle size={20} style={{ marginRight: 8 }} />
            Sign in with Google
          </button>

          <div className="divider">
            <span>Or</span>
          </div>

          <form className="login-form" onSubmit={handleEmailLogin}>
            <div className="field-group">
              <input
                type="text"
                placeholder="Email address or username"
                value={emailOrUsername}
                onChange={e => setEmailOrUsername(e.target.value)}
                className={`input-field ${error && !password ? 'invalid' : ''}`}
                autoComplete="username"
              />
            </div>

            <div className="field-group password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`input-field ${error && password ? 'invalid' : ''}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IoEye size={20} /> : <IoEyeOff size={20} />}
              </button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <Link to="/forgot-password" className="forgot-link">
              Forgot your password?
            </Link>

            <p className="signup-prompt">
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
