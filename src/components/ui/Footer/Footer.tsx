import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    // Force full page navigation to ensure static HTML files are loaded
    window.location.href = path;
  };

  return (
    <footer className="site-footer">
      <div className="app-content">
        <div className="footer-content">
          <p>&copy; 2025 segmentor.app. All rights reserved.</p>
          <nav className="footer-nav">
            <a href="/privacy.html" onClick={(e) => handleLinkClick(e, '/privacy.html')}>Privacy Policy</a>
            <a href="/terms.html" onClick={(e) => handleLinkClick(e, '/terms.html')}>Terms of Service</a>
            <a href="/tm" onClick={(e) => handleLinkClick(e, '/tm')} style={{ fontSize: '0.85rem', opacity: 0.7 }}>TM Staff</a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
