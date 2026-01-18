import React, { useState } from 'react';
import './ReviewCard.css';

function ReviewCard({ review }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [notHelpfulCount, setNotHelpfulCount] = useState(review.notHelpfulCount);

  const {
    course,
    courseCode,
    date,
    quality,
    difficulty,
    forCredit,
    attendance,
    wouldTakeAgain,
    grade,
    textbook,
    comment,
    tags,
    lectureTopics,
    easyHard,
    professorFeedback
  } = review;

  const getDifficultyColor = (rating) => {
    if (!rating || isNaN(rating)) return '#999';
    if (rating <= 2) return '#00a87d'; // Green for easy
    if (rating <= 3) return '#ffcc00'; // Yellow for moderate
    return '#ff6b6b'; // Red for difficult
  };

  const displayDifficulty = (typeof difficulty === 'number' && !isNaN(difficulty)) 
    ? Math.round(difficulty) 
    : null;

  return (
    <div className="review-card summary-style">
      <div className="review-header-summary">
        <span className="course-name">{courseCode || course || 'Course'}</span>
        <div className="review-ratings">
          <span className="rating-badge difficulty">Difficulty: {displayDifficulty !== null ? displayDifficulty : 'N/A'}</span>
        </div>
      </div>
      
      {/* Display comment in bullet point format (same as summary page) */}
      <div className="review-comment-summary" style={{ whiteSpace: 'pre-line' }}>
        {comment || (
          /* Fallback: Show lecture experience fields as bullet points if comment doesn't exist */
          <>
            {lectureTopics && (
              <div>• 📚 Topics covered: {lectureTopics}</div>
            )}
            {easyHard && (
              <div>• 💡 Understanding: {easyHard}</div>
            )}
            {professorFeedback && (
              <div>• 👨‍🏫 Professor: {professorFeedback}</div>
            )}
            {!lectureTopics && !easyHard && !professorFeedback && (
              <div>No summary available.</div>
            )}
          </>
        )}
      </div>

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
  );
}

export default ReviewCard;
