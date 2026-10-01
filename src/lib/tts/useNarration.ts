import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Language } from '../../data/storyData';
import { getBestVoiceForLanguage, getVoicesForLanguage } from './voices';
import { chunkText } from './chunk';

export type NarrationStatus = 'idle' | 'playing' | 'paused' | 'unsupported' | 'no-voice';
export type NarrationSpeed = 0.7 | 0.85 | 1.0;

export interface UseNarrationReturn {
  status: NarrationStatus;
  play: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  speed: NarrationSpeed;
  setSpeed: (speed: NarrationSpeed) => void;
  currentChunkIndex: number;
  totalChunks: number;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  prefersReducedMotion: boolean;
}

interface NarrationState {
  status: NarrationStatus;
  currentChunkIndex: number;
  speed: NarrationSpeed;
  paused: boolean;
}

/**
 * Custom React hook for narration (text-to-speech).
 *
 * Features:
 * - Play, pause, resume, stop controls
 * - Speed control (0.7x, 0.85x, 1.0x)
 * - Voice selection
 * - Sentence-level highlighting
 * - Bilingual support
 * - Auto-cleanup on unmount or text/language change
 */
export function useNarration(
  text: string,
  language: Language,
  useServerVoice?: boolean,
): UseNarrationReturn {
  const [state, setState] = useState<NarrationState>({
    status: 'idle',
    currentChunkIndex: 0,
    speed: 1.0,
    paused: false,
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const prefersReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<string[]>([]);

  // Check if browser supports Web Speech API
  const supportsWebSpeech = useMemo(
    () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    [],
  );

  // Chunk text into sentences
  useMemo(() => {
    chunksRef.current = chunkText(text);
  }, [text]);

  // Load available voices for the language
  useEffect(() => {
    if (!supportsWebSpeech) {
      setState((s) => ({ ...s, status: 'unsupported' }));
      return;
    }

    const loadVoices = async () => {
      try {
        const voices = await getVoicesForLanguage(language);
        const voiceObjects = voices.map((v) => v.voice);
        setAvailableVoices(voiceObjects);

        // Auto-select best voice if none selected
        if (!selectedVoice && voiceObjects.length > 0) {
          setSelectedVoice(voiceObjects[0]);
        }

        if (voiceObjects.length === 0) {
          setState((s) => ({
            ...s,
            status: state.status === 'idle' ? 'no-voice' : s.status,
          }));
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
      }
    };

    loadVoices();
  }, [language, supportsWebSpeech, selectedVoice]);

  // Cancel speech on unmount or text/language change
  const cleanup = useCallback(() => {
    if (supportsWebSpeech) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setState((s) => ({ ...s, status: 'idle', currentChunkIndex: 0, paused: false }));
  }, [supportsWebSpeech]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  useEffect(() => {
    cleanup();
  }, [text, language, cleanup]);

  // Speak the current chunk
  const speakChunk = useCallback(
    (chunkIndex: number) => {
      if (!supportsWebSpeech || !selectedVoice) {
        return;
      }

      const chunks = chunksRef.current;
      if (chunkIndex >= chunks.length) {
        setState((s) => ({ ...s, status: 'idle', currentChunkIndex: 0 }));
        return;
      }

      const chunk = chunks[chunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = language === 'english' ? 'en-US' : language === 'urdu' ? 'ur-PK' : 'ps-PK';
      utterance.voice = selectedVoice;
      utterance.rate = state.speed;
      utterance.pitch = 1.0;

      utteranceRef.current = utterance;

      // When this chunk ends, speak the next one
      utterance.onend = () => {
        const nextIndex = chunkIndex + 1;
        if (nextIndex < chunks.length) {
          setState((s) => ({
            ...s,
            currentChunkIndex: nextIndex,
            status: 'playing',
          }));
          speakChunk(nextIndex);
        } else {
          setState((s) => ({
            ...s,
            status: 'idle',
            currentChunkIndex: 0,
            paused: false,
          }));
        }
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.error('Speech synthesis error:', event.error);
        setState((s) => ({ ...s, status: 'idle' }));
      };

      window.speechSynthesis.speak(utterance);
    },
    [supportsWebSpeech, selectedVoice, state.speed, language],
  );

  // Play narration
  const play = useCallback(async () => {
    if (!supportsWebSpeech) {
      setState((s) => ({ ...s, status: 'unsupported' }));
      return;
    }

    if (!selectedVoice) {
      setState((s) => ({ ...s, status: 'no-voice' }));
      return;
    }

    if (prefersReducedMotion) {
      console.log('User prefers reduced motion; skipping narration');
      return;
    }

    window.speechSynthesis.cancel();
    setState((s) => ({
      ...s,
      status: 'playing',
      currentChunkIndex: 0,
      paused: false,
    }));
    speakChunk(0);
  }, [supportsWebSpeech, selectedVoice, prefersReducedMotion, speakChunk]);

  // Pause narration
  const pause = useCallback(() => {
    if (supportsWebSpeech && state.status === 'playing') {
      window.speechSynthesis.pause();
      setState((s) => ({ ...s, status: 'paused', paused: true }));
    }
  }, [supportsWebSpeech, state.status]);

  // Resume narration from pause
  const resume = useCallback(async () => {
    if (!supportsWebSpeech) {
      return;
    }

    if (state.status === 'paused') {
      // Chrome's pause/resume is unreliable; re-start from current chunk
      window.speechSynthesis.cancel();
      setState((s) => ({ ...s, status: 'playing', paused: false }));
      speakChunk(state.currentChunkIndex);
    }
  }, [supportsWebSpeech, state.status, state.currentChunkIndex, speakChunk]);

  // Stop narration
  const stop = useCallback(() => {
    if (supportsWebSpeech) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setState((s) => ({
      ...s,
      status: 'idle',
      currentChunkIndex: 0,
      paused: false,
    }));
  }, [supportsWebSpeech]);

  // Set narration speed
  const setSpeed = useCallback((speed: NarrationSpeed) => {
    setState((s) => ({ ...s, speed }));
  }, []);

  return {
    status: state.status,
    play,
    pause,
    resume,
    stop,
    speed: state.speed,
    setSpeed,
    currentChunkIndex: state.currentChunkIndex,
    totalChunks: chunksRef.current.length,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    prefersReducedMotion,
  };
}
