import React, { useState, useEffect, useRef } from 'react';
import ConversationService from '../services/conversationService';
import './TextReview.css';

function TextReview({ onComplete, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationService] = useState(() => new ConversationService());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with greeting message
  useEffect(() => {
    const greetingMessage = conversationService.getCurrentMessage();
    setMessages([{
      type: 'assistant',
      message: greetingMessage,
      timestamp: new Date()
    }]);
    
    // Focus input after greeting
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input after assistant message
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].type === 'assistant' && !isProcessing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [messages, isProcessing]);

  // Handle sending message
  const handleSendMessage = async (message = null) => {
    const messageText = message || inputValue.trim();
    if (!messageText || isProcessing) return;

    setIsProcessing(true);
    
    // Add user message
    const userMessage = {
      type: 'user',
      message: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Process response (async with OpenAI integration)
    try {
      const result = await conversationService.processResponse(messageText);
      
      // Add assistant response
      const assistantMessage = {
        type: 'assistant',
        message: result.assistantMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // If conversation is complete, extract review data
      if (result.isComplete) {
        const reviewData = conversationService.getCollectedReview();
        setTimeout(() => {
          onComplete(reviewData);
        }, 500);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = {
        type: 'assistant',
        message: "Sorry, I had trouble processing that. Could you try again?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle keyboard input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="text-review-overlay">
      <div className="text-review-modal">
        <div className="text-review-header">
          <h2>Text Review - Chat Feedback</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="text-review-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}`}>
              <div className="message-content">
                {msg.message}
              </div>
              <div className="message-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="text-review-controls">
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              disabled={isProcessing}
              className="text-input"
            />
            <button
              className="send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isProcessing}
              aria-label="Send message"
            >
              Send
            </button>
          </div>
          
          <div className="status-indicators">
            {isProcessing && <span className="status">⏳ Processing...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextReview;
