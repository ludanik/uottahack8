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
    
    // Core questions to cover (SurveyMonkey style)
    this.questionFlow = {
      greeting: {
        message: "Hey! Thanks for taking a moment to share your feedback about the lecture. How are you doing today?",
        nextPhase: 'initialFeedback'
      },
      initialFeedback: {
        message: "Great! Let's start - can you tell me what course you're reviewing?",
        extractField: 'course',
        nextPhase: 'overallRating'
      },
      overallRating: {
        message: "Got it! On a scale of 1 to 5, how would you rate your overall experience with this course? Just say a number or describe it in your own words.",
        extractField: 'quality',
        nextPhase: 'difficulty'
      },
      difficulty: {
        message: "And how difficult would you say this course is? Again, 1 to 5, or just tell me how challenging you found it.",
        extractField: 'difficulty',
        nextPhase: 'detailedFeedback'
      },
      detailedFeedback: {
        message: "Perfect. Can you tell me more about what stood out to you? Maybe the teaching style, the material, or something specific about the lectures?",
        extractField: 'comment',
        nextPhase: 'additionalQuestions'
      },
      additionalQuestions: {
        message: "Thanks for sharing! A few quick questions: Did you take this course for credit?",
        extractField: 'forCredit',
        nextPhase: 'attendance'
      },
      attendance: {
        message: "What about attendance - was it mandatory or optional?",
        extractField: 'attendance',
        nextPhase: 'wouldTakeAgain'
      },
      wouldTakeAgain: {
        message: "Got it. Would you take this course again if given the chance?",
        extractField: 'wouldTakeAgain',
        nextPhase: 'grade'
      },
      grade: {
        message: "And what grade did you get, if you don't mind sharing?",
        extractField: 'grade',
        nextPhase: 'textbook'
      },
      textbook: {
        message: "One last thing - did you need to use a textbook for this course?",
        extractField: 'textbook',
        nextPhase: 'closing'
      },
      closing: {
        message: "Awesome! That's everything I needed. Your feedback has been saved and will help other students make informed decisions. Thanks again!",
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

  // Process user response and extract data (now async for OpenAI integration)
  async processResponse(userResponse) {
    const lowerResponse = userResponse.toLowerCase();
    const currentPhase = this.conversationState.currentPhase;
    const phaseConfig = this.questionFlow[currentPhase];
    
    // Add to conversation history
    this.conversationState.conversationHistory.push({
      type: 'user',
      message: userResponse,
      phase: currentPhase
    });

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
      if (extractedValue !== null) {
        this.conversationState.collectedData[phaseConfig.extractField] = extractedValue;
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
    
    // Update phase BEFORE generating response so context is correct
    this.conversationState.currentPhase = nextPhase;
    
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
    if (!assistantMessage && nextPhase !== 'complete') {
      // Get message for the NEW phase (already updated above)
      assistantMessage = this.getCurrentMessage();
    } else if (!assistantMessage && nextPhase === 'complete') {
      const closingConfig = this.questionFlow.closing;
      assistantMessage = closingConfig?.message || "Thank you for your feedback!";
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
      isComplete: nextPhase === 'complete'
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
        const difficultyMatch = response.match(/([1-5])\s*(?:out of 5|star|point)?/i);
        if (difficultyMatch) return parseFloat(difficultyMatch[1]);
        if (lowerResponse.includes('very easy') || lowerResponse.includes('super easy')) return 1;
        if (lowerResponse.includes('easy') || lowerResponse.includes('not hard')) return 2;
        if (lowerResponse.includes('moderate') || lowerResponse.includes('medium')) return 3;
        if (lowerResponse.includes('difficult') || lowerResponse.includes('hard') || lowerResponse.includes('challenging')) return 4;
        if (lowerResponse.includes('very hard') || lowerResponse.includes('extremely difficult') || lowerResponse.includes('brutal')) return 5;
        return null;
        
      case 'course':
        // Extract course code (e.g., EECS3101, CS 3101, etc.)
        // Try to match standard course code patterns first
        const courseCodeMatch = response.match(/([A-Z]{2,6}[\s-]?\d{4}[A-Z]?)/i);
        if (courseCodeMatch) {
          return courseCodeMatch[1].replace(/[\s-]+/g, '').toUpperCase();
        }
        
        // Try to extract course name or code from common patterns
        // Remove common filler words
        let cleaned = response.trim()
          .replace(/\b(it'?s|it was|the|a|an|this|that|course|class)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // If it looks like a course code/number pattern (letters followed by numbers)
        const codePattern = /([A-Z]{2,}\s*\d+[A-Z]?)/i;
        const foundCode = cleaned.match(codePattern);
        if (foundCode) {
          return foundCode[1].replace(/\s+/g, '').toUpperCase();
        }
        
        // If response is too long, try to extract just the course identifier
        if (cleaned.length > 20) {
          // Try to find a course code in the middle/end
          const longCodeMatch = cleaned.match(/([A-Z]{2,}\s*\d{3,}[A-Z]?)/i);
          if (longCodeMatch) {
            return longCodeMatch[1].replace(/\s+/g, '').toUpperCase();
          }
          // Otherwise take first few words
          const words = cleaned.split(/\s+/);
          return words.slice(0, 3).join(' ').trim();
        }
        
        // Return cleaned response (first 20 chars max to avoid too long names)
        return cleaned.substring(0, 30).trim() || 'Unknown';
        
      case 'comment':
        return response.trim();
        
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
        // Extract grade (A+, A, A-, B+, B, etc.)
        const gradeMatch = response.match(/\b([A-F][+-]?)\b/i);
        if (gradeMatch) return gradeMatch[1].toUpperCase();
        return response.trim();
        
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
    
    // Build tags based on collected data
    const tags = [];
    if (data.quality >= 4.5) tags.push('AMAZING LECTURES');
    if (data.difficulty >= 4) tags.push('GET READY TO READ', 'TOUGH GRADER');
    if (data.attendance === 'Yes') tags.push("SKIP CLASS? YOU WON'T PASS.");
    if (data.difficulty <= 2) tags.push('EASY A');
    if (data.wouldTakeAgain === true) tags.push('WOULD TAKE AGAIN');
    
    return {
      course: data.course || 'Unknown',
      quality: data.quality || 3.0,
      difficulty: data.difficulty || 3.0,
      forCredit: data.forCredit ?? null,
      attendance: data.attendance || null,
      wouldTakeAgain: data.wouldTakeAgain ?? null,
      grade: data.grade || null,
      textbook: data.textbook ?? null,
      comment: data.comment || '',
      tags: tags.slice(0, 5) // Limit to 5 tags
    };
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
