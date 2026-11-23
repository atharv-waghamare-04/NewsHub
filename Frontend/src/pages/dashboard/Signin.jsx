import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router";
import "./Signin.css";
import Navbar from "../../components/dashboard/Navbar";
import { apiRequest } from "../../lib/api";

const emptyCredentials = {
  email: "",
  password: "",
  confirm_password: "",
  otp: "",
};

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
    <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EyeIcon = ({ visible }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    {!visible && <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
  </svg>
);

const Field = ({ label, id, type = "text", value, onChange, placeholder, autoComplete, minLength, maxLength, inputMode, visible, onToggle }) => (
  <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap">
      <input
        id={id}
        name={id}
        type={type === "password" && visible ? "text" : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        maxLength={maxLength}
        inputMode={inputMode}
      />
      {type === "password" && (
        <button className="auth-visibility" type="button" onClick={onToggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
          <EyeIcon visible={visible} />
        </button>
      )}
    </div>
  </div>
);

const Signin = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState(emptyCredentials);
  const [mode, setMode] = useState("login");
  const [resetStep, setResetStep] = useState("email");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("token")) navigate("/dashboard");
  }, [navigate]);

  const handleChange = (event) => {
    setCredentials((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const changeMode = (nextMode) => {
    setMode(nextMode === "forget" ? "forget" : "login");
    setPasswordVisible(false);
  };

  const request = (endpoint, body) =>
    apiRequest(`/api/admin/${endpoint}`, { method: "POST", body });

  const submit = async (event, action) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      await action();
    } catch (cause) {
      toast.error(cause.message || "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const login = (event) => submit(event, async () => {
    const result = await request("login-admin", {
      email: credentials.email,
      password: credentials.password,
    });
    if (!result.success) return toast.error(result.message || "Unable to sign in.");
    sessionStorage.setItem("token", result.token);
    toast.success("Welcome back!");
    setCredentials(emptyCredentials);
    navigate("/dashboard");
  });

  const sendOtp = (event) => submit(event, async () => {
    const result = await request("generate-otp-for-admin", { email: credentials.email });
    if (!result.success) return toast.error(result.message || "Could not send the code.");
    toast.success("Verification code sent to your email.");
    setResetStep("details");
  });

  const resetPassword = (event) => submit(event, async () => {
    const passwordBytes = new TextEncoder().encode(credentials.password).length;
    if (passwordBytes < 12 || passwordBytes > 72) {
      toast.error("Use a password between 12 and 72 UTF-8 bytes.");
      return;
    }
    if (credentials.password !== credentials.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }
    const result = await request("forget-password", {
      email: credentials.email,
      password: credentials.password,
      confirm_password: credentials.confirm_password,
      otp: credentials.otp,
    });
    if (!result.success) return toast.error(result.message || "Could not reset your password.");
    toast.success("Password updated. You can sign in now.");
    setCredentials(emptyCredentials);
    setResetStep("email");
    changeMode("login");
  });

  const isLogin = mode === "login";
  const isEmailStep = resetStep === "email";
  const title = isLogin ? "Welcome back" : (isEmailStep ? "Reset your password" : "Choose a new password");
  const description = isLogin
    ? "Sign in to stay on top of every story."
    : (isEmailStep ? "Enter your email and we’ll send a verification code." : "Enter the code from your email and set a new password.");

  return (
    <>
  <Navbar/>
    <main className="auth-page">
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <div className="auth-shell">
        <aside className="auth-story" aria-label="About NewsHub">
          <div className="auth-brand auth-brand-light">
            <span className="auth-brand-mark" aria-hidden="true"><span>N</span></span>
            <span>NewsHub<span className="auth-brand-dot">.</span></span>
          </div>

          <div className="auth-story-content">
            <div className="auth-eyebrow"><span className="auth-live-dot" /> YOUR NEWSROOM, SIMPLIFIED</div>
            <h1>Every story starts <em>somewhere.</em></h1>
            <p>Bring your stories together, keep your team in sync, and stay ahead of what matters.</p>

            <div className="auth-preview" aria-hidden="true">
              <div className="auth-preview-top"><span className="auth-preview-kicker">THE DAILY BRIEF</span><span className="auth-preview-sun">✳</span></div>
              <div className="auth-preview-line auth-preview-line-wide" />
              <div className="auth-preview-line auth-preview-line-short" />
              <div className="auth-preview-row"><span className="auth-preview-thumb">N<span>.</span></span><span className="auth-preview-copy"><i /><i /><i /></span></div>
              <div className="auth-preview-footer"><span>INSIGHT IN EVERY UPDATE</span><span>↗</span></div>
            </div>
          </div>

          <p className="auth-story-footer">A better way to stay informed.</p>
        </aside>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-mobile-brand auth-brand">
            <span className="auth-brand-mark" aria-hidden="true"><span>N</span></span>
            <span>NewsHub<span className="auth-brand-dot">.</span></span>
          </div>

          <div className="auth-panel-top"><span className="auth-panel-badge">NEWSHUB ADMIN</span><span className="auth-panel-number">SECURE ACCESS</span></div>

          <div className="auth-form-area">
            {!isLogin && (
              <button className="auth-back" type="button" onClick={() => changeMode("login")}><span aria-hidden="true">←</span> Back to sign in</button>
            )}
            <div className="auth-intro">
              <span className="auth-section-label">{isLogin ? "WELCOME TO NEWSHUB" : "ACCOUNT RECOVERY"}</span>
              <h2 id="auth-title">{title}<span>.</span></h2>
              <p>{description}</p>
            </div>

            {isLogin && (
              <div className="auth-tabs" role="group" aria-label="Administrator sign in">
                <span className="active">Administrator sign in</span>
              </div>
            )}

            {isLogin && (
              <form className="auth-form" onSubmit={login}>
                <Field label="Email address" id="email" type="email" value={credentials.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
                <Field label="Password" id="password" type="password" value={credentials.password} onChange={handleChange} placeholder="Enter your password" autoComplete="current-password" visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
                <div className="auth-form-meta"><button type="button" onClick={() => changeMode("forget")}>Forgot password?</button></div>
                <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? "Signing in..." : "Sign in"}</span><ArrowIcon /></button>
              </form>
            )}



            {mode === "forget" && (isEmailStep ? (
              <form className="auth-form" onSubmit={(event) => sendOtp(event)}>
                <Field label="Email address" id="email" type="email" value={credentials.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
                <p className="auth-field-note">We’ll send a 6-digit code to verify it’s you.</p>
                <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? "Sending code..." : "Send verification code"}</span><ArrowIcon /></button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={resetPassword}>
                <Field label="Email address" id="email" type="email" value={credentials.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
                <Field label="Verification code" id="otp" value={credentials.otp} onChange={handleChange} placeholder="6-digit code" autoComplete="one-time-code" inputMode="numeric" minLength={6} maxLength={6} />
                <Field label="New password" id="password" type="password" value={credentials.password} onChange={handleChange} placeholder="Enter a new password" autoComplete="new-password" minLength={12} maxLength={72} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
                <Field label="Confirm new password" id="confirm_password" type="password" value={credentials.confirm_password} onChange={handleChange} placeholder="Confirm your new password" autoComplete="new-password" minLength={12} maxLength={72} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
                <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? "Updating password..." : "Reset password"}</span><ArrowIcon /></button>
              </form>
            ))}

            {isLogin && <p className="auth-switch">Administrator accounts are provisioned by the system owner.</p>}
          </div>

          <div className="auth-panel-footer"><span>© {new Date().getFullYear()} NewsHub</span><span>Stories move us forward.</span></div>
        </section>
      </div>
    </main>

      </>
  );
};

export default Signin;
