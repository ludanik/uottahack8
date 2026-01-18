import React, { useState, useEffect } from 'react';
import openAIService from '../services/openAIService';
import './SummaryPage.css';

function SummaryPage({ reviewData, conversationHistory, onApprove, onCancel }) {
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    generateSummary();
  }, []);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      // Build bullet points from extracted lecture experience data
      const bulletPoints = [];
      
      // Add lecture topics if available
      if (reviewData.lectureTopics && reviewData.lectureTopics.trim()) {
        bulletPoints.push(`📚 Topics covered: ${reviewData.lectureTopics}`);
      }
      
      // Add easy/hard to understand if available
      if (reviewData.easyHard && reviewData.easyHard.trim()) {
        bulletPoints.push(`💡 Understanding: ${reviewData.easyHard}`);
      }
      
      // Add professor feedback if available
      if (reviewData.professorFeedback && reviewData.professorFeedback.trim()) {
        bulletPoints.push(`👨‍🏫 Professor: ${reviewData.professorFeedback}`);
      }
      
      // If we have bullet points, format them
      if (bulletPoints.length > 0) {
        const formattedSummary = bulletPoints.map(point => `• ${point}`).join('\n');
        setSummary(formattedSummary);
      } else if (openAIService.isConfigured() && conversationHistory.length > 0) {
        // Fallback: Use OpenAI to generate bullet points from conversation
        const completion = await openAIService.client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Create bullet points summarizing the lecture experience based on the conversation. Focus on: lecture topics covered, what was easy/hard to understand, and what the professor did well or poorly. Format as concise bullet points, each starting with "•".`
            },
            {
              role: 'user',
              content: `Based on this conversation about the lecture, create bullet points summarizing the experience:\n\n${conversationHistory.filter(msg => msg.type === 'user').map(msg => msg.message).join('\n')}`
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        });
        
        const generatedSummary = completion.choices[0]?.message?.content?.trim();
        setSummary(generatedSummary || 'No summary available.');
      } else {
        setSummary('No summary available.');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary('No summary available.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    setIsPosting(true);
    // Add a delay to show posting state
    setTimeout(() => {
      onApprove({
        ...reviewData,
        comment: summary,
        course: reviewData.courseCode || 'Unknown' // Map courseCode to course for compatibility
      });
    }, 500);
  };

  return (
    <div className="summary-page-overlay">
      <div className="summary-page-modal">
        <div className="summary-header">
          <h2>Review Summary</h2>
          <p className="summary-subtitle">Review and approve your anonymous post</p>
        </div>

        <div className="summary-content">
          {isGenerating ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Generating summary...</p>
            </div>
          ) : (
            <div className="summary-preview">
              <div className="preview-card">
                <div className="preview-header">
                  <span className="preview-course">{reviewData.courseCode || reviewData.course || 'Course'}</span>
                  <div className="preview-ratings">
                    <span className="rating-badge difficulty">Difficulty: {(typeof reviewData.difficulty === 'number' && !isNaN(reviewData.difficulty)) ? Math.round(reviewData.difficulty) : 'N/A'}</span>
                  </div>
                </div>
                <div className="preview-comment" style={{ whiteSpace: 'pre-line' }}>
                  {summary || 'No summary available.'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="summary-actions">
          <button
            className="btn-cancel"
            onClick={onCancel}
            disabled={isPosting}
          >
            Cancel
          </button>
          <button
            className="btn-approve"
            onClick={handleApprove}
            disabled={isGenerating || isPosting}
          >
            {isPosting ? 'Posting...' : 'Post Anonymously'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SummaryPage;