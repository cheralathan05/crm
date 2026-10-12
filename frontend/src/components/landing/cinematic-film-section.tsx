"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  X, 
  Film, 
  Sparkles,
  RotateCcw,
  CheckCircle2
} from "lucide-react";

export function CinematicFilmSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const inlineVideoRef = useRef<HTMLVideoElement>(null);

  const handleOpenTheater = () => {
    setIsTheaterOpen(true);
    setIsPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }, 100);
  };

  const handleCloseTheater = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsTheaterOpen(false);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    setProgress((v.currentTime / v.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    v.currentTime = pos * v.duration;
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  // Close theater on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTheaterOpen) {
        handleCloseTheater();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTheaterOpen]);

  return (
    <section id="film" className="relative py-32 bg-[#060608] overflow-hidden border-t border-white/[0.08]">
      {/* Background radial spotlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[#ff6b3d]/15 via-[#b5452a]/5 to-transparent rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#ff8f5a] uppercase tracking-widest mb-4">
            <Film className="w-3.5 h-3.5" />
            <span>Cinematic Brand Film // 60 Seconds</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-5">
            SEE THE ENTIRE BUSINESS
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-[#ff8f5a]">
              COME TOGETHER.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-white/60 leading-relaxed font-normal">
            One connected journey. From client requirements to coordinated execution and final delivery.
          </p>
        </div>

        {/* Dramatic Video Presentation Frame */}
        <div className="relative rounded-2xl p-1 bg-gradient-to-b from-white/[0.18] via-white/[0.06] to-white/[0.02] shadow-[0_30px_90px_rgba(0,0,0,0.85)] group">
          {/* Outer glow aura on hover */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#b5452a]/30 to-[#ff6b3d]/30 blur-xl opacity-40 group-hover:opacity-75 transition-opacity pointer-events-none" />

          <div className="relative rounded-[14px] bg-[#0c0b10] overflow-hidden border border-white/[0.1]">
            {/* Top Telemetry Overlay Bar */}
            <div className="h-10 px-5 bg-[#121017]/90 border-b border-white/[0.08] flex items-center justify-between z-20 relative">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#ff6b3d] animate-pulse" />
                <span className="text-[11px] font-mono tracking-widest text-white/70 uppercase">
                  BUSINESS OS // MASTER FILM
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
                <span className="hidden sm:inline">4K UHD MASTER</span>
                <span className="hidden sm:inline">|</span>
                <span className="hidden sm:inline">60 FPS</span>
                <span className="hidden sm:inline">|</span>
                <span className="text-[#ff8f5a]">RUNTIME 00:59</span>
              </div>
            </div>

            {/* Poster & Play Button Trigger Area */}
            <div 
              onClick={handleOpenTheater}
              className="relative aspect-video w-full cursor-pointer overflow-hidden flex items-center justify-center group"
            >
              {/* Generated 3D Art Direction Poster Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                style={{ backgroundImage: "url('/business_os_film_poster.jpg')" }}
              />

              {/* Ambient dark gradient vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#09080d] via-black/40 to-black/30 group-hover:opacity-70 transition-opacity" />

              {/* Atmospheric orange scanline effect */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 107, 61, 0.15) 2px, rgba(255, 107, 61, 0.15) 4px)"
                }}
              />

              {/* Central Glowing Pulsing Play Button */}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="relative">
                  {/* Acoustic pulse waves */}
                  <div className="absolute -inset-4 rounded-full bg-[#ff6b3d]/20 animate-ping opacity-75" />
                  <div className="absolute -inset-8 rounded-full bg-[#ff6b3d]/10 animate-pulse" />

                  {/* Play circle */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#1c1924] to-[#121017] border border-[#ff6b3d]/60 shadow-[0_0_35px_rgba(255,107,61,0.5)] flex items-center justify-center group-hover:scale-110 group-hover:border-[#ff8f5a] transition-all duration-300">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-[#ff8f5a] fill-[#ff8f5a] ml-1.5 transition-colors group-hover:text-white group-hover:fill-white" />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-sm sm:text-base font-bold text-white tracking-wide group-hover:text-[#ff8f5a] transition-colors">
                    Watch the Experience
                  </span>
                  <span className="text-xs font-mono text-white/50 tracking-wider">
                    CLICK TO EXPAND THEATER // STEREO SOUND
                  </span>
                </div>
              </div>

              {/* Corner Architectural Brackets */}
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/30 pointer-events-none" />
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/30 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/30 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/30 pointer-events-none" />
            </div>

            {/* Bottom Specs Bar */}
            <div className="px-6 py-4 bg-[#0e0d13] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-white/60">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real Product Architecture</span>
                </span>
                <span className="hidden sm:flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero Generic Mockups</span>
                </span>
              </div>

              <button
                onClick={handleOpenTheater}
                className="text-xs font-mono text-[#ff8f5a] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <span>OPEN FULL EXPERIENCE</span>
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* IMMERSIVE THEATER VIEW MODAL */}
      {isTheaterOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-center items-center p-4 sm:p-8 animate-fade-in">
          {/* Top Theater Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b3d] animate-pulse" />
              <span className="text-xs font-mono text-white/80">BUSINESS OS // CINEMATIC PROJECTION</span>
            </div>
            <button
              onClick={handleCloseTheater}
              className="p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white/80 hover:text-white transition-colors"
              aria-label="Exit Theater"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Container */}
          <div className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden bg-black border border-white/[0.15] shadow-[0_0_80px_rgba(255,107,61,0.25)]">
            <video
              ref={videoRef}
              src="/business_os_film.mp4"
              className="w-full h-full object-contain"
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
            />

            {/* Custom Control Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2">
              {/* Scrubber bar */}
              <div 
                onClick={handleSeek}
                className="w-full h-1.5 bg-white/20 hover:h-2.5 transition-all rounded-full cursor-pointer relative overflow-hidden"
              >
                <div 
                  className="h-full bg-gradient-to-r from-[#b5452a] to-[#ff8f5a] rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay} className="p-1 hover:text-[#ff8f5a] transition-colors">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <button onClick={toggleMute} className="p-1 hover:text-[#ff8f5a] transition-colors">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  <span className="font-mono text-[11px] text-white/60">
                    {formatTime(currentTime)} / {formatTime(duration || 60)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#ff8f5a] bg-[#ff6b3d]/15 px-2 py-0.5 rounded border border-[#ff6b3d]/30">
                    1080p HD
                  </span>
                  <button 
                    onClick={() => {
                      if (videoRef.current?.requestFullscreen) {
                        videoRef.current.requestFullscreen();
                      }
                    }} 
                    className="p-1 hover:text-[#ff8f5a]"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs font-mono text-white/40">
            Press ESC or click close to return to the page
          </div>
        </div>
      )}
    </section>
  );
}
