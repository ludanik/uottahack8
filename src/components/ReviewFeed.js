import React from 'react';
import ReviewCard from './ReviewCard';
import './ReviewFeed.css';

function ReviewFeed({ reviews, onAddReview, totalRatings }) {
  return (
    <div className="review-feed">
      <div className="feed-header">
        <div className="feed-header-left">
          <h2>{totalRatings} Student Ratings</h2>
          <select className="course-filter">
            <option value="all">All courses</option>
          </select>
        </div>
        <button className="add-review-btn" onClick={onAddReview}>
          + Add Review
        </button>
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
