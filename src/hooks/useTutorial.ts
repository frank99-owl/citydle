'use client';

import { useState, useCallback, useEffect } from 'react';

const TUTORIAL_KEY = 'cartographer_tutorial_completed';
const TOTAL_STEPS = 3;

export const TUTORIAL_STEPS = {
  zh: [
    {
      id: 'welcome',
      title: '欢迎来到金融街图志',
      desc: '在复古纸质地图上，找出并拼写出世界金融中心的所有街道名称，测试你的地理知识！',
    },
    {
      id: 'demo',
      title: '试试看',
      desc: '选择一个城市后，在输入框中输入街道名称进行猜测。猜对后街道会显示在地图上。',
    },
    {
      id: 'hints',
      title: '提示系统',
      desc: '难度越高，提示越少。简单模式可获得地图高亮定位，困难模式则需要完全凭记忆拼写。',
    },
  ],
  en: [
    {
      id: 'welcome',
      title: 'Welcome to Street Cartographer',
      desc: 'Find and spell all street names within famous financial districts on a vintage paper map!',
    },
    {
      id: 'demo',
      title: 'Try It Out',
      desc: 'Select a city, then type street names in the input field. Correct guesses reveal streets on the map.',
    },
    {
      id: 'hints',
      title: 'Hint System',
      desc: 'Higher difficulty means fewer hints. Easy mode shows map highlights, Hard mode requires pure recall.',
    },
  ],
} as const;

export function useTutorial() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_KEY);
    if (completed !== 'true') {
      setHasCompleted(false);
    }
  }, []);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem(TUTORIAL_KEY, 'true');
    setHasCompleted(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= TOTAL_STEPS - 1) {
        // Tutorial complete
        localStorage.setItem(TUTORIAL_KEY, 'true');
        setHasCompleted(true);
        setTimeout(() => setIsActive(false), 400);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  // Auto-start for first-time users
  const shouldAutoStart = !hasCompleted && !isActive;

  return {
    isActive,
    currentStep,
    totalSteps: TOTAL_STEPS,
    hasCompleted,
    shouldAutoStart,
    startTutorial,
    skipTutorial,
    nextStep,
    prevStep,
  };
}
