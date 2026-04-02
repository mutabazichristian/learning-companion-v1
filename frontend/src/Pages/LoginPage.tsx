import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/documents");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="auth-form-container">
      <h2>Sign In</h2>
      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <button type="submit">Continue</button>
        {error && <div className="error">{error}</div>}
      </form>
      <div
        style={{
          marginTop: "24px",
          fontSize: "13px",
          textAlign: "center",
          color: "#94a3b8",
        }}
      >
        New here?{" "}
        <Link
          to="/register"
          style={{ color: "#000", fontWeight: "700", textDecoration: "none" }}
        >
          Create an account
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
