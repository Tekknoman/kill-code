// Simple wrapper for react-speech-recognition to handle missing types
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface SpeechRecognitionHook {
    transcript: string;
    listening: boolean;
    resetTranscript: () => void;
    browserSupportsSpeechRecognition: boolean;
}

interface SpeechRecognitionAPI {
    startListening: (options?: { continuous?: boolean; language?: string }) => void;
    stopListening: () => void;
    abortListening: () => void;
}

// Try to import the real library, fall back to mock if not available
let SpeechRecognition: SpeechRecognitionAPI;
let useSpeechRecognition: () => SpeechRecognitionHook;

try {
    const speechModule = require('react-speech-recognition');
    SpeechRecognition = speechModule.default;
    useSpeechRecognition = speechModule.useSpeechRecognition;
} catch (error) {
    // Fallback implementation
    console.warn('react-speech-recognition not available, using fallback');

    SpeechRecognition = {
        startListening: () => console.log('Speech recognition not available'),
        stopListening: () => console.log('Speech recognition not available'),
        abortListening: () => console.log('Speech recognition not available'),
    };

    useSpeechRecognition = () => ({
        transcript: '',
        listening: false,
        resetTranscript: () => { },
        browserSupportsSpeechRecognition: false,
    });
}

export { SpeechRecognition, useSpeechRecognition };
