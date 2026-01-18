// ElevenLabs API integration service for voice assistant
// Note: This requires an ElevenLabs API key

class ElevenLabsService {
  constructor() {
    // You'll need to set this via environment variable or config
    // For production, use: process.env.REACT_APP_ELEVENLABS_API_KEY
    this.apiKey = process.env.REACT_APP_ELEVENLABS_API_KEY || '';
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    
    // Default voice ID - Using Mark voice for natural conversation
    // Mark voice ID provided by user: pVnrL6sighQX7hVz89cp
    // CRITICAL: Always use this exact voice ID - do not search by name or override
    this.defaultVoiceId = 'pVnrL6sighQX7hVz89cp';
    
    // Initialize voice cache
    this.voiceCache = null;
    
    // Store currently playing audio to prevent overlapping/echo
    this.currentAudio = null;
    // Flag to track if audio should be stopped
    this.isStopped = false;
    // Store current play promise to cancel it
    this.currentPlayPromise = null;
  }
  
  // Find voice by name (case-insensitive)
  async findVoiceByName(name) {
    if (!this.apiKey) {
      return null;
    }
    
    try {
      // Use cache if available
      if (this.voiceCache) {
        const voice = this.voiceCache.find(v => 
          v.name.toLowerCase().includes(name.toLowerCase())
        );
        if (voice) return voice.voice_id;
      }
      
      // Fetch voices from API
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      this.voiceCache = data.voices || [];
      
      // Search for voice by name
      const voice = this.voiceCache.find(v => 
        v.name.toLowerCase().includes(name.toLowerCase())
      );
      
      if (voice) {
        console.log(`Found voice "${voice.name}" with ID: ${voice.voice_id}`);
        return voice.voice_id;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching voices:', error);
      return null;
    }
  }
  
  // Initialize voice - use the hardcoded Mark voice ID
  async initializeVoice() {
    // DO NOT search for voice by name - always use the hardcoded voice ID
    // This ensures we always use the correct Mark voice: pVnrL6sighQX7hVz89cp
    // Searching by name might find a different voice with the same name
    console.log('Using Mark voice ID (hardcoded):', this.defaultVoiceId);
    
    // Verify voice ID is correct
    if (this.defaultVoiceId !== 'pVnrL6sighQX7hVz89cp') {
      console.error('ERROR: Wrong voice ID detected! Correcting to pVnrL6sighQX7hVz89cp');
      this.defaultVoiceId = 'pVnrL6sighQX7hVz89cp';
    }
  }

  // Convert text to speech using ElevenLabs API
  async textToSpeech(text, voiceId = null) {
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not set. Voice synthesis will be disabled.');
      console.warn('API Key check:', process.env.REACT_APP_ELEVENLABS_API_KEY ? 'Found (length: ' + process.env.REACT_APP_ELEVENLABS_API_KEY.length + ')' : 'Not found');
      return null;
    }

    if (!text || text.trim().length === 0) {
      console.warn('Empty text provided to textToSpeech');
      return null;
    }

    try {
      // Always use the hardcoded Mark voice ID when no voiceId is provided
      let voice = voiceId || this.defaultVoiceId;
      
      // Force correct voice ID if no explicit voiceId provided
      if (!voiceId) {
        voice = 'pVnrL6sighQX7hVz89cp'; // Always use Mark voice
        // Also ensure defaultVoiceId is correct
        if (this.defaultVoiceId !== 'pVnrL6sighQX7hVz89cp') {
          console.error('ERROR: defaultVoiceId was wrong, correcting to pVnrL6sighQX7hVz89cp');
          this.defaultVoiceId = 'pVnrL6sighQX7hVz89cp';
        }
      }
      
      console.log('✓ Using Mark voice ID:', voice);
      console.log('Calling ElevenLabs API with voice:', voice, 'Text length:', text.length);
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2_5', // Updated to use turbo model for better performance
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, response.statusText, errorText);
        
        // Try to parse error as JSON
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('Error details:', errorData);
        } catch (e) {
          // Not JSON, that's okay
        }
        
        return null;
      }

      // Return audio blob
      const audioBlob = await response.blob();
      console.log('ElevenLabs audio blob received, size:', audioBlob.size, 'type:', audioBlob.type);
      
      if (audioBlob.size === 0) {
        console.error('Received empty audio blob from ElevenLabs');
        return null;
      }
      
      return audioBlob;
    } catch (error) {
      console.error('Error calling ElevenLabs API:', error);
      console.error('Error details:', error.message, error.stack);
      return null;
    }
  }

  // Stop any currently playing audio
  stopAudio() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        if (this.currentAudio.src) {
          URL.revokeObjectURL(this.currentAudio.src);
        }
        this.currentAudio = null;
        console.log('Stopped ElevenLabs audio playback');
      } catch (error) {
        console.warn('Error stopping audio:', error);
      }
    }
  }

  // Play audio blob
  playAudio(audioBlob) {
    return new Promise((resolve, reject) => {
      if (!audioBlob) {
        console.error('No audio blob provided to playAudio');
        reject(new Error('No audio blob provided'));
        return;
      }
      
      // Stop any currently playing audio to prevent overlap/echo
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
          if (this.currentAudio.src) {
            URL.revokeObjectURL(this.currentAudio.src);
          }
        } catch (error) {
          console.warn('Error stopping previous audio:', error);
        }
        this.currentAudio = null;
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio; // Store reference to currently playing audio
      
      // Add error handling
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        console.error('Audio error details:', {
          error: audio.error,
          code: audio.error?.code,
          message: audio.error?.message
        });
        URL.revokeObjectURL(audioUrl);
        if (this.currentAudio === audio) {
          this.currentAudio = null; // Clear reference on error
        }
        reject(error);
      };
      
      audio.onended = () => {
        // Check if audio was stopped before resolving
        if (this.isStopped) {
          console.log('Audio playback was stopped, not resolving');
          URL.revokeObjectURL(audioUrl);
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          reject(new Error('Audio playback was stopped'));
          return;
        }
        
        console.log('Audio playback completed');
        URL.revokeObjectURL(audioUrl);
        if (this.currentAudio === audio) {
          this.currentAudio = null; // Clear reference when done
        }
        resolve();
      };
      
      // Handle load errors
      audio.oncanplaythrough = () => {
        console.log('Audio can play through');
      };
      
      // Play the audio - handle browser autoplay restrictions
      // Create a context to resume audio context if needed
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('Audio context resumed');
        }).catch(err => {
          console.warn('Could not resume audio context:', err);
        });
      }
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started successfully');
          })
          .catch((error) => {
            console.error('Error playing audio (autoplay restriction?):', error);
            console.error('This might be due to browser autoplay policy. User interaction may be required.');
            // Try to resume audio context and play again
            audioContext.resume().then(() => {
              return audio.play();
            }).then(() => {
              console.log('Audio playback started after context resume');
            }).catch((retryError) => {
              console.error('Failed to play audio after retry:', retryError);
              URL.revokeObjectURL(audioUrl);
              reject(retryError);
            });
          });
      }
    });
  }

  // Convert text to speech and play it
  async speak(text, voiceId = null) {
    console.log('ElevenLabs speak called with text:', text?.substring(0, 50) + '...');
    
    // Reset stopped flag when starting new speech
    this.isStopped = false;
    
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured, falling back to browser TTS');
      return null;
    }
    
    const audioBlob = await this.textToSpeech(text, voiceId);
    
    // Check if stopped during textToSpeech
    if (this.isStopped) {
      console.log('Audio was stopped during textToSpeech');
      return null;
    }
    
    if (audioBlob) {
      try {
        await this.playAudio(audioBlob);
        // Check if stopped after playAudio
        if (this.isStopped) {
          console.log('Audio was stopped during playback');
          return null;
        }
        return true;
      } catch (error) {
        // If error is because audio was stopped, return null silently
        if (error.message === 'Audio playback was stopped') {
          console.log('Audio playback was stopped by user');
          return null;
        }
        console.error('Error playing audio from ElevenLabs:', error);
        return null;
      }
    }
    
    console.warn('ElevenLabs textToSpeech returned null, falling back to browser TTS');
    return null;
  }

  // Get list of available voices (optional - for voice selection)
  async getVoices() {
    if (!this.apiKey) {
      return [];
    }

    try {
      // Return cached voices if available
      if (this.voiceCache) {
        return this.voiceCache;
      }
      
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      this.voiceCache = data.voices || [];
      return this.voiceCache;
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }
}

export default new ElevenLabsService();
