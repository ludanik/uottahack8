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
  const isStoppedRef = useRef(false); // Ref to track if conversation was stopped

  // Define speakMessage and startListening functions first (before useEffect that uses them)
  // This ensures they're available when the useEffect runs
  
  // Speak message using ElevenLabs
  const speakMessage = async (text) => {
    if (!text) {
      console.warn('No text provided to speakMessage');
      return;
    }
    
    // Check if conversation was stopped
    if (isStoppedRef.current) {
      console.log('Conversation stopped, not speaking message');
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
      // Check again before speaking (might have been stopped during async operations)
      if (isStoppedRef.current) {
        console.log('Conversation stopped before speaking');
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        return;
      }
      
      console.log('Calling ElevenLabs speak with:', text.substring(0, 50) + '...');
      const result = await elevenLabsService.speak(text);
      
      // Check if stopped during async operation
      if (isStoppedRef.current) {
        console.log('Conversation stopped during speech');
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        // Force stop audio in case it's still playing
        elevenLabsService.stopAudio();
        return;
      }
      
      console.log('ElevenLabs speak result:', result);
      
      // If result is null and we're stopped, don't try browser TTS
      if (!result && isStoppedRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        return;
      }
      
      // If ElevenLabs returns null or false, fall back to browser TTS
      // Only use browser TTS if ElevenLabs completely fails (not both)
      if (!result && !isStoppedRef.current) {
        console.log('ElevenLabs returned false/null, falling back to browser speech synthesis');
        if ('speechSynthesis' in window && !isStoppedRef.current) {
          // Ensure no other speech is playing
          window.speechSynthesis.cancel();
          
          // Wait a moment to ensure any ongoing ElevenLabs audio is stopped
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check again before browser TTS
          if (isStoppedRef.current) {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            return;
          }
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          await new Promise((resolve, reject) => {
            // Check if stopped before setting up handlers
            if (isStoppedRef.current) {
              window.speechSynthesis.cancel();
              reject(new Error('Stopped'));
              return;
            }
            
            utterance.onend = () => {
              if (isStoppedRef.current) {
                reject(new Error('Stopped'));
                return;
              }
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
      // If error is because we stopped, just return
      if (isStoppedRef.current || error.message === 'Stopped' || error.message === 'Audio playback was stopped') {
        console.log('Speech was stopped');
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        return;
      }
      
      console.error('Error in speakMessage:', error);
      console.error('Error details:', error.message, error.stack);
      // Final fallback: try browser TTS even if there was an error
      // But only if ElevenLabs didn't already succeed and not stopped
      if ('speechSynthesis' in window && !isStoppedRef.current) {
        try {
          window.speechSynthesis.cancel();
          // Wait a moment before speaking
          await new Promise(resolve => setTimeout(resolve, 200));
          if (!isStoppedRef.current) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
          }
        } catch (ttsError) {
          console.error('Browser TTS also failed:', ttsError);
        }
      }
    } finally {
      if (!isStoppedRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
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

  // Initialize with greeting message
  useEffect(() => {
    console.log('VoiceAssistant: Component mounted, initializing...');
    
    // Reset greeting flag when component mounts
    hasSpokenGreeting.current = false;
    
    // Initialize voice (try to find Mark voice)
    elevenLabsService.initializeVoice().catch(err => {
      console.warn('Could not initialize voice:', err);
    });
    
    // Reset stopped flag when component mounts
    isStoppedRef.current = false;
    
    // Initialize speech recognition if available
    console.log('VoiceAssistant: Initializing speech recognition...');
    initializeSpeechRecognition();
    
    const greetingMessage = conversationService.getCurrentMessage();
    console.log('VoiceAssistant: Greeting message:', greetingMessage);
    
    setMessages([{
      type: 'assistant',
      message: greetingMessage,
      timestamp: new Date()
    }]);
    
    // Small delay to ensure everything is initialized, then speak greeting
    // Use hasSpokenGreeting ref to prevent double-speaking in React StrictMode
    setTimeout(() => {
      if (hasSpokenGreeting.current) {
        console.log('VoiceAssistant: Greeting already spoken, skipping...');
        return;
      }
      
      hasSpokenGreeting.current = true;
      console.log('VoiceAssistant: Starting greeting message...', greetingMessage);
      
      // Auto-speak greeting and start listening after
      speakMessage(greetingMessage).then(() => {
        console.log('VoiceAssistant: Greeting spoken successfully, starting to listen...');
        // Auto-start listening after greeting is spoken
        if (isContinuousMode.current && !isListeningRef.current) {
          setTimeout(() => {
            if (!isListeningRef.current && recognitionRef.current) {
              console.log('VoiceAssistant: Auto-starting listening after greeting...');
              startListening();
            }
          }, 800);
        }
      }).catch(error => {
        console.error('VoiceAssistant: Error speaking greeting:', error);
        // Even if speaking fails, try to start listening
        setTimeout(() => {
          if (!isListeningRef.current && !isSpeakingRef.current && recognitionRef.current) {
            console.log('VoiceAssistant: Starting listening despite greeting error...');
            startListening();
          }
        }, 1000);
      });
    }, 500);
    
    return () => {
      // Cleanup: stop all audio, recognition, and reset state when component unmounts
      // This only runs when the component is actually unmounting/being removed
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
      // Stop audio
      elevenLabsService.stopAudio();
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (error) {
          // Ignore
        }
      }
    };
  }, []);

  // Update function ref (will be set after handleFinishResponse is defined)
  // We can't use useEffect with handleFinishResponse as dependency since it's recreated on every render
  // Instead, we'll update it in handleFinishResponse itself and in the timeout callbacks

  // Complete cleanup: stop all audio, speech recognition, and clear timeouts
  const cleanupAll = () => {
    console.log('Cleaning up voice assistant - stopping all audio and recognition');
    
    // Mark as stopped to prevent any further operations
    isStoppedRef.current = true;
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort(); // Force abort recognition
      } catch (error) {
        // Ignore errors during cleanup
      }
      isListeningRef.current = false;
      setIsListening(false);
    }
    
    // Stop all audio playback IMMEDIATELY
    // Stop ElevenLabs audio
    elevenLabsService.stopAudio();
    
    // Stop browser TTS IMMEDIATELY
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        // Also stop any pending utterances
        window.speechSynthesis.pause();
      } catch (error) {
        console.warn('Error stopping browser TTS:', error);
      }
    }
    
    // Clear all timeouts
    if (autoFinishTimeoutRef.current) {
      clearTimeout(autoFinishTimeoutRef.current);
      autoFinishTimeoutRef.current = null;
    }
    
    // Reset state IMMEDIATELY
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    isProcessingRef.current = false;
    isContinuousMode.current = false;
  };

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
          
          // Auto-finish after 1 second of silence (when speech ends)
          // Use refs to check state reliably in timeout
          autoFinishTimeoutRef.current = setTimeout(() => {
            const transcript = pendingTranscriptRef.current.trim();
            console.log('Auto-finish timeout triggered. Transcript:', transcript, 'Processing:', isProcessingRef.current, 'Speaking:', isSpeakingRef.current);
            if (transcript.length > 0 && !isProcessingRef.current && !isSpeakingRef.current && handleFinishResponseRef.current) {
              // Use the ref to call the function (avoids closure issues)
              handleFinishResponseRef.current();
            }
          }, 1000); // 1 second of silence before auto-finishing
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

  // Handle finishing response (process pending transcript)
  const handleFinishResponse = async () => {
    console.log('=== handleFinishResponse called ===');
    console.log('pendingTranscriptRef:', pendingTranscriptRef.current);
    console.log('pendingTranscript state:', pendingTranscript);
    console.log('currentTranscript state:', currentTranscript);
    console.log('isProcessing state:', isProcessing, 'ref:', isProcessingRef.current);
    console.log('isSpeaking state:', isSpeaking, 'ref:', isSpeakingRef.current);
    
    // Update ref for use in callbacks (keep it current)
    handleFinishResponseRef.current = handleFinishResponse;
    
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
        const conversationHistory = conversationService.conversationState.conversationHistory;
        setTimeout(() => {
          onComplete(reviewData, conversationHistory);
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
    <>
      {/* Status bar - always visible when component is mounted */}
      <div className="voice-assistant-status-bar">
        <div className="status-bar-content">
          {isListening && (
            <div className="listening-indicator-mini">
              <div className="pulse-ring-mini"></div>
              <span className="listening-text-mini">🎤 Listening...</span>
            </div>
          )}
          {isSpeaking && (
            <span className="status-mini">🎙️ Speaking...</span>
          )}
          {isProcessing && (
            <span className="status-mini">⏳ Processing...</span>
          )}
          {!isListening && !isSpeaking && !isProcessing && (
            <span className="status-mini">Ready</span>
          )}
        </div>
        
        <button
          className="finish-btn-mini"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
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
          ✓ Finish
        </button>
        
        <button
          className="stop-btn-mini"
          onClick={() => {
            cleanupAll();
            onClose();
          }}
          aria-label="Stop conversation"
        >
          Stop
        </button>
      </div>
    </>
  );
}

export default VoiceAssistant;
