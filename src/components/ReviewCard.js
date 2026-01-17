import React, { useState } from 'react';
import './ReviewCard.css';

function ReviewCard({ review }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [notHelpfulCount, setNotHelpfulCount] = useState(review.notHelpfulCount);

  const {
    course,
    date,
    quality,
    difficulty,
    forCredit,
    attendance,
    wouldTakeAgain,
    grade,
    textbook,
    comment,
    tags
  } = review;

  const getQualityColor = (rating) => {
    if (rating >= 4) return '#00a87d';
    if (rating >= 3) return '#ffcc00';
    return '#ff6b6b';
  };

  const getDifficultyColor = (rating) => {
    if (rating <= 2) return '#00a87d';
    if (rating <= 3) return '#ffcc00';
    return '#ff6b6b';
  };

  return (
    <div className="review-card">
      <div className="review-scores">
        <div className="score-box">
          <span className="score-label">QUALITY</span>
          <span 
            className="score-value" 
            style={{ backgroundColor: getQualityColor(quality) }}
          >
            {quality.toFixed(1)}
          </span>
        </div>
        <div className="score-box">
          <span className="score-label">DIFFICULTY</span>
          <span 
            className="score-value" 
            style={{ backgroundColor: getDifficultyColor(difficulty) }}
          >
            {difficulty.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="review-content">
        <div className="review-header">
          <span className="course-name">{course}</span>
          <span className="review-date">{date}</span>
        </div>

        <div className="review-meta">
          {forCredit !== null && (
            <span className="meta-item">
              <strong>For Credit:</strong> {forCredit ? 'Yes' : 'No'}
            </span>
          )}
          {attendance && attendance !== 'N/A' && (
            <span className="meta-item">
              <strong>Attendance:</strong> <span className={attendance === 'Yes' ? 'mandatory' : ''}>{attendance === 'Yes' ? 'Mandatory' : attendance === 'No' ? 'Optional' : attendance}</span>
            </span>
          )}
          {wouldTakeAgain !== null && (
            <span className="meta-item">
              <strong>Would Take Again:</strong> {wouldTakeAgain ? 'Yes' : 'No'}
            </span>
          )}
          {grade && (
            <span className="meta-item">
              <strong>Grade:</strong> {grade}
            </span>
          )}
          {textbook !== null && (
            <span className="meta-item">
              <strong>Textbook:</strong> {textbook ? 'Yes' : 'No'}
            </span>
          )}
        </div>

        <p className="review-comment">{comment}</p>

        {tags && tags.length > 0 && (
          <div className="review-tags">
            {tags.map((tag, index) => (
              <span key={index} className="review-tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="review-actions">
          <span className="helpful-text">Helpful</span>
          <button 
            className="helpful-btn" 
            onClick={() => setHelpfulCount(prev => prev + 1)}
            aria-label="Mark as helpful"
          >
            👍 <span className="helpful-count">{helpfulCount}</span>
          </button>
          <button 
            className="helpful-btn" 
            onClick={() => setNotHelpfulCount(prev => prev + 1)}
            aria-label="Mark as not helpful"
          >
            👎 <span className="helpful-count">{notHelpfulCount}</span>
          </button>
          <div className="review-actions-right">
            <button className="action-icon" aria-label="Share">↗</button>
            <button className="action-icon" aria-label="Report">⚑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewCard;
