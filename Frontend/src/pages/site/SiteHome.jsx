import { useState } from "react";
import { Link } from "react-router";
import { clearUserSession, getUserSession } from "./userSession";
import "./SiteHome.css";

const SiteHome = () => {
  const [session, setSession] = useState(getUserSession);

  const signOut = () => {
    clearUserSession();
    setSession({ token: null, email: null });
  };

  return (
    <main className="site-home">
      <header className="site-header">
        <Link className="site-brand" to="/" aria-label="NewsHub home"><img src="/newshub-mark.svg" alt="" /><span>NewsHub<span>.</span></span></Link>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#about">About</a>
          <Link to="/buy-now">Membership</Link>
          <Link to="/news-api">API guide</Link>
          {session.token ? (
            <button type="button" onClick={signOut}>Sign out</button>
          ) : (
            <><Link to="/login">Sign in</Link><Link className="site-nav-primary" to="/signup">Create account <span aria-hidden="true">↗</span></Link></>
          )}
        </nav>
      </header>

      <section className="site-hero">
        <div className="site-hero-copy">
          <span className="site-eyebrow"><i /> YOUR DAILY PERSPECTIVE</span>
          <h1>Stay close to <em>what matters.</em></h1>
          <p>NewsHub brings your reading experience into one thoughtful space. Create an account and make it yours.</p>
          {session.token ? (
            <><div className="site-signed-in" role="status"><span className="site-signed-in-icon">✓</span><span><strong>You’re signed in</strong><small>{session.email || "Your NewsHub account is ready."}</small></span></div><div className="site-hero-actions"><Link className="site-button site-button-primary" to="/buy-now">Explore membership <span aria-hidden="true">→</span></Link></div></>
          ) : (
            <div className="site-hero-actions"><Link className="site-button site-button-primary" to="/signup">Join NewsHub <span aria-hidden="true">→</span></Link><Link className="site-button site-button-secondary" to="/login">I already have an account</Link></div>
          )}
          <div className="site-hero-footnote"><span className="site-footnote-line" /> A space for curious minds</div>
        </div>

        <div className="site-hero-art" aria-hidden="true">
          <div className="site-art-grid" />
          <div className="site-art-orbit site-art-orbit-one" /><div className="site-art-orbit site-art-orbit-two" />
          <div className="site-art-issue"><div className="site-art-issue-top"><span>NEWSHUB</span><span>THE DAILY EDITION</span></div><div className="site-art-rule" /><span className="site-art-tag">A FRESH PERSPECTIVE</span><strong>The stories that shape our world.</strong><div className="site-art-lines"><i /><i /><i /></div><div className="site-art-picture"><span>N<span>.</span></span></div><div className="site-art-issue-bottom"><span>READ MORE. KNOW MORE.</span><span>01 / 03</span></div></div>
          <span className="site-art-sparkle site-art-sparkle-one">✳</span><span className="site-art-sparkle site-art-sparkle-two">✳</span>
        </div>
      </section>

      <section id="about" className="site-about">
        <div><span className="site-eyebrow">A SIMPLE START</span><h2>Your NewsHub account starts here<span>.</span></h2></div>
        <div className="site-about-steps"><div><span>01</span><h3>Sign up</h3><p>Start with your email and a few account details.</p></div><div><span>02</span><h3>Verify</h3><p>Confirm your email with a one-time code.</p></div><div><span>03</span><h3>Sign in</h3><p>Return to your space whenever you’re ready.</p></div></div>
      </section>

      <footer className="site-footer"><span>© {new Date().getFullYear()} NewsHub</span><span>Stories move us forward.</span></footer>
    </main>
  );
};

export default SiteHome;
