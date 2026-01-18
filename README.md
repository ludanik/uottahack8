# Voice Feedback Assistant - Rate My Prof Style

An AI voice assistant that talks to students after lectures and turns their feedback into public reviews. Students speak naturally about their experience, and the AI automatically extracts ratings and insights to help other students choose courses.

**Built with:** React, OpenAI (conversation AI), ElevenLabs (voice), Web Speech API (voice input)

**Solves:** Low survey completion rates by making feedback feel like talking to a friend instead of filling out a form.

View devpost: https://devpost.com/software/righthand

## Features

- **Voice-to-Voice Interaction**: Natural conversation using OpenAI for intelligent responses and ElevenLabs API for realistic voice synthesis
- **Adaptive Conversation Flow**: AI-powered questioning that adapts to student responses using OpenAI GPT (SurveyMonkey-style structure, natural conversation)
- **Automatic Data Extraction**: Extracts structured ratings, course info, and feedback from natural language
- **Rate My Prof Integration**: Automatically formats and uploads reviews to the Rate My Prof style feed
- **Easy to Use**: Speak your responses - works with or without voice input

## How It Works

1. Students click "Add Review" button
2. Voice assistant opens and greets the student
3. Natural conversation collects:
   - Lecture & Course name/code
   - Difficulty level (1-5)
   - Detailed feedback
   - Additional data
4. AI adapts follow-up questions based on response
5. Review is automatically formatted and added to the dashboard

## Conversation Flow

The assistant follows a SurveyMonkey-inspired structure but feels natural:
- Greeting & rapport building
- Course identification
- Rating collection (with analysis)
- Detailed feedback (with adaptive follow-ups)
- Additional questions
- Closing and confirmation

## Tech Stack

- **React** - UI framework
- **OpenAI GPT** - Natural conversation generation and adaptive questioning
- **ElevenLabs API** - Voice synthesis for realistic AI voice responses
- **Web Speech API** - Voice input recognition (browser-native)
- **React Hooks** - State management
- **CSS3** - Styling with animations

## How It Works - Technical Details

1. **Conversation Flow:**
   - OpenAI generates natural, adaptive responses based on conversation history
   - ConversationService manages structured data extraction (ratings, course info, etc.)
   - Responses are passed to ElevenLabs for voice synthesis
   - User can type or speak responses

2. **Data Extraction:**
   - Structured data (ratings, course codes, etc.) is extracted from natural language
   - Works alongside OpenAI for best of both worlds: natural conversation + structured data

3. **Voice Pipeline:**
   - OpenAI generates response text → ElevenLabs converts to speech → Plays to user
