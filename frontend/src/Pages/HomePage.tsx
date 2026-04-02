import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>Read</h1>
        <p>Interactive reading companion</p>
        <Link to="/documents" className="cta-button">
          Get Started
        </Link>
      </div>
      <div className="features">
        <div className="feature">
          <div className="feature-number">1</div>
          <h3>Upload</h3>
          <p>Select any PDF document</p>
        </div>
        <div className="feature">
          <div className="feature-number">2</div>
          <h3>Read</h3>
          <p>Listen as the AI reads to you</p>
        </div>
        <div className="feature">
          <div className="feature-number">3</div>
          <h3>Learn</h3>
          <p>Answer comprehension questions</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
