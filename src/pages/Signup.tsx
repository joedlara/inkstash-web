import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase/supabaseClient"
import type { Session } from "@supabase/supabase-js"
import { FcGoogle } from "react-icons/fc"
import { IoEye, IoEyeOff } from "react-icons/io5"
import "../styles/Signup.css"

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [emailError, setEmailError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [formError, setFormError] = useState<React.ReactNode | null>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const emailRegex = /^\S+@\S+\.\S+$/

  const validateEmail = () => {
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email")
      return false
    }
    setEmailError(null)
    return true
  }

  const validateUsername = async () => {
    if (!username) {
      setUsernameError("Username is required")
      return false
    }
    const { data, error } = await supabase
      .from("users")
      .select("username", { count: "exact" })
      .eq("username", username.toLowerCase())
    if (error || data!.length > 0) {
      setUsernameError(error ? "Error checking username" : "Username taken")
      return false
    }
    setUsernameError(null)
    return true
  }

  const validatePassword = () => {
    if (password.length < 6) {
      setPasswordError("Must be at least 6 characters")
      return false
    }
    setPasswordError(null)
    return true
  }

  const validateConfirm = () => {
    if (confirmPassword !== password) {
      setConfirmError("Passwords do not match")
      return false
    }
    setConfirmError(null)
    return true
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // 1) run your existing validations...
    const okEmail = validateEmail()
    const okUser = await validateUsername()
    const okPass = validatePassword()
    const okConf = validateConfirm()
    if (!(okEmail && okUser && okPass && okConf)) {
      return setFormError("Please fix the errors above")
    }

    setLoading(true)

    // 2) Kick off signUp with v2 signature (metadata  emailRedirectTo)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
        options: {
          data: { username: username.toLowerCase() },
          emailRedirectTo: `${window.location.origin}/email-confirmation`,
        },
      }
    )

    setLoading(false)

    // 3) Handle errors (including duplicate-email)
    if (signUpError) {
      if (
        signUpError.status === 400 &&
        signUpError.message.toLowerCase().includes("already registered")
      ) {
        return setFormError(
          <>
            An account with this email already exists.{" "}
            <a href="/login">Log in</a> instead.
          </>
        )
      }
      return setFormError(signUpError.message)
    }

    // 4) On success, write into your users table so you have a second record
    if (signUpData.user) {
      const { id, email: newEmail } = signUpData.user
      const { error: dbError } = await supabase
        .from("users")
        .upsert(
          { id, email: newEmail, username: username.toLowerCase() },
          { onConflict: "id" }
        )
      if (dbError) {
        console.error("Error writing user to DB:", dbError)
      }
    }

    // 5) Finally, send them to the “check your email” page
    navigate("/email-confirmation")
  }

  const handleGoogleSignup = async () => {
    setFormError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/create-username` },
    })
    setLoading(false)
    if (error) setFormError(error.message)
  }

  return (
    <div className="signup-page">
      {/* thin red bar under the navbar */}
      <div className="signup-top-bar" />

      {/* center card */}
      <div className="signup-container">
        <div className="signup-card">
          <h1>Create an account to continue</h1>

          <button
            className="google-button"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <FcGoogle size={20} style={{ marginRight: 8 }} />
            Sign up with Google
          </button>

          <div className="divider">
            <span>Or</span>
          </div>

          <form className="signup-form" onSubmit={handleEmailSignup}>
            {/* Email */}
            <div className="field-group">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validateEmail}
                className={`input-field ${emailError ? "invalid" : ""}`}
              />
              {emailError && (
                <small className="field-error">{emailError}</small>
              )}
            </div>

            {/* Username */}
            <div className="field-group">
              <input
                type="text"
                placeholder="Your username – numbers & letters only"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))
                }
                onBlur={validateUsername}
                className={`input-field ${usernameError ? "invalid" : ""}`}
              />
              {usernameError && (
                <small className="field-error">{usernameError}</small>
              )}
            </div>

            {/* Password */}
            <div className="field-group password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password (6 characters minimum)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={validatePassword}
                className={`input-field ${passwordError ? "invalid" : ""}`}
              />
              <button
                type="button"
                className="toggle-button"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <IoEye size={20} /> : <IoEyeOff size={20} />}
              </button>
              {passwordError && (
                <small className="field-error">{passwordError}</small>
              )}
            </div>

            {/* Confirm */}
            <div className="field-group password-wrapper">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={validateConfirm}
                className={`input-field ${confirmError ? "invalid" : ""}`}
              />
              <button
                type="button"
                className="toggle-button"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <IoEye size={20} /> : <IoEyeOff size={20} />}
              </button>
              {confirmError && (
                <small className="field-error">{confirmError}</small>
              )}
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Signing up…" : "Sign Up"}
            </button>
          </form>

          <p className="terms">
            By signing up, you agree to the <a href="/tos">Terms of Service</a>{" "}
            and <a href="/privacy">Privacy Policy</a>.
          </p>
          <p className="have-account">
            Already have an account? <a href="/login">Log in</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
