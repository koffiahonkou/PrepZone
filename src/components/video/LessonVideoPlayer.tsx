import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  ExternalLink,
  Film,
  Sparkles,
  Share2,
  Check,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';

export interface VideoInfo {
  type: 'youtube' | 'vimeo' | 'direct' | 'unknown';
  embedUrl: string | null;
  videoId?: string;
  thumbnailUrl?: string;
  sourceUrl: string;
}

export function parseVideoUrl(url: string): VideoInfo {
  if (!url) return { type: 'unknown', embedUrl: null, sourceUrl: '' };
  const trimmed = url.trim();

  // 1. YouTube Matchers:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://m.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://youtube.com/shorts/VIDEO_ID
  // - https://youtube.com/live/VIDEO_ID
  // - https://www.youtube-nocookie.com/embed/VIDEO_ID
  const ytRegex = /(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i;
  const ytMatch = trimmed.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      sourceUrl: `https://www.youtube.com/watch?v=NybHckSEQBI`.includes(videoId)
        ? trimmed
        : `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  // Raw 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      type: 'youtube',
      videoId: trimmed,
      embedUrl: `https://www.youtube-nocookie.com/embed/${trimmed}?rel=0&modestbranding=1&enablejsapi=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${trimmed}/hqdefault.jpg`,
      sourceUrl: `https://www.youtube.com/watch?v=${trimmed}`,
    };
  }

  // 2. Vimeo Matcher:
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/i;
  const vimeoMatch = trimmed.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0`,
      sourceUrl: trimmed,
    };
  }

  // 3. Direct video file or base64 data URL (MP4, WebM, Ogg, MOV)
  if (
    trimmed.startsWith('data:video') ||
    trimmed.startsWith('blob:') ||
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed)
  ) {
    return {
      type: 'direct',
      embedUrl: trimmed,
      sourceUrl: trimmed,
    };
  }

  // 4. Generic direct video stream URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      type: 'direct',
      embedUrl: trimmed,
      sourceUrl: trimmed,
    };
  }

  return { type: 'unknown', embedUrl: null, sourceUrl: trimmed };
}

export function getYoutubeThumbnail(url: string): string | null {
  const info = parseVideoUrl(url);
  return info.thumbnailUrl || null;
}

interface LessonVideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  author?: string;
  onTheaterChange?: (isTheater: boolean) => void;
}

export const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({
  url,
  title,
  className = '',
  author,
  onTheaterChange,
}) => {
  const [isTheater, setIsTheater] = useState(false);
  const [copied, setCopied] = useState(false);
  const videoInfo = parseVideoUrl(url);

  const toggleTheater = () => {
    const nextState = !isTheater;
    setIsTheater(nextState);
    if (onTheaterChange) {
      onTheaterChange(nextState);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard && videoInfo.sourceUrl) {
      navigator.clipboard.writeText(videoInfo.sourceUrl);
      setCopied(true);
      toast.success('Video link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!url || !videoInfo.embedUrl) {
    return (
      <div className="p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-center text-slate-500">
        <Film className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
        <p className="font-semibold text-sm">No valid video note source provided.</p>
        <p className="text-xs text-slate-400 mt-1">
          Paste a YouTube link (e.g., https://www.youtube.com/watch?v=...) or upload a lecture recording.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-slate-950 text-white transition-all duration-300 ${
        isTheater
          ? 'w-full shadow-2xl ring-4 ring-red-500/30'
          : ''
      } ${className}`}
    >
      {/* Top Header Toolbar */}
      <div className="bg-slate-900/95 backdrop-blur-xs px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider shrink-0 ${
              videoInfo.type === 'youtube'
                ? 'bg-red-600/25 text-red-400 border border-red-500/30'
                : videoInfo.type === 'vimeo'
                ? 'bg-cyan-600/25 text-cyan-400 border border-cyan-500/30'
                : 'bg-emerald-600/25 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {videoInfo.type === 'youtube' ? (
              <>
                <svg className="w-3.5 h-3.5 fill-red-500" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>YouTube Player</span>
              </>
            ) : videoInfo.type === 'vimeo' ? (
              <span>Vimeo Video</span>
            ) : (
              <>
                <Film className="w-3.5 h-3.5 text-emerald-400" />
                <span>Video Note</span>
              </>
            )}
          </span>

          <div className="min-w-0">
            <h4
              className="font-bold text-slate-100 text-sm truncate"
              title={title || 'Course Video Lecture'}
            >
              {title || 'Course Video Lecture'}
            </h4>
            {author && (
              <p className="text-[11px] text-slate-400 truncate">Uploaded by {author}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {videoInfo.sourceUrl && (
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              title="Copy link to video"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
          )}

          {videoInfo.type === 'youtube' && (
            <a
              href={videoInfo.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              title="Watch on YouTube in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">YouTube</span>
            </a>
          )}

          <button
            type="button"
            onClick={toggleTheater}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] ${
              isTheater
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title={isTheater ? 'Exit Theater View' : 'Theater View (Larger Screen)'}
          >
            {isTheater ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isTheater ? 'Standard' : 'Theater'}</span>
          </button>
        </div>
      </div>

      {/* Video Content Container */}
      <div
        className={`relative w-full bg-black flex items-center justify-center transition-all duration-300 ${
          isTheater ? 'aspect-[21/9] min-h-[420px]' : 'aspect-video'
        }`}
      >
        {videoInfo.type === 'youtube' || videoInfo.type === 'vimeo' ? (
          <iframe
            src={videoInfo.embedUrl!}
            title={title || 'Lesson Video Player'}
            className="w-full h-full border-0 absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video
            src={videoInfo.embedUrl!}
            controls
            playsInline
            className="w-full h-full object-contain absolute inset-0"
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="px-4 py-2.5 bg-slate-900 text-xs text-slate-400 border-t border-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span>Educational Video Note • Streaming directly for student curriculum review</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
          {videoInfo.type === 'youtube' ? 'YouTube HD Player' : 'Direct Media Player'}
        </span>
      </div>
    </div>
  );
};
