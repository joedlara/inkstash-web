import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase/supabaseClient';
import '../styles/signup/createUsername.css';

const CreateUsername: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ensure we actually have a session
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        return navigate('/signup');
      }
      // if they already have a profile, skip to home
      const { data: existing, error: fetchError } = await supabase
        .from('users')
        .select('username')
        .eq('id', session.user.id)
        .single();
      if (existing && !fetchError) {
        return navigate('/');
      }
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return navigate('/signup');

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return setError('Letters & numbers only');
    }

    setLoading(true);
    const { error: dbError } = await supabase.from('users').upsert({
      id: session.user.id,
      email: session.user.email,
      username: username.toLowerCase(),
    });
    setLoading(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="create-username-page">
      {/* thin red bar */}
      <div className="create-username-top-bar" />

      {/* centered card */}
      <div className="create-username-container">
        <div className="create-username-card">
          <h1>Almost there…</h1>
          <p>Pick a username to finish your setup:</p>

          <form className="create-username-form" onSubmit={onSubmit}>
            <div className="field-group">
              <input
                type="text"
                className={`input-field ${error ? 'invalid' : ''}`}
                placeholder="Username – letters & numbers only"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              {error && <small className="field-error">{error}</small>}
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUsername;
