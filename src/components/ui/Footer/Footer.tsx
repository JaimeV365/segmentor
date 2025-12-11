import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="app-content">
        <div className="footer-content">
          <p>&copy; 2025 segmentor.app. All rights reserved.</p>
          <nav className="footer-nav">
            <a href="/privacy.html">Privacy Policy</a>
            <a href="/terms.html">Terms of Service</a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
