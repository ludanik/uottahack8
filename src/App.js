import React, { useState } from 'react';
import ProfessorProfile from './components/ProfessorProfile';
import ReviewFeed from './components/ReviewFeed';
import './App.css';

// Sample professor data
const professorData = {
  id: 1,
  name: "Eric Ruppert",
  department: "Computer Science",
  university: "York University - Keele Campus",
  overallRating: 3.7,
  totalRatings: 64,
  wouldTakeAgain: 74,
  levelOfDifficulty: 4,
  tags: ["TOUGH GRADER", "AMAZING LECTURES", "SKIP CLASS? YOU WON'T PASS.", "LOTS OF HOMEWORK", "GET READY TO READ"],
  ratingDistribution: {
    awesome: 35,
    great: 9,
    good: 3,
    ok: 4,
    awful: 13
  }
};

// Sample reviews data
const initialReviews = [
  {
    id: 1,
    course: "3101",
    date: "Mar 27th, 2025",
    quality: 5.0,
    difficulty: 5.0,
    forCredit: true,
    attendance: "Mandatory",
    wouldTakeAgain: true,
    grade: "B",
    textbook: true,
    comment: "This is a self-teach course regardless of prof. A great resource for self-teach is the \"MIT OCW 6-006-introduction-to-algorithms-fall-2011\" (RMP doesn't let me link it). The MIT lectures and notes cover all aspects of the course and are high quality. Reading CLRS to learn is useless, use it only to do problems, review from MIT notes when stuck.",
    helpfulCount: 0,
    notHelpfulCount: 0,
    tags: []
  },
  {
    id: 2,
    course: "3101",
    date: "Mar 20th, 2025",
    quality: 5.0,
    difficulty: 5.0,
    forCredit: null,
    attendance: "Mandatory",
    wouldTakeAgain: true,
    grade: "D+",
    textbook: true,
    comment: "Course destroyed my will to live. Great prof though, material is just hard.",
    helpfulCount: 0,
    notHelpfulCount: 0,
    tags: []
  },
  {
    id: 3,
    course: "EECS4101",
    date: "Mar 14th, 2025",
    quality: 5.0,
    difficulty: 4.0,
    forCredit: true,
    attendance: "Mandatory",
    wouldTakeAgain: true,
    grade: "A",
    textbook: true,
    comment: "He is very mindful in the way he speaks; tries to phrase things concisely and in a clear way. Seems to know the content well and teaches off the blackboard. Writes down notes so its easy to follow along. Tests and assignments are challenging, but with going to classes + reading the textbook should do just fine. probably the best prof i had so far",
    helpfulCount: 0,
    notHelpfulCount: 0,
    tags: ["AMAZING LECTURES", "LECTURE HEAVY", "TEST HEAVY"]
  }
];

function App() {
  const [reviews, setReviews] = useState(initialReviews);

  const handleAddReview = () => {
    // Placeholder - user will add dialog later
    console.log("Add review button clicked");
  };

  const addReview = (newReview) => {
    setReviews(prevReviews => [
      {
        ...newReview,
        id: Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', 'th,'),
        helpfulCount: 0,
        notHelpfulCount: 0
      },
      ...prevReviews
    ]);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <span className="logo">RMP</span>
          <nav className="nav">
            <span className="nav-item active">Professors</span>
          </nav>
        </div>
      </header>
      
      <main className="main-content">
        <ProfessorProfile professor={professorData} />
        <ReviewFeed 
          reviews={reviews} 
          onAddReview={handleAddReview}
          totalRatings={professorData.totalRatings}
        />
      </main>
    </div>
  );
}

// Export addReview for external use
export default App;
