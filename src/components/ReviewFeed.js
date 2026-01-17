import React from 'react';
import ReviewCard from './ReviewCard';
import './ReviewFeed.css';

function ReviewFeed({ reviews, onVoiceReview, onTextReview, totalRatings }) {
  return (
    <div className="review-feed">
      <div className="feed-header">
        <div className="feed-header-left">
          <h2>{totalRatings} Student Ratings</h2>
          <select className="course-filter">
            <option value="all">All courses</option>
          </select>
        </div>
        <div className="review-buttons">
          <button className="add-review-btn voice-review-btn" onClick={onVoiceReview}>
            🎤 Voice Review
          </button>
          <button className="add-review-btn text-review-btn" onClick={onTextReview}>
            💬 Text Review
          </button>
        </div>
      </div>
      
      <div className="reviews-list">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}

export default ReviewFeed;
