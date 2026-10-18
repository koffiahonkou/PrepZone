import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';

interface StagePlaceholderPageProps {
  title: string;
  stageName: string;
  stageNumber: 2 | 3 | 4 | 5;
  description: string;
  keyFeatures: string[];
}

export const StagePlaceholderPage: React.FC<StagePlaceholderPageProps> = ({
  title,
  stageName,
  stageNumber,
  description,
  keyFeatures,
}) => {
  const { id, submissionId } = useParams<{ id?: string; submissionId?: string }>();
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={isAdmin ? '/admin' : '/dashboard'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0F2A4A] p-2 rounded-lg hover:bg-white border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-8 sm:p-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0F2A4A]/10 text-[#0F2A4A]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Stage {stageNumber} Roadmap
            </span>
            <span className="text-xs font-medium text-slate-400">• {stageName}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2A4A] tracking-tight">
            {title} {(id || submissionId) && <span className="text-slate-400 font-sans font-normal text-lg">({id || submissionId})</span>}
          </h1>

          <p className="mt-3 text-slate-600 text-sm leading-relaxed">{description}</p>

          <div className="mt-8 p-5 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Architectural Specifications for this module:
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              {keyFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center gap-3 text-xs text-slate-500">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              Route registered in <strong>Stage 1 (Foundation & RBAC)</strong>. Complete implementation executes when Stage {stageNumber} is confirmed.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
