import React, { useState, useEffect, useRef } from 'react';
import ConversationService from '../services/conversationService';
import elevenLabsService from '../services/elevenLabsService';
import './VoiceAssistant.css';

function VoiceAssistant({ onComplete, onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState(''); // Store current user speech
  const [pendingTranscript, setPendingTranscript] = useState(''); // Transcript waiting to be processed
  const [conversationService] = useState(() => new ConversationService());
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isContinuousMode = useRef(true);
  const isListeningRef = useRef(false); // Track actual listening state to prevent race conditions
  const hasSpokenGreeting = useRef(false); // Prevent double-speaking greeting (React StrictMode issue)
  const autoFinishTimeoutRef = useRef(null); // Timeout for auto-finishing response after silence
  const pendingTranscriptRef = useRef(''); // Ref to track latest pending transcript for auto-finish
  const isProcessingRef = useRef(false); // Ref to track processing state
  const isSpeakingRef = useRef(false); // Ref to track speaking state
  const handleFinishResponseRef = useRef(null); // Ref to store handleFinishResponse function

  // Initialize with greeting message
  useEffect(() => {
    // Prevent double-speaking in React StrictMode
    if (hasSpokenGreeting.current) {
      return;
    }
    
    // Initialize voice (try to find Mark voice)
    elevenLabsService.initializeVoice().catch(err => {
      console.warn('Could not initialize voice:', err);
    });
    
    const greetingMessage = conversationService.getCurrentMessage();
    setMessages([{
      type: 'assistant',
      message: greetingMessage,
      timestamp: new Date()
    }]);
    
    // Initialize speech recognition if available
    initializeSpeechRecognition();
    
    // Mark greeting as spoken to prevent double-speaking
    hasSpokenGreeting.current = true;
    
    // Auto-speak greeting and start listening after
    speakMessage(greetingMessage).then(() => {
      // Auto-start listening after greeting is spoken
      if (isContinuousMode.current && !isListeningRef.current) {
        setTimeout(() => {
          if (!isListeningRef.current) {
            startListening();
          }
        }, 800);
      }
    });
    
    return () => {
      // Cleanup: stop recognition and reset state
      if (autoFinishTimeoutRef.current) {
        clearTimeout(autoFinishTimeoutRef.current);
        autoFinishTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors during cleanup
        }
        isListeningRef.current = false;
        setIsListening(false);
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Web Speech API for voice input
  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true; // Keep listening continuously
      recognition.interimResults = true; // Show interim results
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        // Ignore results while assistant is speaking (safeguard)
        if (isSpeakingRef.current || isSpeaking) {
          console.log('Ignoring recognition result while assistant is speaking');
          return;
        }
        
        // Get the latest transcript
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update current transcript (show what's being heard)
        const fullTranscript = finalTranscript + interimTranscript;
        setCurrentTranscript(fullTranscript);
        
        // Store final transcript when speech is complete
        if (finalTranscript) {
          // Clear any existing auto-finish timeout
          if (autoFinishTimeoutRef.current) {
            clearTimeout(autoFinishTimeoutRef.current);
            autoFinishTimeoutRef.current = null;
          }
          
          setPendingTranscript(prev => {
            const updated = prev + finalTranscript;
            pendingTranscriptRef.current = updated;
            return updated;
          });
          
          // Auto-finish after 2 seconds of silence (when speech ends)
          // Use refs to check state reliably in timeout
          autoFinishTimeoutRef.current = setTimeout(() => {
            const transcript = pendingTranscriptRef.current.trim();
            console.log('Auto-finish timeout triggered. Transcript:', transcript, 'Processing:', isProcessingRef.current, 'Speaking:', isSpeakingRef.current);
            if (transcript.length > 0 && !isProcessingRef.current && !isSpeakingRef.current && handleFinishResponseRef.current) {
              // Use the ref to call the function (avoids closure issues)
              handleFinishResponseRef.current();
            }
          }, 2000); // 2 seconds of silence before auto-finishing
        } else if (interimTranscript) {
          // User is still speaking - clear auto-finish timeout
          if (autoFinishTimeoutRef.current) {
            clearTimeout(autoFinishTimeoutRef.current);
            autoFinishTimeoutRef.current = null;
          }
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Don't stop on no-speech (it's normal when user isn't speaking)
        if (event.error === 'no-speech') {
          return; // Keep listening
        }
        
        // Stop on other errors
        if (event.error !== 'aborted') {
          setIsListening(false);
          isListeningRef.current = false;
          
          // Auto-restart after a delay if in continuous mode
          if (isContinuousMode.current && event.error !== 'not-allowed') {
            setTimeout(() => {
              if (!isSpeaking && !isProcessing && !isListeningRef.current) {
                startListening();
              }
            }, 1000);
          }
        }
      };
      
      recognition.onend = () => {
        // If in continuous mode and assistant is not speaking, restart listening
        if (isContinuousMode.current && !isSpeaking && !isProcessing && !isSpeakingRef.current && !isProcessingRef.current) {
          // Small delay to ensure recognition is fully stopped
          setTimeout(() => {
            if (!isListeningRef.current && recognitionRef.current && !isSpeakingRef.current && !isSpeaking) {
              startListening();
            }
          }, 100);
        } else {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };
      
      recognitionRef.current = recognition;
    }
  };

  // Start listening for voice input
  const startListening = () => {
    console.log('startListening called - checking conditions:', {
      hasRecognition: !!recognitionRef.current,
      isListeningRef: isListeningRef.current,
      isListeningState: isListening,
      isSpeakingRef: isSpeakingRef.current,
      isSpeakingState: isSpeaking,
      isProcessingRef: isProcessingRef.current,
      isProcessingState: isProcessing
    });
    
    // Prevent starting if already listening or in an invalid state
    // Use refs for more reliable checks (avoid closure issues)
    if (!recognitionRef.current || 
        isListeningRef.current || 
        isSpeakingRef.current || 
        isProcessingRef.current) {
      console.log('Cannot start listening - blocked by condition');
      return;
    }
    
    try {
      console.log('Starting recognition...');
      isListeningRef.current = true;
      setIsListening(true);
      recognitionRef.current.start();
    } catch (error) {
      // If recognition is already running, just update state
      if (error.name === 'InvalidStateError') {
        console.warn('Recognition already started, skipping');
        isListeningRef.current = true;
        setIsListening(true);
      } else {
        console.error('Error starting recognition:', error);
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current && (isListening || isListeningRef.current)) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  // Speak message using ElevenLabs
  const speakMessage = async (text) => {
    if (!text) {
      console.warn('No text provided to speakMessage');
      return;
    }
    
    console.log('speakMessage called with:', text.substring(0, 50) + '...');
    
    // Stop listening when assistant starts speaking (prevents picking up assistant's voice)
    stopListening();
    
    // Cancel any ongoing speech (browser TTS) before starting new speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    try {
      const result = await elevenLabsService.speak(text);
      
      // If ElevenLabs returns null or false, fall back to browser TTS
      // Only use browser TTS if ElevenLabs completely fails (not both)
      if (!result) {
        console.log('Falling back to browser speech synthesis');
        if ('speechSynthesis' in window) {
          // Ensure no other speech is playing
          window.speechSynthesis.cancel();
          
          // Wait a moment to ensure any ongoing ElevenLabs audio is stopped
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          await new Promise((resolve, reject) => {
            utterance.onend = () => {
              console.log('Browser TTS completed');
              resolve();
            };
            utterance.onerror = (error) => {
              console.error('Browser TTS error:', error);
              reject(error);
            };
            
            window.speechSynthesis.speak(utterance);
          });
        } else {
          console.warn('Browser speech synthesis not available');
        }
      }
    } catch (error) {
      console.error('Error in speakMessage:', error);
      // Final fallback: try browser TTS even if there was an error
      // But only if ElevenLabs didn't already succeed
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          // Wait a moment before speaking
          await new Promise(resolve => setTimeout(resolve, 200));
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
        } catch (ttsError) {
          console.error('Browser TTS also failed:', ttsError);
        }
      }
    } finally {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  // Handle finishing response (process pending transcript)
  const handleFinishResponse = async () => {
    console.log('=== handleFinishResponse called ===');
    console.log('pendingTranscriptRef:', pendingTranscriptRef.current);
    console.log('pendingTranscript state:', pendingTranscript);
    console.log('currentTranscript state:', currentTranscript);
    console.log('isProcessing state:', isProcessing, 'ref:', isProcessingRef.current);
    console.log('isSpeaking state:', isSpeaking, 'ref:', isSpeakingRef.current);
    
    // Clear auto-finish timeout if it exists
    if (autoFinishTimeoutRef.current) {
      clearTimeout(autoFinishTimeoutRef.current);
      autoFinishTimeoutRef.current = null;
    }
    
    // Get message text - check all sources and use the best one
    let messageText = '';
    
    // First try ref (most up-to-date for auto-finish)
    if (pendingTranscriptRef.current && pendingTranscriptRef.current.trim()) {
      messageText = pendingTranscriptRef.current.trim();
      console.log('Using pendingTranscriptRef:', messageText);
    }
    // Then try state pendingTranscript (final results)
    else if (pendingTranscript && pendingTranscript.trim()) {
      messageText = pendingTranscript.trim();
      pendingTranscriptRef.current = messageText; // Sync ref
      console.log('Using pendingTranscript state:', messageText);
    }
    // Finally try currentTranscript (might have interim results)
    else if (currentTranscript && currentTranscript.trim()) {
      messageText = currentTranscript.trim();
      pendingTranscriptRef.current = messageText; // Sync ref
      console.log('Using currentTranscript state:', messageText);
    }
    
    console.log('Final messageText to process:', messageText || '(empty)');
    
    // Check if we can process - use refs for reliable async checks
    const canProcess = messageText && 
                       !isProcessingRef.current && 
                       !isSpeakingRef.current && 
                       !isProcessing && 
                       !isSpeaking;
    
    if (!canProcess) {
      console.warn('Cannot process:', {
        hasMessage: !!messageText,
        isProcessingRef: isProcessingRef.current,
        isSpeakingRef: isSpeakingRef.current,
        isProcessingState: isProcessing,
        isSpeakingState: isSpeaking
      });
      return;
    }
    
    console.log('Proceeding with processing...');

    setIsProcessing(true);
    isProcessingRef.current = true;
    stopListening();
    setCurrentTranscript('');
    setPendingTranscript('');
    pendingTranscriptRef.current = '';

    // Add user message
    const userMessage = {
      type: 'user',
      message: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Process response (now async with OpenAI integration)
    try {
      const result = await conversationService.processResponse(messageText);
      
      // Add assistant response
      const assistantMessage = {
        type: 'assistant',
        message: result.assistantMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak assistant response using ElevenLabs
      await speakMessage(result.assistantMessage);

      // If conversation is complete, extract review data
      if (result.isComplete) {
        isContinuousMode.current = false; // Stop continuous listening
        const reviewData = conversationService.getCollectedReview();
        setTimeout(() => {
          onComplete(reviewData);
        }, 1500); // Give time for final message to be heard
      } else {
        // Auto-restart listening after assistant finishes speaking (continuous conversation)
        if (isContinuousMode.current) {
          setTimeout(() => {
            // Use refs to check state reliably (avoids closure issues)
            console.log('Auto-restart check after speech:', {
              isProcessingRef: isProcessingRef.current,
              isSpeakingRef: isSpeakingRef.current,
              isListeningRef: isListeningRef.current
            });
            if (!isProcessingRef.current && !isSpeakingRef.current && !isListeningRef.current) {
              // Clear any pending transcript before restarting
              setPendingTranscript('');
              setCurrentTranscript('');
              pendingTranscriptRef.current = '';
              console.log('Restarting listening after assistant speech...');
              startListening();
            } else {
              console.log('Not restarting - still processing/speaking/listening');
            }
          }, 1000); // Wait 1 second after speech completes
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      // Show error message to user
      const errorMessage = {
        type: 'assistant',
        message: "Sorry, I had trouble processing that. Could you try again?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      await speakMessage(errorMessage.message);
      
      // Auto-restart listening after error (ensure assistant finished speaking)
      if (isContinuousMode.current) {
        setTimeout(() => {
          // Use refs to check state reliably (avoids closure issues)
          console.log('Auto-restart check after error speech:', {
            isProcessingRef: isProcessingRef.current,
            isSpeakingRef: isSpeakingRef.current,
            isListeningRef: isListeningRef.current
          });
          if (!isProcessingRef.current && !isSpeakingRef.current && !isListeningRef.current) {
            setPendingTranscript('');
            setCurrentTranscript('');
            pendingTranscriptRef.current = '';
            console.log('Restarting listening after error speech...');
            startListening();
          } else {
            console.log('Not restarting - still processing/speaking/listening');
          }
        }, 1500); // Wait 1.5 seconds after error speech completes
      }
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  // Store handleFinishResponse in ref so timeout callbacks can access it
  useEffect(() => {
    handleFinishResponseRef.current = handleFinishResponse;
  });

  return (
    <div className="voice-assistant-overlay">
      <div className="voice-assistant-modal">
        <div className="voice-assistant-header">
          <h2>Voice Feedback Assistant</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="voice-assistant-messages">
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

        <div className="voice-assistant-controls">
          <div className="voice-status-display">
            {isListening && (
              <div className="listening-indicator">
                <div className="pulse-ring"></div>
                <span className="listening-text">🎤 Listening...</span>
              </div>
            )}
            {isSpeaking && (
              <span className="status">🎙️ Speaking...</span>
            )}
            {isProcessing && (
              <span className="status">⏳ Processing...</span>
            )}
            {!isListening && !isSpeaking && !isProcessing && (
              <span className="status">Ready - will start listening automatically</span>
            )}
            {isListening && currentTranscript && (
              <span className="status">💬 Heard: {currentTranscript.substring(0, 50)}{currentTranscript.length > 50 ? '...' : ''}</span>
            )}
          </div>
          
          <div className="control-buttons">
            <button
              className="finish-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Finish button clicked - current values:', {
                  pendingTranscriptRef: pendingTranscriptRef.current,
                  pendingTranscript: pendingTranscript,
                  currentTranscript: currentTranscript,
                  isSpeaking: isSpeaking,
                  isProcessing: isProcessing
                });
                handleFinishResponse();
              }}
              disabled={
                (!pendingTranscriptRef.current && !pendingTranscript && !currentTranscript) || 
                isSpeaking || 
                isProcessing ||
                isProcessingRef.current ||
                isSpeakingRef.current
              }
              aria-label="Finish and send response"
            >
              ✓ Finish Response
            </button>
            
            <button
              className="stop-btn"
              onClick={() => {
                isContinuousMode.current = false;
                stopListening();
                onClose();
              }}
              aria-label="Stop conversation"
            >
              Stop & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceAssistant;
