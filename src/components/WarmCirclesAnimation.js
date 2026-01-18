import React from 'react';
import './WarmCirclesAnimation.css';

function WarmCirclesAnimation() {
  // Warm colors for the circles
  const warmColors = [
    '#FF6B6B', // Warm red/coral
    '#FF8E53', // Warm orange
    '#FFA500', // Orange
    '#FFB347', // Peach
    '#FFD700', // Golden yellow
  ];

  return (
    <div className="warm-circles-container">
      {/* Circles moving up from bottom */}
      {warmColors.map((color, index) => (
        <div
          key={`up-${index}`}
          className="warm-circle warm-circle-up"
          style={{
            '--circle-color': color,
            '--animation-delay': `${index * 0.5}s`,
            '--animation-duration': `${15 + index * 2}s`,
            left: `${20 + index * 3}%`, // Stagger horizontally
          }}
        />
      ))}
      
      {/* Circles moving down from top */}
      {warmColors.map((color, index) => (
        <div
          key={`down-${index}`}
          className="warm-circle warm-circle-down"
          style={{
            '--circle-color': color,
            '--animation-delay': `${index * 0.5 + 2}s`,
            '--animation-duration': `${15 + index * 2}s`,
            left: `${25 + index * 3}%`, // Stagger horizontally (slightly offset)
          }}
        />
      ))}
    </div>
  );
}

export default WarmCirclesAnimation;
