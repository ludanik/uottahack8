import React, { useMemo } from 'react';
import ReviewCard from './ReviewCard';
import './CourseDashboard.css';

function CourseDashboard({ reviews, courseCode, onVoiceReview, onTextReview, newlyPostedReview }) {
  // Filter reviews for the specific course
  const courseReviews = useMemo(() => {
    if (!courseCode) return reviews;
    return reviews.filter(review => 
      (review.courseCode || review.course || '').toUpperCase() === courseCode.toUpperCase()
    );
  }, [reviews, courseCode]);

  // Calculate difficulty statistics for radial progress
  const difficultyStats = useMemo(() => {
    const validDifficulties = courseReviews
      .map(r => typeof r.difficulty === 'number' && !isNaN(r.difficulty) ? Math.round(r.difficulty) : null)
      .filter(d => d !== null);

    if (validDifficulties.length === 0) {
      return {
        average: null,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        total: 0
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    validDifficulties.forEach(d => {
      if (d >= 1 && d <= 5) distribution[d]++;
    });

    const average = validDifficulties.reduce((sum, d) => sum + d, 0) / validDifficulties.length;

    return {
      average: Math.round(average * 10) / 10,
      distribution,
      total: validDifficulties.length
    };
  }, [courseReviews]);

  // Separate newly posted review from others
  const sortedReviews = useMemo(() => {
    const others = courseReviews.filter(r => r.id !== newlyPostedReview?.id);
    if (newlyPostedReview) {
      return [newlyPostedReview, ...others];
    }
    return others;
  }, [courseReviews, newlyPostedReview]);

  // Calculate percentage for radial progress (average difficulty out of 5)
  const progressPercentage = difficultyStats.average 
    ? (difficultyStats.average / 5) * 100 
    : 0;

  const getDifficultyLabel = (avg) => {
    if (!avg) return 'No ratings';
    if (avg <= 2) return 'Easy';
    if (avg <= 3) return 'Moderate';
    if (avg <= 4) return 'Hard';
    return 'Very Hard';
  };

  return (
    <div className="course-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="course-title">{courseCode || 'Lecture Reviews'}</h1>
          <p className="course-subtitle">{difficultyStats.total} lecture rating{difficultyStats.total !== 1 ? 's' : ''}</p>
        </div>
        <div className="header-actions">
          <button className="add-review-btn voice-review-btn" onClick={onVoiceReview}>
            🎤 Voice Review
          </button>
          <button className="add-review-btn text-review-btn" onClick={onTextReview}>
            💬 Text Review
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="radial-progress-section">
          <div className="radial-progress-container">
            <svg className="radial-progress" viewBox="0 0 120 120">
              <circle
                className="radial-progress-track"
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="8"
              />
              <circle
                className="radial-progress-bar"
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={difficultyStats.average <= 2 ? '#00a87d' : difficultyStats.average <= 3 ? '#ffcc00' : '#ff6b6b'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - progressPercentage / 100)}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="radial-progress-text">
              <span className="progress-value">{difficultyStats.average || 'N/A'}</span>
              <span className="progress-max">/ 5</span>
              <span className="progress-label">{getDifficultyLabel(difficultyStats.average)}</span>
            </div>
          </div>

          <div className="difficulty-distribution">
            <h3>Difficulty Distribution</h3>
            <div className="distribution-list">
              {[5, 4, 3, 2, 1].map(level => {
                const count = difficultyStats.distribution[level] || 0;
                const percentage = difficultyStats.total > 0 
                  ? (count / difficultyStats.total) * 100 
                  : 0;
                return (
                  <div key={level} className="distribution-item">
                    <span className="distribution-level">{level}</span>
                    <div className="distribution-bar-wrapper">
                      <div 
                        className="distribution-bar" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="distribution-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="reviews-section">
          {newlyPostedReview && (
            <div className="new-review-section">
              <h2 className="section-title">Your Review</h2>
              <ReviewCard key={newlyPostedReview.id} review={newlyPostedReview} />
            </div>
          )}

          {sortedReviews.length > (newlyPostedReview ? 1 : 0) && (
            <div className="other-reviews-section">
              <h2 className="section-title">All Reviews</h2>
              {sortedReviews.filter(r => r.id !== newlyPostedReview?.id).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}

          {sortedReviews.length === 0 && (
            <div className="no-reviews">
              <p>No lecture reviews yet. Be the first to share your lecture experience!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseDashboard;
