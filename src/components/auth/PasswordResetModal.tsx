import React, { useState } from 'react';
import {
  KeyRound,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { dataStore } from '@/src/services/dataStore';
import { UserProfile } from '@/src/types';
import { toast } from 'sonner';

interface PasswordResetModalProps {
  isOpen: boolean;
  initialUsername?: string;
  onClose: () => void;
  onSuccess: (username: string) => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  initialUsername = '',
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'identify' | 'reset' | 'success'>('identify');
  const [identifier, setIdentifier] = useState(initialUsername);
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = identifier.trim();
    if (!clean) {
      setError('Please enter your school-assigned username or account email.');
      return;
    }

    const found = dataStore.getUserByIdentifier(clean);
    if (!found) {
      setError(
        `No registered account found matching "${clean}". Please verify your username spelling or contact the administrator.`
      );
      return;
    }

    if (found.status === 'inactive') {
      setError(
        'This account has been deactivated. Please contact your school administrator to reactivate your access.'
      );
      return;
    }

    if (found.role === 'developer' || found.uid === 'dev-system-superuser' || found.usernameLower === 'developer') {
      setError(
        'The Developer superuser account is protected and cannot be reset through public self-service recovery. Please sign in directly.'
      );
      return;
    }

    setMatchedUser(found);
    setStep('reset');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!matchedUser) return;

    if (!newPassword || newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = dataStore.resetUserPassword(matchedUser.username, newPassword.trim());
      if (!res.success) {
        setError(res.error || 'Failed to update password.');
        return;
      }

      toast.success(`Password for @${matchedUser.username} updated successfully!`);
      setStep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while resetting password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (matchedUser) {
      onSuccess(matchedUser.username);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-[#0F2A4A] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/15">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Reset Account Password</h3>
              <p className="text-xs text-slate-300">Self-service credential recovery</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* STEP 1: Identify Account */}
          {step === 'identify' && (
            <form onSubmit={handleIdentify} className="space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed">
                Enter your school-assigned username or institutional email to verify your identity and reset your credentials.
              </div>

              <div>
                <label
                  htmlFor="reset-identifier"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Username or Account Email
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. alex.smith or mrs.adebayo"
                    autoFocus
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-[#0F2A4A] focus:ring-2 focus:ring-slate-200 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  All accounts are created and registered by the school administrator.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#163c68] shadow-xs transition-colors cursor-pointer"
                >
                  <span>Verify Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Set New Password */}
          {step === 'reset' && matchedUser && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Account Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                      matchedUser.role === 'admin'
                        ? 'bg-[#0F2A4A]'
                        : matchedUser.role === 'teacher'
                        ? 'bg-purple-700'
                        : 'bg-emerald-700'
                    }`}
                  >
                    {matchedUser.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900 leading-tight">
                      {matchedUser.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      @{matchedUser.username}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    matchedUser.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : matchedUser.role === 'teacher'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {matchedUser.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                  {matchedUser.role === 'teacher' && <BookOpen className="w-3 h-3" />}
                  {matchedUser.role === 'student' && <GraduationCap className="w-3 h-3" />}
                  {matchedUser.role}
                </span>
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    disabled={isSubmitting}
                    autoFocus
                    className="block w-full pl-10 pr-10 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-[#0F2A4A] focus:ring-2 focus:ring-slate-200 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    disabled={isSubmitting}
                    className="block w-full pl-10 pr-10 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-[#0F2A4A] focus:ring-2 focus:ring-slate-200 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Requirements & Matching Helper */}
              <div className="text-[11px] space-y-1 pt-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      newPassword.length >= 6
                        ? 'bg-emerald-100 text-emerald-700 font-bold'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    ✓
                  </div>
                  <span>At least 6 characters</span>
                </div>
                {confirmPassword && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        newPassword === confirmPassword
                          ? 'bg-emerald-100 text-emerald-700 font-bold'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {newPassword === confirmPassword ? '✓' : '✗'}
                    </div>
                    <span
                      className={
                        newPassword === confirmPassword ? 'text-emerald-700 font-medium' : 'text-rose-600'
                      }
                    >
                      {newPassword === confirmPassword
                        ? 'Passwords match'
                        : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('identify')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 'success' && matchedUser && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">Password Reset Complete!</h4>
                <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto">
                  The password for <strong>@{matchedUser.username}</strong> ({matchedUser.fullName}) has been updated. You can now log into your account using your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#0F2A4A] hover:bg-[#163c68] shadow-md transition-all cursor-pointer"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
