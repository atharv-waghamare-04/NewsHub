import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import "./Navbar.css";

const navigation = [
  { label: "Overview", to: "/dashboard", icon: "overview" },
  { label: "Articles", to: "/dashboard/articles", icon: "articles" },
  { label: "Categories", to: "/dashboard/categories", icon: "categories" },
];

const NavIcon = ({ name }) => {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    articles: <><path d="M7 4.5h11a2 2 0 0 1 2 2v13H7a3 3 0 0 0-3 3V7.5a3 3 0 0 1 3-3Z" /><path d="M4 19.5a3 3 0 0 1 3-3h13M9 9h7m-7 3h7" /></>,
    categories: <><path d="M3.5 4.5h8.1l8.9 8.9-7.1 7.1-8.9-8.9V4.5Z" /><circle cx="8" cy="8" r="1.3" /></>,
    analytics: <><path d="M4 20V12m5 8V8m5 12v-5m5 5V4" strokeLinecap="round" /><path d="M2.5 20.5h19" strokeLinecap="round" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.2 14.2 1.3 1-1.6 2.8-1.6-.5a8 8 0 0 1-1.7 1l-.3 1.7h-3.2l-.3-1.7a8 8 0 0 1-1.7-1l-1.6.5-1.6-2.8 1.3-1a8 8 0 0 1 0-2l-1.3-1 1.6-2.8 1.6.5a8 8 0 0 1 1.7-1l.3-1.7h3.2l.3 1.7a8 8 0 0 1 1.7 1l1.6-.5 1.6 2.8-1.3 1a8 8 0 0 1 0 2Z" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

const Navbar = ({ activeItem = "Overview", userName = "Admin" }) => {
  const initials = userName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);


  const navigate=useNavigate()
  const handlelogout=()=>{

    sessionStorage.removeItem("token");
    navigate("/dashboard/signin", { replace: true });
  }
  useEffect(() => {
    if (!profileOpen) return;

    const closeOnOutsideClick = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileRef.current?.querySelector("button")?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  return (
    <header className="dashboard-navbar">
      <div className="dashboard-navbar-inner">
        <Link className="dashboard-navbar-brand" to="/dashboard" aria-label="NewsHub dashboard">
          <span className="dashboard-navbar-mark" aria-hidden="true">N</span>
          <span className="dashboard-navbar-brand-copy">
            <strong>NewsHub<span>.</span></strong>
            <small>ADMIN WORKSPACE</small>
          </span>
        </Link>

        <nav className="dashboard-navbar-links" aria-label="Dashboard navigation">
          {navigation.map(({ label, to, icon }) => (
            <Link
              key={label}
              to={to}
              className={`dashboard-navbar-link${activeItem === label ? " is-active" : ""}`}
              aria-current={activeItem === label ? "page" : undefined}
            >
              <NavIcon name={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="dashboard-navbar-profile" ref={profileRef}>
          <button
            className="dashboard-navbar-profile-trigger"
            type="button"
            aria-label={`${userName} account menu`}
            aria-expanded={profileOpen}
            aria-controls={profileOpen ? "dashboard-profile-dropdown" : undefined}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="dashboard-navbar-avatar" aria-hidden="true">{initials}</span>
            <span className="dashboard-navbar-profile-copy">
              <strong>{userName}</strong>
              <small>Administrator</small>
            </span>
            <svg className={`dashboard-navbar-chevron${profileOpen ? " is-open" : ""}`} aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {profileOpen && (
            <div className="dashboard-navbar-dropdown" id="dashboard-profile-dropdown">
              <span className="dashboard-navbar-dropdown-label">ACCOUNT</span>
             { !sessionStorage.getItem("token")? <Link className="dashboard-navbar-dropdown-link" to="/dashboard/signin" onClick={() => setProfileOpen(false)}>
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                  <path d="M8 4H5.5A2.5 2.5 0 0 0 3 6.5v7A2.5 2.5 0 0 0 5.5 16H8m3-12h3.5A2.5 2.5 0 0 1 17 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11m-4-6h9m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Login</span>
              </Link>
              :
              <>
              <div className="dashboard-navbar-dropdown-divider" aria-hidden="true" />
              <button onClick={handlelogout} className="dashboard-navbar-dropdown-link dashboard-navbar-logout" type="button" >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                  <path d="M12 4h2.5A2.5 2.5 0 0 1 17 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12M10 7l-3 3 3 3M7 10h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Logout</span>
              </button>
              </>
              }
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
