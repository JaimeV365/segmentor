import React from 'react';
import { Info } from 'lucide-react';

interface InfoRibbonProps {
  text: string;
  className?: string;
}

export const InfoRibbon: React.FC<InfoRibbonProps> = ({ text, className = '' }) => {
  // Split text by \n\n to create line breaks
  const parts = text.split('\n\n');
  const formattedText = parts.map((part, index) => {
    // Check if this part contains bullet points (starts with • or -)
    if (part.includes('•') || part.includes('- ')) {
      const lines = part.split('\n');
      return (
        <React.Fragment key={index}>
          {lines.map((line, lineIndex) => {
            // Check if line is a bullet point
            if (line.trim().startsWith('•') || line.trim().startsWith('- ')) {
              return (
                <React.Fragment key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  <span style={{ display: 'inline-block', marginLeft: '1rem' }}>{line.trim()}</span>
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {line}
              </React.Fragment>
            );
          })}
          {index < parts.length - 1 && <><br /><br /></>}
        </React.Fragment>
      );
    }
    
    return (
      <React.Fragment key={index}>
        {part}
        {index < parts.length - 1 && <><br /><br /></>}
      </React.Fragment>
    );
  });

  return (
    <div className={`info-ribbon ${className}`}>
      <div className="info-ribbon-content">
        <Info size={16} className="info-icon" />
        <p className="info-text">{formattedText}</p>
      </div>
    </div>
  );
};

















