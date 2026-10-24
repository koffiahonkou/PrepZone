import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  ChevronDown,
  ArrowRight,
  Star,
  Check,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Submission, Quiz } from '@/src/types';

interface QuizSubmissionCelebrationProps {
  submission: Submission;
  quiz: Quiz;
  onDone: () => void;
  onViewAnalytics?: () => void;
  onScrollToReview?: () => void;
}

/**
 * Plays a cheerful celebratory arpeggio using the browser's Web Audio API.
 * No external audio files or dependencies required.
 */
function playCelebrationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play celebratory notes: C5, E5, G5, C6 (major arpeggio)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);

      gain.gain.setValueAtTime(0, now + index * 0.1);
      gain.gain.linearRampToValueAtTime(0.18, now + index * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.4);
    });
  } catch {
    // Ignore audio autoplay restrictions gracefully
  }
}

/**
 * Fires vibrant, multi-stage confetti cannons across the screen.
 */
export function fireCelebrationConfetti() {
  // Center burst
  confetti({
    particleCount: 75,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#0F2A4A', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'],
    disableForReducedMotion: true,
  });

  // Left cannon
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 60,
      origin: { x: 0.1, y: 0.65 },
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#10B981'],
      disableForReducedMotion: true,
    });
  }, 180);

  // Right cannon
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 60,
      origin: { x: 0.9, y: 0.65 },
      colors: ['#8B5CF6', '#EC4899', '#F59E0B', '#0F2A4A'],
      disableForReducedMotion: true,
    });
  }, 320);
}

export const QuizSubmissionCelebration: React.FC<QuizSubmissionCelebrationProps> = ({
  submission,
  quiz,
  onDone,
  onViewAnalytics,
  onScrollToReview,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const hasFiredInitial = useRef(false);

  const passMark = quiz.settings.passMarkPercent || 50;
  const isPassed = submission.percent >= passMark;
  const isPendingTheory = submission.status === 'pending_manual';
  const isDistinction = submission.percent >= 90;
  const isExcellent = submission.percent >= 75 && submission.percent < 90;

  // Determine celebratory tier and copy
  const celebrationDetails = (() => {
    if (isDistinction) {
      return {
        tier: 'distinction',
        title: 'Outstanding Achievement!',
        subtitle: 'You mastered this assessment with extraordinary accuracy!',
        badgeText: 'Distinction Honor Roll 🌟',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700',
        ringColor: '#F59E0B',
        icon: Trophy,
        bannerBg: 'from-amber-500/15 via-emerald-500/10 to-blue-500/15',
        cardBorder: 'border-amber-200 dark:border-amber-800',
      };
    }
    if (isExcellent) {
      return {
        tier: 'excellent',
        title: 'Brilliant Performance!',
        subtitle: 'Excellent work! Your knowledge and preparation truly shine through.',
        badgeText: 'High Merit Score 🎉',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700',
        ringColor: '#10B981',
        icon: Award,
        bannerBg: 'from-emerald-500/15 via-teal-500/10 to-blue-500/15',
        cardBorder: 'border-emerald-200 dark:border-emerald-800',
      };
    }
    if (isPassed) {
      return {
        tier: 'passed',
        title: 'Assessment Passed!',
        subtitle: 'Solid job completing your test! You met the academic benchmark.',
        badgeText: 'Benchmark Achieved 👏',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700',
        ringColor: '#3B82F6',
        icon: CheckCircle2,
        bannerBg: 'from-blue-500/15 via-indigo-500/10 to-slate-500/15',
        cardBorder: 'border-blue-200 dark:border-blue-800',
      };
    }
    if (isPendingTheory) {
      return {
        tier: 'pending',
        title: 'Answers Successfully Submitted!',
        subtitle: 'Great effort completing all questions! Your written answers are queued for review.',
        badgeText: 'Theory Evaluation Queued ⏳',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700',
        ringColor: '#8B5CF6',
        icon: Clock,
        bannerBg: 'from-purple-500/15 via-indigo-500/10 to-slate-500/15',
        cardBorder: 'border-purple-200 dark:border-purple-800',
      };
    }
    return {
      tier: 'completed',
      title: 'Assessment Complete!',
      subtitle: 'Great perseverance finishing this challenge. Use the breakdown below to learn and grow!',
      badgeText: 'Submission Recorded 📝',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      ringColor: '#64748B',
      icon: Sparkles,
      bannerBg: 'from-slate-500/10 via-blue-500/10 to-slate-500/10',
      cardBorder: 'border-slate-200 dark:border-slate-800',
    };
  })();

  const TierIcon = celebrationDetails.icon;

  const triggerCelebration = useCallback(() => {
    fireCelebrationConfetti();
    if (soundEnabled) {
      playCelebrationChime();
    }
    setReplayKey((k) => k + 1);
  }, [soundEnabled]);

  // Initial celebratory burst on mount
  useEffect(() => {
    if (!hasFiredInitial.current) {
      hasFiredInitial.current = true;
      const timer = setTimeout(() => {
        triggerCelebration();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [triggerCelebration]);

  // Circle progress calculation
  const circleRadius = 42;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeOffset = circumference - (Math.min(100, Math.max(0, submission.percent)) / 100) * circumference;

  return (
    <motion.div
      key={replayKey}
      initial={{ opacity: 0, scale: 0.94, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`rounded-2xl border ${celebrationDetails.cardBorder} bg-gradient-to-b ${celebrationDetails.bannerBg} to-white dark:to-slate-900 p-6 sm:p-8 shadow-xl relative overflow-hidden`}
    >
      {/* Decorative ambient glowing circles */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar with sound and celebration controls */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${celebrationDetails.badgeBg}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {celebrationDetails.badgeText}
        </motion.span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Celebration Sound' : 'Enable Celebration Sound'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={triggerCelebration}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Replay Cheer</span>
          </button>
        </div>
      </div>

      {/* Central Celebratory Animated Trophy & Heading */}
      <div className="text-center relative z-10 space-y-4">
        {/* Animated Trophy / Medal Emblem with floating stars */}
        <div className="relative inline-flex items-center justify-center my-2">
          {/* Radial pulse wave */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: [1, 1.4, 1.6], opacity: [0.7, 0.25, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-emerald-400/30 dark:bg-emerald-500/20 pointer-events-none"
          />

          {/* Floating animated sparkles around the emblem */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 pointer-events-none"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 absolute top-0 left-1/4 animate-pulse" />
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 absolute bottom-1 right-2" />
            <Star className="w-3 h-3 text-blue-400 fill-blue-400 absolute top-3 right-0" />
          </motion.div>

          {/* Main bouncy icon container */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 18,
              delay: 0.1,
            }}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center relative z-10"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, -6, 6, -3, 0],
              }}
              transition={{
                duration: 1.2,
                delay: 0.45,
                ease: 'easeInOut',
              }}
            >
              <TierIcon
                className="w-10 h-10 sm:w-12 sm:h-12"
                style={{ color: celebrationDetails.ringColor }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Title and subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#0F2A4A] dark:text-white tracking-tight">
            {celebrationDetails.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mt-1 leading-relaxed">
            {celebrationDetails.subtitle}
          </p>
        </motion.div>
      </div>

      {/* Score Visuals & Metric Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4 }}
        className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 relative z-10"
      >
        {/* Metric 1: Circular Radial Score Progress */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 96 96">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r={circleRadius}
                className="stroke-slate-100 dark:stroke-slate-700"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Animated progress circle */}
              <motion.circle
                cx="48"
                cy="48"
                r={circleRadius}
                stroke={celebrationDetails.ringColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: strokeOffset }}
                transition={{ duration: 1.1, delay: 0.35, ease: 'easeOut' }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-extrabold text-[#0F2A4A] dark:text-white">
                {submission.percent}%
              </span>
            </div>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Score Accuracy
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {isPassed ? 'Passed Standard' : 'Benchmark: ' + passMark + '%'}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Pass mark: {passMark}%
            </span>
          </div>
        </div>

        {/* Metric 2: Points Earned */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-center">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Marks Earned
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold text-[#0F2A4A] dark:text-white">
              {submission.totalScore}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              / {submission.totalPossible} Total Marks
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Auto-graded Pass 1
          </span>
        </div>

        {/* Metric 3: Assessment Status */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-center">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Grading Status
          </span>
          <div className="mt-1">
            {isPendingTheory ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                <Clock className="w-3 h-3 text-amber-600 animate-spin" /> Pending Theory Marks
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Fully Graded
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isPendingTheory ? 'Instructor will score written questions' : 'Immediate final score'}
          </span>
        </div>
      </motion.div>

      {/* Theory Queue Notice if Applicable */}
      {isPendingTheory && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
        >
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Note for Theory Questions:</strong> You earned{' '}
            <strong>{submission.autoScore} marks</strong> on objective questions. Your open-ended written answers have been securely submitted to your teacher's queue and your final marks will update upon review.
          </span>
        </motion.div>
      )}

      {/* Action Navigation Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.42 }}
        className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 relative z-10"
      >
        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Single submission locked & verified
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {onScrollToReview && (
            <button
              type="button"
              onClick={onScrollToReview}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Review Answers</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {onViewAnalytics && (
            <button
              type="button"
              onClick={onViewAnalytics}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Full Analytics</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F2A4A] text-white hover:bg-[#163c68] shadow-xs transition-colors cursor-pointer"
          >
            <span>Back to Quizzes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
