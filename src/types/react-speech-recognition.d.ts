declare module 'react-speech-recognition' {
    export interface SpeechRecognitionOptions {
        continuous?: boolean;
        language?: string;
    }

    export interface UseSpeechRecognitionHook {
        transcript: string;
        listening: boolean;
        resetTranscript: () => void;
        browserSupportsSpeechRecognition: boolean;
    }

    const SpeechRecognition: {
        startListening: (options?: SpeechRecognitionOptions) => void;
        stopListening: () => void;
        abortListening: () => void;
    };

    export function useSpeechRecognition(): UseSpeechRecognitionHook;
    export default SpeechRecognition;
}
