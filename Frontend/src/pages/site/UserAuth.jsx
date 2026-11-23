import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { USER_EMAIL_KEY, USER_TOKEN_KEY } from "./userSession";
import { apiRequest } from "../../lib/api";
import "../dashboard/Signin.css";
import "./UserAuth.css";

const emptyForm = { name: "", email: "", mobile_no: "", password: "", confirm_password: "", otp: "" };

const Field = ({ label, name, type = "text", value, onChange, placeholder, autoComplete, minLength, maxLength, pattern, inputMode, readOnly, visible, onToggle }) => (
  <div className="auth-field">
    <label htmlFor={`user-${name}`}>{label}</label>
    <div className="auth-input-wrap">
      <input
        id={`user-${name}`}
        name={name}
        type={type === "password" && visible ? "text" : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        inputMode={inputMode}
        readOnly={readOnly}
        required
      />
      {type === "password" && <button type="button" className="auth-visibility" onClick={onToggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>{visible ? "Hide" : "Show"}</button>}
    </div>
  </div>
);

const requestUser = (endpoint, body) =>
  apiRequest(`/api/user/${endpoint}`, { method: "POST", body });

const UserAuth = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(() => ({ ...emptyForm, email: location.state?.email || "" }));
  const [step, setStep] = useState("email");
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.message || "");
  const isSignup = mode === "signup";
  const isLogin = mode === "login";
  const isReset = mode === "forgot";
  const returnTo = ["/buy-now", "/news-api"].includes(location.state?.returnTo) ? location.state.returnTo : "/";

  useEffect(() => {
    if (sessionStorage.getItem(USER_TOKEN_KEY)) navigate(returnTo, { replace: true });
  }, [navigate, returnTo]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  };

  const run = async (action) => {
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (cause) { setError(cause.message || "Something went wrong. Please try again."); }
    finally { setPending(false); }
  };

  const login = (event) => {
    event.preventDefault();
    run(async () => {
      const email = form.email.trim().toLowerCase();
      const result = await requestUser("login-admin", { email, password: form.password });
      if (!result.token) throw new Error("The sign-in response did not include a session token.");
      sessionStorage.setItem(USER_TOKEN_KEY, result.token);
      sessionStorage.setItem(USER_EMAIL_KEY, email);
      navigate(returnTo, { replace: true });
    });
  };

  const sendOtp = (event) => {
    event?.preventDefault();
    run(async () => {
      const email = form.email.trim().toLowerCase();
      await requestUser("generate-otp-for-admin", { email, purpose: isSignup ? "user_signup" : "user_password_reset" });
      setForm((current) => ({ ...current, email }));
      setStep("details");
      setNotice("If the email address is eligible, we sent a six-digit code. It expires in 10 minutes.");
    });
  };

  const signup = (event) => {
    event.preventDefault();
    if (!/^[A-Za-z]{2,26}$/.test(form.name.trim())) { setError("Enter a name with 2–26 letters and no spaces."); return; }
    if (!/^[6-9][0-9]{9}$/.test(form.mobile_no.trim())) { setError("Enter a valid 10-digit Indian mobile number."); return; }
    if (!/^[0-9]{6}$/.test(form.otp)) { setError("Enter the six-digit code from your email."); return; }
    if (new TextEncoder().encode(form.password).length < 12 || new TextEncoder().encode(form.password).length > 72) { setError("Use a password between 12 and 72 UTF-8 bytes."); return; }
    if (form.password !== form.confirm_password) { setError("Passwords do not match."); return; }

    run(async () => {
      await requestUser("create-new-user", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile_no: form.mobile_no.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        otp: form.otp,
      });
      navigate("/login", { replace: true, state: { email: form.email.trim().toLowerCase(), message: "Account created. Sign in to continue.", returnTo } });
    });
  };

  const resetPassword = (event) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(form.otp)) { setError("Enter the six-digit code from your email."); return; }
    if (new TextEncoder().encode(form.password).length < 12 || new TextEncoder().encode(form.password).length > 72) { setError("Use a password between 12 and 72 UTF-8 bytes."); return; }
    if (form.password !== form.confirm_password) { setError("Passwords do not match."); return; }

    run(async () => {
      await requestUser("forget-password", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
        otp: form.otp,
      });
      navigate("/login", { replace: true, state: { email: form.email.trim().toLowerCase(), message: "Password updated. Sign in with your new password.", returnTo } });
    });
  };

  return (
    <main className="auth-page user-auth-page">
      <div className="auth-shell">
        <aside className="auth-story" aria-label="About NewsHub">
          <Link className="auth-brand auth-brand-light user-auth-brand-link" to="/"><span className="auth-brand-mark" aria-hidden="true"><span>N</span></span><span>NewsHub<span className="auth-brand-dot">.</span></span></Link>
          <div className="auth-story-content">
            <div className="auth-eyebrow"><span className="auth-live-dot" /> YOUR DAILY PERSPECTIVE</div>
            <h1>Stay close to <em>what matters.</em></h1>
            <p>Make room for fresh perspectives, thoughtful stories, and the ideas that move us forward.</p>
            <div className="auth-preview" aria-hidden="true"><div className="auth-preview-top"><span className="auth-preview-kicker">THE DAILY BRIEF</span><span className="auth-preview-sun">✳</span></div><div className="auth-preview-line auth-preview-line-wide" /><div className="auth-preview-line auth-preview-line-short" /><div className="auth-preview-row"><span className="auth-preview-thumb">N<span>.</span></span><span className="auth-preview-copy"><i /><i /><i /></span></div><div className="auth-preview-footer"><span>INSIGHT IN EVERY UPDATE</span><span>↗</span></div></div>
          </div>
          <p className="auth-story-footer">A better way to stay informed.</p>
        </aside>

        <section className="auth-panel" aria-labelledby="user-auth-title">
          <Link className="auth-mobile-brand auth-brand user-auth-brand-link" to="/"><span className="auth-brand-mark" aria-hidden="true"><span>N</span></span><span>NewsHub<span className="auth-brand-dot">.</span></span></Link>
          <div className="auth-panel-top"><span className="auth-panel-badge">NEWSHUB ACCOUNT</span><span className="auth-panel-number">SECURE ACCESS</span></div>
          <div className="auth-form-area">
            <Link className="auth-back user-auth-back" to="/"><span aria-hidden="true">←</span> Back to home</Link>
            <div className="auth-intro"><span className="auth-section-label">{isSignup ? "JOIN NEWSHUB" : isReset ? "ACCOUNT RECOVERY" : "WELCOME BACK"}</span><h2 id="user-auth-title">{isSignup ? (step === "email" ? "Create your account" : "Finish setting up") : isReset ? (step === "email" ? "Reset your password" : "Choose a new password") : "Sign in"}<span>.</span></h2><p>{isSignup ? (step === "email" ? "Start with your email. We’ll send you a verification code." : "Enter your details and the code we sent to your inbox.") : isReset ? (step === "email" ? "Enter your email and we’ll send you a verification code." : "Use the code from your email to set a new password.") : "Sign in to your NewsHub account."}</p></div>
            {isReset ? <Link className="user-auth-reset-back" to="/login" state={{ returnTo }}>← Back to sign in</Link> : <div className="auth-tabs" role="group" aria-label="Account access"><Link className={isLogin ? "active" : ""} aria-current={isLogin ? "page" : undefined} to="/login" state={{ returnTo }}>Sign in</Link><Link className={isSignup ? "active" : ""} aria-current={isSignup ? "page" : undefined} to="/signup" state={{ returnTo }}>Create account</Link></div>}

            {notice && <p className="user-auth-notice" role="status">{notice}</p>}
            {error && <p className="user-auth-error" role="alert">{error}</p>}

            {isLogin ? (
              <form className="auth-form" onSubmit={login}>
                <Field label="Email address" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
                <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Enter your password" autoComplete="current-password" visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
                <div className="auth-form-meta"><Link to="/forgot-password" state={{ email: form.email, returnTo }}>Forgot password?</Link></div>
                <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? "Signing in..." : "Sign in"}</span><span aria-hidden="true">→</span></button>
              </form>
            ) : step === "email" ? (
              <form className="auth-form" onSubmit={sendOtp}>
                <Field label="Email address" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
                <p className="auth-field-note">We’ll send a six-digit verification code to this address.</p>
                <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? "Sending code..." : isReset ? "Send verification code" : "Continue with email"}</span><span aria-hidden="true">→</span></button>
              </form>
            ) : isSignup ? (
              <form className="auth-form" onSubmit={signup}>
                <div className="user-auth-email-line"><strong>{form.email}</strong><button type="button" onClick={() => { setStep("email"); setForm((current) => ({ ...current, otp: "" })); setNotice(""); }}>Change email</button></div>
                <Field label="Name" name="name" value={form.name} onChange={handleChange} placeholder="Your first name" autoComplete="given-name" minLength={2} maxLength={26} pattern="[A-Za-z]{2,26}" />
                <Field label="Mobile number" name="mobile_no" type="tel" value={form.mobile_no} onChange={handleChange} placeholder="10-digit Indian mobile number" autoComplete="tel" inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" />
                <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create a password" autoComplete="new-password" minLength={12} maxLength={72} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
                <Field label="Confirm password" name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange} placeholder="Confirm your password" autoComplete="new-password" minLength={12} maxLength={72} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
                <Field label="Verification code" name="otp" value={form.otp} onChange={handleChange} placeholder="Six-digit code" autoComplete="one-time-code" inputMode="numeric" minLength={6} maxLength={6} pattern="[0-9]{6}" />
                <button className="user-auth-resend" type="button" onClick={() => sendOtp()} disabled={pending}>Resend code</button>
                <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? "Creating account..." : "Create account"}</span><span aria-hidden="true">→</span></button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={resetPassword}>
                <div className="user-auth-email-line"><strong>{form.email}</strong><button type="button" onClick={() => { setStep("email"); setForm((current) => ({ ...current, otp: "" })); setNotice(""); }}>Change email</button></div>
                <Field label="Verification code" name="otp" value={form.otp} onChange={handleChange} placeholder="Six-digit code" autoComplete="one-time-code" inputMode="numeric" minLength={6} maxLength={6} pattern="[0-9]{6}" />
                <Field label="New password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create a new password" autoComplete="new-password" minLength={12} maxLength={72} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
                <Field label="Confirm new password" name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange} placeholder="Confirm your new password" autoComplete="new-password" minLength={12} maxLength={72} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />
                <button className="user-auth-resend" type="button" onClick={() => sendOtp()} disabled={pending}>Resend code</button>
                <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? "Updating password..." : "Reset password"}</span><span aria-hidden="true">→</span></button>
              </form>
            )}
            {!isReset && <p className="auth-switch">{isSignup ? "Already have an account?" : "New to NewsHub?"} <Link to={isSignup ? "/login" : "/signup"} state={{ returnTo }}>{isSignup ? "Sign in" : "Create an account"} <span aria-hidden="true">↗</span></Link></p>}
          </div>
          <div className="auth-panel-footer"><span>© {new Date().getFullYear()} NewsHub</span><span>Stories move us forward.</span></div>
        </section>
      </div>
    </main>
  );
};

export default UserAuth;
