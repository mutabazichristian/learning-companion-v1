import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../contexts/AuthContext";

const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, role, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">Read</div>
      <div className="navbar-links">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          Home
        </Link>
        <Link
          to="/documents"
          className={location.pathname === "/documents" ? "active" : ""}
        >
          Documents
        </Link>
        {username ? (
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout ({username})
          </button>
        ) : (
          <>
            <Link
              to="/login"
              className={location.pathname === "/login" ? "active" : ""}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={location.pathname === "/register" ? "active" : ""}
            >
              Register
            </Link>
          </>
        )}
      </div>
      <div className="navbar-user">
        {username && <span>{username} ({role})</span>}
      </div>
    </nav>
  );
};

export default NavBar;
