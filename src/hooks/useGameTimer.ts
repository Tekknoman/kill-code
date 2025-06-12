import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useGameTimer = () => {
    const { timeRemaining, isTimerActive, decrementTimer, setTimer } = useGameStore();

    useEffect(() => {
        if (!isTimerActive || timeRemaining <= 0) {
            return;
        }

        const interval = setInterval(() => {
            decrementTimer();
        }, 1000);

        return () => clearInterval(interval);
    }, [isTimerActive, timeRemaining, decrementTimer]);

    const startTimer = (seconds: number) => {
        setTimer(seconds, true);
    };

    const stopTimer = () => {
        setTimer(timeRemaining, false);
    };

    const resetTimer = () => {
        setTimer(0, false);
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return {
        timeRemaining,
        isTimerActive,
        startTimer,
        stopTimer,
        resetTimer,
        formatTime,
    };
};
