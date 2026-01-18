// Conversation service that manages adaptive questioning flow
// Inspired by SurveyMonkey but with natural conversation flow

import openAIService from './openAIService';

export class ConversationService {
  constructor() {
    this.conversationState = {
      currentPhase: 'greeting',
      collectedData: {},
      askedQuestions: new Set(),
      conversationHistory: []
    };
    
    // Lecture experience feedback flow - focused on immediate post-lecture feedback
    this.questionFlow = {
      greeting: {
        message: "Hey there! So you just finished a lecture, how did it go?",
        nextPhase: 'courseCode'
      },
      courseCode: {
        message: "Great! What course code was this lecture for?",
        extractField: 'courseCode',
        nextPhase: 'lectureTopics'
      },
      lectureTopics: {
        message: "Sounds about right, what topics were covered?",
        extractField: 'lectureTopics',
        nextPhase: 'difficulty'
      },
      difficulty: {
        message: "That sounds like alot, On a scale of 1 to 5, how difficult was this lecture? Just give me a number between 1 and 5.",
        extractField: 'difficulty',
        nextPhase: 'easyHard'
      },
      easyHard: {
        message: "Thanks! What did you find easy to understand, and what was the hardest part to grasp?",
        extractField: 'easyHard',
        nextPhase: 'professorFeedback'
      },
      professorFeedback: {
        message: "That's really helpful! What did the professor do well in this lecture, and what could they have done better?",
        extractField: 'professorFeedback',
        nextPhase: 'closing'
      },
      closing: {
        message: "Seems like you know your stuff! Thanks for the insight, your input is gonna help make lectures better for everyone. See you around!",
        nextPhase: 'complete'
      }
    };

    // Adaptive follow-ups based on sentiment
    this.followUpQuestions = {
      positive: [
        "That's great to hear! What specifically made it so good?",
        "Love it! What would you say were the highlights?",
        "Awesome! Can you tell me more about what you enjoyed most?"
      ],
      negative: [
        "I understand. Can you help me understand what made it challenging?",
        "That's tough. What do you think could have been improved?",
        "Got it. Was it the material, the teaching style, or something else?"
      ],
      neutral: [
        "Fair enough. Can you elaborate on what you mean?",
        "Tell me more about that aspect.",
        "What specifically made you feel that way?"
      ]
    };
  }

  // Get current question based on phase
  getCurrentMessage() {
    const phase = this.questionFlow[this.conversationState.currentPhase];
    return phase ? phase.message : "Thank you for your feedback!";
  }

  // Check if response indicates user needs time or doesn't know
  isIrregularResponse(response) {
    const lowerResponse = response.toLowerCase().trim();
    
    // Check for explicit time requests
    const timeRequests = ['gimme a second', 'give me a second', 'hold on', 'wait', 'one sec', 'one second', 'just a moment'];
    if (timeRequests.some(pattern => lowerResponse.includes(pattern))) {
      return true;
    }
    
    // Check for uncertainty/don't know responses (but only if it's a short response)
    if (lowerResponse.length < 40) {
      const uncertaintyPatterns = [
        "i don't know", "i don't remember", "idk", "don't know", "don't remember",
        'not sure', 'not really sure', "i'm not sure", "i'm not really sure"
      ];
      if (uncertaintyPatterns.some(pattern => lowerResponse.includes(pattern))) {
        return true;
      }
    }
    
    return false;
  }

  // Process user response and extract data (now async for OpenAI integration)
  async processResponse(userResponse) {
    const lowerResponse = userResponse.toLowerCase().trim();
    const currentPhase = this.conversationState.currentPhase;
    const phaseConfig = this.questionFlow[currentPhase];
    
    // Add to conversation history
    this.conversationState.conversationHistory.push({
      type: 'user',
      message: userResponse,
      phase: currentPhase
    });

    // Check if user wants to end conversation (bye, goodbye, etc.)
    const goodbyePhrases = ['bye', 'goodbye', 'see you', 'see ya', 'later', 'that\'s all', 'that\'s it', 'i\'m done', 'done'];
    const wantsToEnd = goodbyePhrases.some(phrase => lowerResponse.includes(phrase));
    
    if (wantsToEnd && currentPhase !== 'closing' && currentPhase !== 'complete') {
      // User wants to end - move to closing phase
      this.conversationState.currentPhase = 'closing';
      const closingConfig = this.questionFlow.closing;
      const closingMessage = closingConfig?.message || "Thanks for sharing your feedback! Have a great day!";
      
      this.conversationState.conversationHistory.push({
        type: 'assistant',
        message: closingMessage,
        phase: 'closing'
      });
      
      // Move to complete phase
      this.conversationState.currentPhase = 'complete';
      
      return {
        assistantMessage: closingMessage,
        phase: 'complete',
        collectedData: { ...this.conversationState.collectedData },
        isComplete: true
      };
    }

    // If conversation is already in closing or complete phase, conversation is done - no more responses
    if (currentPhase === 'closing' || currentPhase === 'complete') {
      // Conversation is already complete - don't send any more messages
      this.conversationState.currentPhase = 'complete';
      
      return {
        assistantMessage: null,
        phase: 'complete',
        collectedData: { ...this.conversationState.collectedData },
        isComplete: true
      };
    }
    
    // Handle irregular responses (user needs time, doesn't know, etc.)
    if (this.isIrregularResponse(userResponse)) {
      let assistantMessage = null;
      
      // Try OpenAI for natural response to irregular input
      if (openAIService.isConfigured()) {
        assistantMessage = await openAIService.generateResponse(
          this.conversationState.conversationHistory,
          currentPhase, // Stay on current phase
          this.conversationState.collectedData,
          userResponse
        );
      }
      
      // Check if it's a time request (needs time) or uncertainty (doesn't know)
      const isTimeRequest = lowerResponse.includes('second') || 
                           lowerResponse.includes('wait') || 
                           lowerResponse.includes('hold') ||
                           lowerResponse.includes('moment');
      
      const isUncertainty = lowerResponse.includes("don't know") || 
                           lowerResponse.includes("not sure") || 
                           lowerResponse.includes("don't remember") ||
                           lowerResponse.includes("idk");
      
      // Fallback to friendly predefined responses
      if (!assistantMessage) {
        if (isTimeRequest) {
          // For time requests, acknowledge and wait - stay on same phase
          assistantMessage = "No problem, I'll give you a second! Just let me know when you're ready.";
        } else if (isUncertainty) {
          // For uncertainty, be understanding and move on
          assistantMessage = "That's totally okay! No worries if you're not sure. Let me know when you remember, or we can skip this one.";
        } else {
          assistantMessage = "No worries! " + (phaseConfig?.message || this.getCurrentMessage());
        }
      }
      
      // Handle time requests - stay on same phase and wait
      if (isTimeRequest) {
        // Don't move forward, just acknowledge and wait for next response
        // Phase stays the same
        this.conversationState.conversationHistory.push({
          type: 'assistant',
          message: assistantMessage,
          phase: currentPhase // Stay on current phase
        });
        
        return {
          assistantMessage,
          phase: currentPhase, // Return current phase (not moving forward)
          collectedData: { ...this.conversationState.collectedData },
          isComplete: false
        };
      }
      
      // Handle uncertainty - skip this field and move forward
      if (isUncertainty) {
        // Skip extracting data for this field, but move to next phase
        let nextPhase = phaseConfig?.nextPhase || 'complete';
        
        // Skip grade question check (removed courseStatus question)
        
        this.conversationState.currentPhase = nextPhase;
        
        // If we've moved to closing, use closing message
        if (nextPhase === 'closing' || nextPhase === 'complete') {
          const closingConfig = this.questionFlow.closing;
          assistantMessage = closingConfig?.message || "Thanks for sharing what you could!";
        } else {
          // Otherwise, move to next question
          assistantMessage = "That's totally okay! " + (this.getCurrentMessage() || "Let's continue.");
        }
      }
      
      this.conversationState.conversationHistory.push({
        type: 'assistant',
        message: assistantMessage,
        phase: this.conversationState.currentPhase
      });
      
      return {
        assistantMessage,
        phase: this.conversationState.currentPhase,
        collectedData: { ...this.conversationState.collectedData },
        isComplete: this.conversationState.currentPhase === 'complete'
      };
    }

    // Handle adaptive_followup phase - should continue collecting comment and then move forward
    if (currentPhase === 'adaptive_followup') {
      // Collect additional feedback
      this.conversationState.collectedData.comment = 
        (this.conversationState.collectedData.comment || '') + ' ' + userResponse;
      
      // Move to next phase (additionalQuestions)
      const nextPhase = 'additionalQuestions';
      this.conversationState.currentPhase = nextPhase;
      const nextPhaseConfig = this.questionFlow[nextPhase];
      
      let assistantMessage = null;
      if (openAIService.isConfigured()) {
        assistantMessage = await openAIService.generateResponse(
          this.conversationState.conversationHistory,
          nextPhase,
          this.conversationState.collectedData,
          userResponse
        );
      }
      
      if (!assistantMessage) {
        assistantMessage = nextPhaseConfig?.message || this.getCurrentMessage();
      }
      
      this.conversationState.conversationHistory.push({
        type: 'assistant',
        message: assistantMessage,
        phase: nextPhase
      });

      return {
        assistantMessage,
        phase: nextPhase,
        collectedData: { ...this.conversationState.collectedData },
        isComplete: false
      };
    }

    // Extract data based on current phase
    if (phaseConfig && phaseConfig.extractField) {
      const extractedValue = this.extractFieldValue(userResponse, phaseConfig.extractField);
      console.log(`Extraction for ${phaseConfig.extractField}:`, extractedValue, 'from response:', userResponse);
      
      if (extractedValue !== null) {
        this.conversationState.collectedData[phaseConfig.extractField] = extractedValue;
        console.log(`Successfully stored ${phaseConfig.extractField}:`, extractedValue);
      } else if (phaseConfig.extractField === 'difficulty') {
        // Light clarification: only ask once if we don't have difficulty yet
        // Track if we've already asked for clarification to avoid loops
        const hasAskedForClarification = this.conversationState.collectedData._difficultyClarificationAsked || false;
        
        if (!this.conversationState.collectedData.difficulty && !hasAskedForClarification) {
          console.log('Difficulty extraction failed, asking for clarification (first time only)');
          
          // Mark that we've asked for clarification
          this.conversationState.collectedData._difficultyClarificationAsked = true;
          
          // Light, friendly clarification - just once
          const clarificationMessage = "Could you give me a number between 1 and 5?";
          
          this.conversationState.conversationHistory.push({
            type: 'assistant',
            message: clarificationMessage,
            phase: currentPhase // Stay on same phase
          });
          
          return {
            assistantMessage: clarificationMessage,
            phase: currentPhase, // Don't move forward - stay on same question
            collectedData: { ...this.conversationState.collectedData },
            isComplete: false
          };
        } else {
          // If we've already asked or still can't extract, just move forward with null/default
          // Don't get stuck in a loop - accept that we couldn't extract and continue
          console.log('Difficulty extraction failed but moving forward to avoid loop');
          this.conversationState.collectedData.difficulty = null; // Explicitly set to null
        }
      }
    }

    // Determine if we should ask follow-up questions or move forward
    const sentiment = this.detectSentiment(userResponse);
    
    // Check if we should add adaptive follow-up for detailed feedback
    if (currentPhase === 'detailedFeedback' && sentiment !== 'neutral' && 
        !this.conversationState.collectedData.commentExpanded) {
      this.conversationState.collectedData.comment = 
        (this.conversationState.collectedData.comment || '') + ' ' + userResponse;
      this.conversationState.collectedData.commentExpanded = true;
      
      // Try to get OpenAI response, fallback to predefined follow-ups
      let followUp = null;
      if (openAIService.isConfigured()) {
        followUp = await openAIService.generateResponse(
          this.conversationState.conversationHistory,
          'adaptive_followup',
          this.conversationState.collectedData,
          userResponse
        );
      }
      
      if (!followUp) {
        const followUps = this.followUpQuestions[sentiment] || this.followUpQuestions.neutral;
        followUp = followUps[Math.floor(Math.random() * followUps.length)];
      }
      
      // Set phase to adaptive_followup so next response knows where we are
      this.conversationState.currentPhase = 'adaptive_followup';
      
      this.conversationState.conversationHistory.push({
        type: 'assistant',
        message: followUp,
        phase: 'adaptive_followup'
      });
      
      return {
        assistantMessage: followUp,
        phase: 'adaptive_followup',
        collectedData: { ...this.conversationState.collectedData },
        isComplete: false
      };
    }

    // Move to next phase
    let nextPhase = phaseConfig?.nextPhase || 'complete';
    
    // Note: courseStatus question removed - grade question will always be asked
    
    // If next phase is 'closing', get closing message and mark as complete immediately (no waiting for response)
    if (nextPhase === 'closing') {
      const closingConfig = this.questionFlow.closing;
      const closingMessage = closingConfig?.message || "Thank you for your feedback!";
      
      // Set phase to complete immediately - conversation ends after this message
      this.conversationState.currentPhase = 'complete';
      
      this.conversationState.conversationHistory.push({
        type: 'assistant',
        message: closingMessage,
        phase: 'complete'
      });
      
      return {
        assistantMessage: closingMessage,
        phase: 'complete',
        collectedData: { ...this.conversationState.collectedData },
        isComplete: true
      };
    }
    
    // Update phase BEFORE generating response so context is correct
    this.conversationState.currentPhase = nextPhase;
    
    // Debug: Log phase transition
    console.log(`Phase transition: ${currentPhase} -> ${nextPhase}, collectedData:`, this.conversationState.collectedData);
    
    // Try to get OpenAI response for natural conversation
    let assistantMessage = null;
    if (openAIService.isConfigured() && nextPhase !== 'complete') {
      assistantMessage = await openAIService.generateResponse(
        this.conversationState.conversationHistory,
        nextPhase,
        this.conversationState.collectedData,
        userResponse
      );
    }
    
    // Fallback to predefined message if OpenAI is not available or fails
    if (!assistantMessage && nextPhase !== 'complete' && nextPhase !== 'closing') {
      // Get message for the NEW phase (already updated above)
      assistantMessage = this.getCurrentMessage();
    } else if (!assistantMessage && (nextPhase === 'complete' || nextPhase === 'closing')) {
      // If moving to closing, get closing message and mark as complete immediately
      const closingConfig = this.questionFlow.closing;
      assistantMessage = closingConfig?.message || "Thank you for your feedback!";
      // Set phase to complete immediately - conversation ends after this message
      this.conversationState.currentPhase = 'complete';
      nextPhase = 'complete';
    }
    
    this.conversationState.conversationHistory.push({
      type: 'assistant',
      message: assistantMessage,
      phase: nextPhase
    });

    // If we just delivered the closing message, mark as complete immediately
    const isComplete = nextPhase === 'complete' || (nextPhase === 'closing' && assistantMessage);

    return {
      assistantMessage,
      phase: isComplete ? 'complete' : nextPhase,
      collectedData: { ...this.conversationState.collectedData },
      isComplete: isComplete
    };
  }

  // Extract structured data from natural language
  extractFieldValue(response, field) {
    const lowerResponse = response.toLowerCase();
    
    switch (field) {
      case 'quality':
        // Extract rating from 1-5
        const qualityMatch = response.match(/([1-5])\s*(?:out of 5|star|point)?/i) || 
                            response.match(/(?:rate|rating|give).*?([1-5])/i);
        if (qualityMatch) return parseFloat(qualityMatch[1]);
        // Sentiment-based estimation
        if (lowerResponse.includes('excellent') || lowerResponse.includes('amazing') || lowerResponse.includes('perfect')) return 5;
        if (lowerResponse.includes('great') || lowerResponse.includes('really good')) return 4;
        if (lowerResponse.includes('good') || lowerResponse.includes('pretty good')) return 3.5;
        if (lowerResponse.includes('okay') || lowerResponse.includes('alright') || lowerResponse.includes('fine')) return 3;
        if (lowerResponse.includes('not great') || lowerResponse.includes('could be better')) return 2.5;
        if (lowerResponse.includes('bad') || lowerResponse.includes('terrible') || lowerResponse.includes('awful')) return 2;
        return null;
        
      case 'difficulty':
        // Only accept numeric values 1-5 for lecture difficulty
        // First try to match word numbers (one, two, three, four, five)
        const wordToNumber = {
          'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          '1': 1, '2': 2, '3': 3, '4': 4, '5': 5
        };
        
        // Check for word numbers (more flexible matching)
        for (const [word, num] of Object.entries(wordToNumber)) {
          // Match word as whole word or standalone digit
          const wordRegex = new RegExp(`(?:^|\\s|\\b)${word}(?:\\s|$|\\b)`, 'i');
          if (wordRegex.test(response)) {
            console.log(`Matched word number: ${word} -> ${num}`);
            return num;
          }
        }
        
        // Then try regex patterns for numeric values (more comprehensive)
        const difficultyPatterns = [
          /\b([1-5])\s*(?:out of 5|star|stars|point|points|rating|rate)/i,
          /(?:rating|rate|give|give it|i'd give|i give|difficulty|difficult|was|is).*?([1-5])/i,
          /(?:^|\s|it's|it was|maybe|probably|about|around|like|say|think|guess).*?([1-5])(?:\s|$|out|star|point)/i,
          /\b([1-5])\b/  // Standalone number 1-5 (most permissive, check last)
        ];
        
        for (const pattern of difficultyPatterns) {
          const match = response.match(pattern);
          if (match) {
            const num = parseFloat(match[1] || match[0]);
            if (num >= 1 && num <= 5 && !isNaN(num)) {
              console.log(`Matched pattern, extracted: ${num}`);
              return num;
            }
          }
        }
        
        console.log('No difficulty pattern matched');
        // Only accept numeric 1-5 - no sentiment-based fallback for lecture difficulty
        return null;
        
      case 'courseCode':
        // Extract course code (e.g., EECS3101, CS 3101, etc.)
        const courseCodeMatch1 = response.match(/([A-Z]{2,6}[\s-]?\d{4}[A-Z]?)/i);
        if (courseCodeMatch1) {
          return courseCodeMatch1[1].replace(/[\s-]+/g, '').toUpperCase();
        }
        
        // Try to extract course code from common patterns
        let cleaned1 = response.trim()
          .replace(/\b(it'?s|it was|the|a|an|this|that|course|class|lecture)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // If it looks like a course code/number pattern (letters followed by numbers)
        const codePattern1 = /([A-Z]{2,}\s*\d+[A-Z]?)/i;
        const foundCode1 = cleaned1.match(codePattern1);
        if (foundCode1) {
          return foundCode1[1].replace(/\s+/g, '').toUpperCase();
        }
        
        // If response is too long, try to extract just the course identifier
        if (cleaned1.length > 20) {
          const longCodeMatch1 = cleaned1.match(/([A-Z]{2,}\s*\d{3,}[A-Z]?)/i);
          if (longCodeMatch1) {
            return longCodeMatch1[1].replace(/\s+/g, '').toUpperCase();
          }
          const words = cleaned1.split(/\s+/);
          return words.slice(0, 3).join(' ').trim();
        }
        
        return cleaned1.substring(0, 30).trim() || 'Unknown';
        
      case 'lectureTopics':
        // Extract lecture topics - just return the full response
        return response.trim();
        
      case 'easyHard':
        // Extract what was easy/hardest to understand - just return the full response
        return response.trim();
        
      case 'professorFeedback':
        // Extract professor feedback - just return the full response
        return response.trim();
        
      case 'comment':
        return response.trim();
        
      case 'courseStatus':
        // Extract whether course is currently taking or completed
        if (lowerResponse.includes('currently taking') || 
            lowerResponse.includes('taking now') || 
            lowerResponse.includes('taking it') ||
            lowerResponse.includes('in progress') ||
            lowerResponse.includes('still taking') ||
            lowerResponse.includes('currently in')) {
          return 'currently_taking';
        }
        if (lowerResponse.includes('completed') || 
            lowerResponse.includes('finished') || 
            lowerResponse.includes('done') ||
            lowerResponse.includes('already completed') ||
            lowerResponse.includes('took it') ||
            lowerResponse.includes('took the course') ||
            lowerResponse.includes('already took')) {
          return 'completed';
        }
        // Default to completed if unclear (assume they finished it)
        return 'completed';
        
      case 'forCredit':
        if (lowerResponse.includes('yes') || lowerResponse.includes('yeah') || lowerResponse.includes('yep') || 
            lowerResponse.includes('for credit') || lowerResponse.includes('course credit')) return true;
        if (lowerResponse.includes('no') || lowerResponse.includes('nope') || 
            lowerResponse.includes('not for credit') || lowerResponse.includes('audit')) return false;
        return null;
        
      case 'attendance':
        // Normalize to Yes/No/N/A format
        // "Yes" = mandatory/required
        if (lowerResponse.includes('mandatory') || lowerResponse.includes('required') || 
            lowerResponse.includes('must attend') || lowerResponse.includes('must go') ||
            lowerResponse.includes('not optional') || lowerResponse.includes('had to attend') ||
            lowerResponse.includes('attendance required') || lowerResponse.includes('required attendance')) {
          return 'Yes';
        }
        // "No" = optional/not required
        if (lowerResponse.includes('optional') || lowerResponse.includes('not required') || 
            lowerResponse.includes("didn't have to") || lowerResponse.includes("did not have to") ||
            lowerResponse.includes('not mandatory') || lowerResponse.includes('no requirement') ||
            lowerResponse.includes('was optional')) {
          return 'No';
        }
        // Check for explicit yes/no responses
        if (lowerResponse.match(/^\s*(yes|yeah|yep|yup|sure|definitely|absolutely)\s*$/i)) {
          return 'Yes';
        }
        if (lowerResponse.match(/^\s*(no|nope|nah)\s*$/i)) {
          return 'No';
        }
        // If unclear or user didn't answer properly, return N/A
        return 'N/A';
        
      case 'wouldTakeAgain':
        if (lowerResponse.includes('yes') || lowerResponse.includes('yeah') || lowerResponse.includes('definitely') || 
            lowerResponse.includes('absolutely') || lowerResponse.includes('for sure')) return true;
        if (lowerResponse.includes('no') || lowerResponse.includes('nope') || lowerResponse.includes('never')) return false;
        return null;
        
      case 'grade':
        // Valid grades: A, B, C, D, F only (all flat - no + or - modifiers)
        // Extract grade pattern - match letter grades and strip any modifiers
        // Match patterns like: "A+", "B-", "got an A", "I got a B-", "A plus", "B minus"
        // F can never have modifiers (F+ or F- is invalid), all other grades stored flat
        const gradeMatch = response.match(/\b([A-F])(\s*[+-]|\s+(?:plus|minus))?\b/i);
        if (gradeMatch) {
          let letter = gradeMatch[1].toUpperCase();
          let modifier = gradeMatch[2];
          
          // F can never have modifiers - only flat F
          if (letter === 'F') {
            if (modifier) {
              // F+ or F- is invalid - return N/A
              return 'N/A';
            }
            return 'F';
          }
          
          // E is invalid (grades go F, D, C, B, A)
          if (letter === 'E') {
            return 'N/A';
          }
          
          // A, B, C, D - strip modifiers and return flat letter only
          if (['A', 'B', 'C', 'D'].includes(letter)) {
            // Return just the letter (no modifiers), even if user said A+ or B-
            return letter;
          }
        }
        
        // Check for "I don't know", "don't remember", etc. - these should be N/A
        if (lowerResponse.includes("don't know") || 
            lowerResponse.includes("don't remember") ||
            lowerResponse.includes("didn't get") ||
            lowerResponse.includes("not sure") ||
            lowerResponse.includes("no grade") ||
            lowerResponse.includes("haven't received")) {
          return 'N/A';
        }
        
        // If no valid grade found, return N/A
        return 'N/A';
        
      case 'textbook':
        if (lowerResponse.includes('yes') || lowerResponse.includes('yeah') || 
            lowerResponse.includes('used a textbook') || lowerResponse.includes('required textbook')) return true;
        if (lowerResponse.includes('no') || lowerResponse.includes('nope') || 
            lowerResponse.includes('no textbook') || lowerResponse.includes("didn't need")) return false;
        return null;
        
      default:
        return response.trim();
    }
  }

  // Detect sentiment from response
  detectSentiment(response) {
    const lowerResponse = response.toLowerCase();
    const positiveWords = ['great', 'amazing', 'excellent', 'love', 'awesome', 'perfect', 'good', 'enjoyed', 'helpful', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'difficult', 'hard', 'confusing', 'boring', 'worst', 'disappointed'];
    
    const positiveCount = positiveWords.filter(word => lowerResponse.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerResponse.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Get collected data formatted for review
  getCollectedReview() {
    const data = this.conversationState.collectedData;
    
    console.log('getCollectedReview - collectedData:', data);
    console.log('getCollectedReview - difficulty value:', data.difficulty, 'type:', typeof data.difficulty);
    
    // Build tags based on collected data for lecture experience
    const tags = [];
    if (data.difficulty && typeof data.difficulty === 'number' && data.difficulty >= 4) tags.push('CHALLENGING LECTURE');
    if (data.difficulty && typeof data.difficulty === 'number' && data.difficulty <= 2) tags.push('EASY TO FOLLOW');
    if (data.professorFeedback && data.professorFeedback.toLowerCase().includes('well')) tags.push('GREAT PROFESSOR');
    if (data.professorFeedback && (data.professorFeedback.toLowerCase().includes('better') || data.professorFeedback.toLowerCase().includes('improve'))) tags.push('ROOM FOR IMPROVEMENT');
    
    const reviewData = {
      courseCode: data.courseCode || 'Unknown',
      lectureTopics: data.lectureTopics || '',
      difficulty: (typeof data.difficulty === 'number' && !isNaN(data.difficulty)) ? data.difficulty : null,
      easyHard: data.easyHard || '',
      professorFeedback: data.professorFeedback || '',
      tags: tags.slice(0, 5) // Limit to 5 tags
    };
    
    console.log('getCollectedReview - returning:', reviewData);
    return reviewData;
  }

  // Reset conversation
  reset() {
    this.conversationState = {
      currentPhase: 'greeting',
      collectedData: {},
      askedQuestions: new Set(),
      conversationHistory: []
    };
  }
}

export default ConversationService;
