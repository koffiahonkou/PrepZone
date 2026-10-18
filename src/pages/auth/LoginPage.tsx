import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  MapPin,
  Mail,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useColorMode } from '@/src/context/ColorModeContext';
import { EduFormLogo } from '@/src/components/brand/EduFormLogo';
import { dataStore } from '@/src/services/dataStore';
import { SystemSettings } from '@/src/types';
import { toast } from 'sonner';

const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, numbers, dots, hyphens, and underscores are allowed'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, profile, switchDemoUser, isPlaceholderMode } = useAuth();
  const { isNight, toggleMode } = useColorMode();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(() => dataStore.getSettings());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SystemSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(dataStore.getSettings());
      }
    };
    window.addEventListener('eduform_settings_updated', handleUpdate);
    return () => window.removeEventListener('eduform_settings_updated', handleUpdate);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Redirect if already logged in
  React.useEffect(() => {
    if (profile) {
      if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [profile, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null);
    try {
      await signIn(data.username, data.password);
      toast.success('Signed in successfully.');
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from || '/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setAuthError(msg);
      toast.error(msg);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      toast.success('Signed in with Google successfully.');
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from || '/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleQuickFill = (username: string, pass = 'Eduform123!') => {
    setValue('username', username, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800">
      {/* LEFT: Academic Brand Panel */}
      <div className="md:w-5/12 bg-[#0F2A4A] text-white p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative crest background */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 opacity-5 pointer-events-none">
          <EduFormLogo variant="mark" size="xl" className="w-full h-full" />
        </div>

        <div className="relative z-10">
          <EduFormLogo variant="inverted" size="lg" />
          <div className="mt-14 max-w-md">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Institutional Portal
            </span>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-white leading-tight">
              Classroom assessments, curated notes, and hybrid grading.
            </h1>
            <p className="mt-4 text-slate-300 text-sm md:text-base leading-relaxed">
              {settings.appName} enables teachers to author rich quizzes and lecture notes, while students
              receive instant auto-graded feedback with queued theory review.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-10 md:mt-0 pt-8 border-t border-slate-700/60">
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-300 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Role-gated classes</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Two-pass hybrid grading</span>
            </div>
          </div>
          {settings.schoolAddress && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-700/40">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{settings.schoolAddress}</span>
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: Login Form */}
      <div className="md:w-7/12 flex items-center justify-center p-6 md:p-14 bg-white relative">
        {/* Day / Night Mode Toggle on Login Screen */}
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={toggleMode}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isNight
                ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={isNight ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {isNight ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span className="hidden sm:inline">{isNight ? 'Day Mode' : 'Night Mode'}</span>
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0F2A4A] tracking-tight">
              Sign in to your account
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your school-assigned username and password to proceed.
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-700 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Authentication Failed</p>
                <p className="text-xs text-rose-600 mt-0.5">{authError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Username
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. admin or alex.smith"
                  disabled={isSubmitting}
                  {...register('username')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border bg-white focus:outline-hidden transition-all ${
                    errors.username
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-[#0F2A4A] focus:ring-2 focus:ring-slate-200'
                  }`}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotDialog(true)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 focus:outline-hidden"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border bg-white focus:outline-hidden transition-all ${
                    errors.password
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-[#0F2A4A] focus:ring-2 focus:ring-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-[#0F2A4A] hover:bg-[#163c68] focus:outline-hidden focus:ring-4 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-emerald-400 rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {settings.appName || 'EduForm'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative bg-white px-3 text-xs text-slate-500 uppercase tracking-wide">
                Or continue with
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 focus:outline-hidden focus:ring-4 focus:ring-slate-100 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
            >
              {isGoogleSubmitting ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-emerald-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </form>

          {/* Quick Demo Previews / Evaluation Credentials Box */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Evaluation Demo Accounts
              </span>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                Eduform123!
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  handleQuickFill('admin');
                  switchDemoUser('admin');
                  toast.success('Switched to Administrator session.');
                  navigate('/admin');
                }}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex flex-col gap-0.5 cursor-pointer"
              >
                <span className="font-semibold text-[#0F2A4A] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Admin
                </span>
                <span className="text-[11px] text-slate-500 font-mono">admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleQuickFill('mrs.adebayo');
                  switchDemoUser('teacher1');
                  toast.success('Switched to Teacher (Mrs. Clara Adebayo - STEM Lead).');
                  navigate('/dashboard');
                }}
                className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-left transition-colors flex flex-col gap-0.5 cursor-pointer"
              >
                <span className="font-semibold text-purple-900 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" /> Teacher: Clara
                </span>
                <span className="text-[11px] text-purple-700 font-mono">mrs.adebayo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleQuickFill('alex.smith');
                  switchDemoUser('student1');
                  toast.success('Switched to Student (Alex Smith - Basic School).');
                  navigate('/dashboard');
                }}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex flex-col gap-0.5 cursor-pointer"
              >
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> Student: Alex
                </span>
                <span className="text-[11px] text-slate-500 font-mono">alex.smith</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleQuickFill('sarah.jenkins');
                  switchDemoUser('student2');
                  toast.success('Switched to Student (Sarah Jenkins - Basic School).');
                  navigate('/dashboard');
                }}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex flex-col gap-0.5 cursor-pointer"
              >
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> Student: Sarah
                </span>
                <span className="text-[11px] text-slate-500 font-mono">sarah.jenkins</span>
              </button>
            </div>

            {isPlaceholderMode ? (
              <p className="text-[11px] text-slate-500 mt-3 text-center">
                Firebase is configured with placeholder values. Interactive one-click demo
                accounts allow immediate evaluation of all RBAC flows.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600 mt-3 text-center flex items-center justify-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Firebase Cloud Connected &bull; Realtime Authentication & Firestore Database Active
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0F2A4A]">Password Reset</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              To safeguard institutional accounts, self-service password recovery is restricted.
              Please <strong>contact your administrator</strong>
              {settings.contactEmail && (
                <> at <strong className="text-slate-800">{settings.contactEmail}</strong></>
              )}
              {settings.contactPhone && (
                <> or call <strong className="text-slate-800">{settings.contactPhone}</strong></>
              )}
              {' '}to reset your credentials.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0F2A4A] text-white hover:bg-[#163c68]"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
