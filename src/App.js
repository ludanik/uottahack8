import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import CourseDashboard from './components/CourseDashboard';
import VoiceAssistant from './components/VoiceAssistant';
import TextReview from './components/TextReview';
import SummaryPage from './components/SummaryPage';
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
    courseCode: "3101",
    date: "Mar 27th, 2025",
    quality: 5.0,
    difficulty: 5.0,
    forCredit: true,
    attendance: "Mandatory",
    wouldTakeAgain: true,
    grade: "B",
    textbook: true,
    comment: "• 📚 Topics covered: Introduction to algorithms, data structures, and complexity analysis\n• 💡 Understanding: The material was very challenging, especially dynamic programming concepts. Self-teaching was necessary.\n• 👨‍🏫 Professor: The course is self-teach regardless of prof. MIT OCW lectures are a great resource for learning the material.",
    helpfulCount: 0,
    notHelpfulCount: 0,
    tags: []
  },
  {
    id: 2,
    course: "3101",
    courseCode: "3101",
    date: "Mar 20th, 2025",
    quality: 5.0,
    difficulty: 5.0,
    forCredit: null,
    attendance: "Mandatory",
    wouldTakeAgain: true,
    grade: "D+",
    textbook: true,
    comment: "• 📚 Topics covered: Advanced algorithm design and analysis\n• 💡 Understanding: Extremely difficult material, struggled with most concepts throughout the course\n• 👨‍🏫 Professor: Great prof though, the material itself is just very hard",
    helpfulCount: 0,
    notHelpfulCount: 0,
    tags: []
  },
  {
    id: 3,
    course: "EECS4101",
    courseCode: "EECS4101",
    date: "Mar 14th, 2025",
    quality: 5.0,
    difficulty: 4.0,
    forCredit: true,
    attendance: "Mandatory",
    wouldTakeAgain: true,
    grade: "A",
    textbook: true,
    comment: "• 📚 Topics covered: Advanced computer science concepts and theory\n• 💡 Understanding: Material was challenging but manageable with regular attendance and textbook reading\n• 👨‍🏫 Professor: Very mindful in the way he speaks, phrases things concisely and clearly. Knows the content well, teaches off the blackboard and writes notes that are easy to follow. Probably the best prof I had so far",
    helpfulCount: 0,
    notHelpfulCount: 0,
    tags: ["AMAZING LECTURES", "LECTURE HEAVY", "TEST HEAVY"]
  }
];

function App() {
  const [appState, setAppState] = useState('landing'); // 'landing' | 'voice' | 'summary' | 'community'
  const [reviews, setReviews] = useState(initialReviews);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showTextReview, setShowTextReview] = useState(false);
  const [pendingReview, setPendingReview] = useState(null);
  const [pendingConversationHistory, setPendingConversationHistory] = useState([]);
  const [newlyPostedReview, setNewlyPostedReview] = useState(null);
  const [currentCourseCode, setCurrentCourseCode] = useState(null);

  const handleVoiceReview = () => {
    setShowVoiceAssistant(true);
  };

  const handleTextReview = () => {
    setShowTextReview(true);
  };

  const handleVoiceAssistantComplete = (reviewData, conversationHistory = []) => {
    setPendingReview(reviewData);
    setPendingConversationHistory(conversationHistory);
    setShowVoiceAssistant(false);
    setAppState('summary'); // Show summary page after conversation
  };

  const handleVoiceAssistantClose = () => {
    setShowVoiceAssistant(false);
    setAppState('landing'); // Go back to landing page
  };

  const handleStartRecording = () => {
    setAppState('voice');
    setShowVoiceAssistant(true);
  };

  const handleSummaryApprove = (reviewData) => {
    addReview(reviewData);
    setPendingReview(null);
    setPendingConversationHistory([]);
    setAppState('community'); // Show community page
  };

  const handleSummaryCancel = () => {
    setPendingReview(null);
    setPendingConversationHistory([]);
    setAppState('landing'); // Go back to landing page
  };

  const handleTextReviewComplete = (reviewData) => {
    addReview(reviewData);
    setShowTextReview(false);
  };

  const handleTextReviewClose = () => {
    setShowTextReview(false);
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

  const handleNavigateToDashboard = () => {
    setAppState('community');
    setNewlyPostedReview(null); // Reset newly posted review when navigating
    setCurrentCourseCode(null); // Reset course filter
  };

  const handleLogoClick = () => {
    setAppState('landing');
    setNewlyPostedReview(null);
    setCurrentCourseCode(null);
  };

  // Show landing page initially or when voice assistant is active (to keep logo visible)
  if (appState === 'landing' || appState === 'voice') {
    return (
      <div className="app">
        <LandingPage 
          onStartRecording={handleStartRecording} 
          onNavigateToDashboard={handleNavigateToDashboard}
          isVoiceActive={appState === 'voice'} // Pass prop to indicate voice is active
        />
        {appState === 'voice' && showVoiceAssistant && (
          <VoiceAssistant
            onComplete={handleVoiceAssistantComplete}
            onClose={handleVoiceAssistantClose}
          />
        )}
      </div>
    );
  }

  // Show community page
  if (appState === 'community') {
    return (
      <div className="app">
        <header className="header">
          <div className="header-content">
            <img 
              src="/righthand.png" 
              alt="RightHand Logo" 
              className="header-logo"
              onClick={handleLogoClick}
              style={{ cursor: 'pointer' }}
            />
            <nav className="nav">
              <span className="nav-item active">Lecture Reviews</span>
            </nav>
          </div>
        </header>
        
        <main className="main-content">
          <CourseDashboard
            reviews={reviews}
            courseCode={currentCourseCode}
            onVoiceReview={handleVoiceReview}
            onTextReview={handleTextReview}
            newlyPostedReview={newlyPostedReview}
          />
        </main>
      </div>
    );
  }

  // Show summary overlays
  return (
    <div className="app">
      {appState === 'summary' && pendingReview && (
        <SummaryPage
          reviewData={pendingReview}
          conversationHistory={pendingConversationHistory}
          onApprove={handleSummaryApprove}
          onCancel={handleSummaryCancel}
        />
      )}

      {showTextReview && (
        <TextReview
          onComplete={handleTextReviewComplete}
          onClose={handleTextReviewClose}
        />
      )}
    </div>
  );
}

// Export addReview for external use
export default App;
