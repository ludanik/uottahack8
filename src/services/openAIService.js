// OpenAI API integration service for natural conversation
// Note: This requires an OpenAI API key

import OpenAI from 'openai';

class OpenAIService {
  constructor() {
    // Get API key from environment variable
    // For production, use: process.env.REACT_APP_OPENAI_API_KEY
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
    } else {
      console.warn('OpenAI API key not set. AI conversation features will be limited.');
      this.client = null;
    }

    // System prompt for the assistant
    this.systemPrompt = `You are a friendly voice assistant helping students provide feedback about their courses and professors. Your goal is to have a natural, conversational flow while collecting structured information.

Guidelines:
- Be warm, friendly, and conversational - like talking to a friend
- Keep responses brief (1-2 sentences maximum) - this is a voice conversation
- Ask one question at a time
- Adapt your follow-up questions based on what the student says
- Don't be robotic or overly formal
- If a student gives you information, acknowledge it naturally before moving on
- If you need to collect specific data, work it into the conversation naturally
- Handle irregular responses naturally:
  * If they say "gimme a second", "hold on", "wait" - acknowledge and wait (e.g., "No problem, take your time!")
  * If they say "I don't know", "not sure", "don't remember" - be understanding and offer to skip or move on (e.g., "That's okay! No worries if you're not sure.")
  * If they're hesitant or uncertain, reassure them and either re-ask gently or move forward
- Always stay friendly and patient, never pushy

Information you should try to collect:
1. Course name/code
2. Overall rating (1-5 scale, or extract from their words)
3. Difficulty level (1-5 scale)
4. Detailed feedback about their experience
5. Whether they took it for credit
6. Attendance requirements
7. Whether they would take it again
8. Their grade (optional)
9. Textbook usage

Remember: This is a voice conversation, so keep it natural and brief!`;
  }

  // Generate a natural response using OpenAI
  async generateResponse(conversationHistory, currentPhase, collectedData, userResponse) {
    if (!this.client) {
      // Fallback to basic response if no API key
      return null;
    }

    try {
      // Get context about what we need to collect next
      const phaseContext = this.getPhaseContext(currentPhase, collectedData);
      
      // Build system message with prompt and context
      let systemContent = this.systemPrompt;
      if (phaseContext) {
        systemContent += `\n\nCurrent context: ${phaseContext}`;
      }
      
      // Build conversation context - userResponse is already in conversationHistory
      // so we don't need to add it again
      const messages = [
        { role: 'system', content: systemContent }
      ];
      
      // Add conversation history
      const historyToInclude = conversationHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.message
      }));
      
      // Only add userResponse if it's not already the last message in history
      const lastHistoryMsg = conversationHistory[conversationHistory.length - 1];
      if (!lastHistoryMsg || lastHistoryMsg.message !== userResponse) {
        historyToInclude.push({ role: 'user', content: userResponse });
      }
      
      messages.push(...historyToInclude);

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' for faster/cheaper
        messages: messages,
        temperature: 0.7, // Balance between creativity and consistency
        max_tokens: 150, // Keep responses brief for voice
        presence_penalty: 0.6, // Encourage natural conversation
      });

      const response = completion.choices[0]?.message?.content;
      return response ? response.trim() : null;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return null;
    }
  }

  // Get context about what information we're trying to collect
  getPhaseContext(phase, collectedData) {
    const contexts = {
      greeting: "Start by greeting them warmly and asking how they're doing. Then ask what course they want to review.",
      initialFeedback: `We're trying to identify the course. Collected so far: ${JSON.stringify(collectedData)}`,
      overallRating: `We're collecting the overall rating (1-5). Collected so far: ${JSON.stringify(collectedData)}`,
      difficulty: `We're collecting the difficulty level (1-5). Collected so far: ${JSON.stringify(collectedData)}`,
      detailedFeedback: `We're collecting detailed feedback about their experience. Collected so far: ${JSON.stringify(collectedData)}`,
      adaptive_followup: `We're following up on their detailed feedback to get more specifics. Collected so far: ${JSON.stringify(collectedData)}`,
      additionalQuestions: `We're asking if they took it for credit. Collected so far: ${JSON.stringify(collectedData)}`,
      attendance: `We're asking about attendance requirements. Collected so far: ${JSON.stringify(collectedData)}`,
      wouldTakeAgain: `We're asking if they would take the course again. Collected so far: ${JSON.stringify(collectedData)}`,
      grade: `We're asking about their grade (optional). Collected so far: ${JSON.stringify(collectedData)}`,
      textbook: `We're asking about textbook usage. Collected so far: ${JSON.stringify(collectedData)}`,
      closing: "Thank them and let them know their feedback has been saved."
    };

    return contexts[phase] || null;
  }

  // Check if API key is configured
  isConfigured() {
    return !!this.apiKey && !!this.client;
  }
}

export default new OpenAIService();
