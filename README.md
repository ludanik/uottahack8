# Voice Feedback Assistant - Rate My Prof Style

An AI voice assistant that talks to students after lectures and turns their feedback into public reviews. Students speak naturally about their experience, and the AI automatically extracts ratings and insights to help other students choose courses.

**Built with:** React, OpenAI (conversation AI), ElevenLabs (voice), Web Speech API (voice input)

**Solves:** Low survey completion rates by making feedback feel like talking to a friend instead of filling out a form.

## Features

- 🎤 **Voice-to-Voice Interaction**: Natural conversation using OpenAI for intelligent responses and ElevenLabs API for realistic voice synthesis
- 💬 **Adaptive Conversation Flow**: AI-powered questioning that adapts to student responses using OpenAI GPT (SurveyMonkey-style structure, natural conversation)
- 🎯 **Automatic Data Extraction**: Extracts structured ratings, course info, and feedback from natural language
- ⭐ **Rate My Prof Integration**: Automatically formats and uploads reviews to the Rate My Prof style feed
- 📱 **Easy to Use**: Type or speak your responses - works with or without voice input

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up API Keys:**
   - **OpenAI API Key (Recommended for natural conversation):**
     - Get your API key from [OpenAI](https://platform.openai.com/api-keys)
     - Add to your `.env` file:
       ```
       REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
       ```
   
   - **ElevenLabs API Key (Recommended for better voice quality):**
     - Get your API key from [ElevenLabs](https://elevenlabs.io/app/settings/api-keys)
     - Add to your `.env` file:
       ```
       REACT_APP_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
       ```
   
   - Create a `.env` file in the root directory with both keys:
     ```
     REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
     REACT_APP_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
     ```
   
   - **Note:** 
     - The app will work without OpenAI (falls back to predefined responses), but OpenAI provides much more natural, adaptive conversations
     - The app will work without ElevenLabs (falls back to browser's text-to-speech), but ElevenLabs provides much better voice quality

3. **Run the development server:**
   ```bash
   npm start
   ```

## How It Works

1. Students click "Add Review" button
2. Voice assistant opens and greets the student
3. Natural conversation collects:
   - Course name/code
   - Overall rating (1-5)
   - Difficulty level (1-5)
   - Detailed feedback
   - Additional metadata (attendance, grade, textbook usage, etc.)
4. AI adapts follow-up questions based on sentiment
5. Review is automatically formatted and added to the feed

## Conversation Flow

The assistant follows a SurveyMonkey-inspired structure but feels natural:
- Greeting & rapport building
- Course identification
- Rating collection (with sentiment analysis)
- Detailed feedback (with adaptive follow-ups)
- Additional questions (forCredit, attendance, grade, etc.)
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
   - Falls back gracefully if either API is unavailable

## Future Enhancements

- Backend API integration for persistent storage
- Analytics dashboard for professors
- Multi-language support
- Sentiment analysis improvements
- Integration with university course catalogs
