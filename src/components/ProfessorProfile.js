import React from 'react';
import './ProfessorProfile.css';

function ProfessorProfile({ professor }) {
  const { 
    name, 
    department, 
    university, 
    overallRating, 
    totalRatings,
    wouldTakeAgain, 
    levelOfDifficulty, 
    tags,
    ratingDistribution 
  } = professor;

  const maxDistribution = Math.max(...Object.values(ratingDistribution));

  return (
    <div className="professor-profile">
      <div className="profile-left">
        <div className="rating-large">
          <span className="rating-number">{overallRating}</span>
          <span className="rating-max">/ 5</span>
        </div>
        <p className="rating-subtitle">
          Overall Quality Based on <a href="#ratings">{totalRatings} ratings</a>
        </p>
        
        <h1 className="professor-name">{name}</h1>
        <p className="professor-info">
          Professor in the <a href="#dept">{department} department</a> at{' '}
          <a href="#uni">{university}</a>
        </p>

        <div className="stats-row">
          <div className="stat">
            <span className="stat-value">{wouldTakeAgain}%</span>
            <span className="stat-label">Would take again</span>
          </div>
          <div className="stat">
            <span className="stat-value">{levelOfDifficulty}</span>
            <span className="stat-label">Level of Difficulty</span>
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn btn-primary">Rate →</button>
          <button className="btn btn-secondary">Compare</button>
        </div>

        <a href="#profile" className="profile-link">I'm Professor {name.split(' ')[1]}</a>

        <div className="tags-section">
          <h3>Professor {name.split(' ')[1]}'s Top Tags</h3>
          <div className="tags-list">
            {tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="profile-right">
        <div className="rating-distribution">
          <h3>Rating Distribution</h3>
          <div className="distribution-bars">
            {[
              { label: 'Awesome 5', value: ratingDistribution.awesome },
              { label: 'Great 4', value: ratingDistribution.great },
              { label: 'Good 3', value: ratingDistribution.good },
              { label: 'OK 2', value: ratingDistribution.ok },
              { label: 'Awful 1', value: ratingDistribution.awful }
            ].map((item, index) => (
              <div key={index} className="distribution-row">
                <span className="distribution-label">{item.label}</span>
                <div className="distribution-bar-container">
                  <div 
                    className="distribution-bar" 
                    style={{ width: `${(item.value / maxDistribution) * 100}%` }}
                  />
                </div>
                <span className="distribution-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfessorProfile;
