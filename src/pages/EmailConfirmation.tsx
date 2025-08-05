import { Link, useNavigate } from "react-router-dom"
import "../styles/EmailConfirmation.css"
import { useEffect } from "react"
import { supabase } from "../api/supabase/supabaseClient"

const EmailConfirmation: React.FC = () => {
  const navigate = useNavigate()
  useEffect(() => {
    // if Supabase finds the session in the URL hash, this will fire
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          // user just confirmed their email & is signed in
          navigate("/")
        }
      }
    )
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [navigate])
  return (
    <div className="email-confirmation-page">
      <div className="email-confirmation-top-bar" />
      <div className="email-confirmation-container">
        <div className="email-confirmation-card">
          <h1>Thank you for signing up!</h1>
          <p>We’ve sent a confirmation email to your address.</p>
          <p>
            Please check your inbox (and spam folder) and click the link to
            activate your account.
          </p>
          <p>
            Already confirmed?{" "}
            <Link to="/login" className="email-link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmailConfirmation
