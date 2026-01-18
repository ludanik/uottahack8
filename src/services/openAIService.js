// OpenAI API integration service for natural conversation
// Note: This requires an OpenAI API key

import OpenAI from 'openai';

/* =========================
   INTENT + EXTRACTION UTILS
   ========================= */

function classifyIntent(text) {
  const t = text.toLowerCase();

  if (/^(wait|hold on|gimme a sec|one sec|pause)/.test(t)) return "pause";
  if (/(meant|actually|sorry|no i|correction)/.test(t)) return "correction";
  if (/(go back|previous|earlier|wait no its)/.test(t)) return "rewind";
  if (/(don't know|not sure|no idea|can't remember)/.test(t)) return "unknown";

  return "answer";
}

function extractCourse(text) {
  const match = text.match(/[A-Z]{3,4}\s?\d{4}/i);
  return match ? match[0].toUpperCase() : null;
}

/* =========================
   OPENAI SERVICE
   ========================= */

class OpenAIService {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';

    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true
      });
    } else {
      console.warn('OpenAI API key not set.');
      this.client = null;
    }


    // System prompt for the assistant
    this.systemPrompt = `You are a friendly AI voice assistant having a casual conversation with a university student about a course they took.
Your goal is to naturally collect key information to later write a Rate My Prof–style review.

STYLE & TONE
- Sound warm, relaxed, and human — like chatting with a friend
- Keep responses to 1–2 short sentences (voice conversation)
- Ask only ONE question at a time
- Never sound robotic, formal, or scripted
- Acknowledge what the student says before moving on

CONVERSATION CONTROL
You must actively manage the conversation state.

Internally track:
- Which question you are currently on
- What information has already been collected
- What information is missing or unclear

If the student:
- Asks to wait / pause / “gimme a sec”
  → Acknowledge and wait without advancing
- Says “go back”, “can I change that”, or corrects themselves
  → Accept the correction and update the previous answer
- Says “I don’t know”, “not sure”, or “don’t remember”
  → Reassure them and either skip or gently move forward
- Answers the wrong question
  → Acknowledge their answer, then gently restate the current question
- Gives multiple pieces of info at once
  → Accept everything relevant and move to the next missing item
- Goes off-topic
  → Respond briefly, then steer back naturally

Never scold, rush, or repeat questions verbatim unless needed.

DATA EXTRACTION RULES
- Convert casual language into structured values when possible
  (e.g., “pretty hard” → difficulty ≈ 4/5)
- If a rating is unclear, ask a short follow-up for clarification
- Grades are optional — never pressure them
- If they refuse a question, accept it and continue

INFORMATION TO COLLECT (order flexible, adapt naturally):
1. Course name/code
2. Overall rating (1–5 or inferred)
3. Difficulty (1–5 or inferred)
4. General experience / thoughts
5. Took it for credit (yes/no)
6. Attendance requirement
7. Would take again (yes/no/maybe)
8. Grade (optional)
9. Textbook usage

FLOW GUIDANCE
- Start broad, then get specific
- If the student sounds hesitant, reassure and simplify
- If you already have enough detail, do NOT over-question
- When all info is collected, end naturally and thank them

IMPORTANT
This is a spoken conversation.
Short, natural responses only.
Be patient, adaptive, and human.`;
  }

 /* =========================
     MAIN RESPONSE GENERATOR
     ========================= */

     async generateResponse(conversationHistory, currentPhase, collectedData, userResponse) {
      if (!this.client) return null;
  
      /* ---------- INTENT HANDLING (BEFORE MODEL) ---------- */
  
      const intent = classifyIntent(userResponse);
  
      if (intent === "pause") {
        return "No worries — take your time.";
      }
  
      if (intent === "unknown") {
        return "That’s totally fine — we can skip that.";
      }
  
      if (intent === "correction") {
        const newCourse = extractCourse(userResponse);
        if (newCourse) {
          collectedData.course = newCourse;
          currentPhase = "overallRating";
        }
      }
  
      if (intent === "rewind") {
        currentPhase = "initialFeedback";
      }
  
      /* ---------- PHASE AUTO-ADVANCE ---------- */
  
      if (currentPhase === "overallRating" && collectedData.overallRating) {
        currentPhase = "difficulty";
      }
  
      if (currentPhase === "difficulty" && collectedData.difficulty) {
        currentPhase = "detailedFeedback";
      }
  
      /* ---------- SYSTEM MESSAGE ---------- */
  
      let systemContent = `
  ${this.systemPrompt}
  
  CURRENT PHASE: ${currentPhase}
  COLLECTED DATA: ${JSON.stringify(collectedData)}
  `;
  
      const messages = [
        { role: 'system', content: systemContent }
      ];
  
      /* ---------- FULL HISTORY (NO FILTERING) ---------- */
  
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.message
        });
      });
  
      messages.push({ role: 'user', content: userResponse });
  
      /* ---------- OPENAI CALL ---------- */
  
      try {
        const completion = await this.client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 60,
          presence_penalty: 0.6
        });
  
        return completion.choices[0]?.message?.content?.trim() || null;
      } catch (err) {
        console.error('OpenAI error:', err);
        return null;
      }
    }
  
    /* =========================
       PHASE CONTEXT (OPTIONAL)
       ========================= */
  
    getPhaseContext(phase, collectedData) {
      const contexts = {
        greeting: "Greet them and ask how they're doing.",
        initialFeedback: "Ask what course they want to review.",
        overallRating: "Ask for overall rating (1–5).",
        difficulty: "Ask about difficulty (1–5).",
        detailedFeedback: "Ask about their experience.",
        attendance: "Ask about attendance.",
        wouldTakeAgain: "Ask if they'd take it again.",
        grade: "Ask grade (optional).",
        textbook: "Ask about textbook usage.",
        closing: "Thank them."
      };
  
      return contexts[phase] || null;
    }
  
    isConfigured() {
      return !!this.client;
    }
  }
  
  export default new OpenAIService();