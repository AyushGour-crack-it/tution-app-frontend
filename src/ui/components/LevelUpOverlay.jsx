import React, { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { MAX_LEVEL, getRank } from "../levelSystem.js";

const makeConfetti = (count = 18) =>
  Array.from({ length: count }, (_, idx) => ({
    id: idx,
    left: `${Math.round(Math.random() * 100)}%`,
    delay: Math.random() * 0.45,
    duration: 0.9 + Math.random() * 1.1,
    hue: 38 + Math.round(Math.random() * 24)
  }));

export default function LevelUpOverlay({ data, onDone }) {
  const ringRef = useRef(null);
  const numberRef = useRef(null);
  const rootRef = useRef(null);
  const isGrand = Number(data?.newLevel || 0) >= MAX_LEVEL;
  const confetti = useMemo(() => makeConfetti(isGrand ? 28 : 18), [isGrand, data?.newLevel]);

  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const context = new AudioCtx();
        const now = context.currentTime;

        const playTone = (frequency, start, duration, volume) => {
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start(start);
          osc.stop(start + duration + 0.02);
        };

        playTone(720, now + 0.02, 0.14, 0.05);
        playTone(960, now + 0.16, 0.18, 0.06);
        if (isGrand) {
          playTone(1320, now + 0.36, 0.22, 0.075);
        }
        setTimeout(() => {
          context.close().catch(() => {});
        }, 900);
      }
    } catch {
      // no-op if audio is blocked
    }

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => onDone?.()
    });
    tl.fromTo(
      rootRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.2 }
    )
      .fromTo(
        ringRef.current,
        { scale: 0.4, opacity: 0.45 },
        { scale: isGrand ? 1.35 : 1.15, opacity: 1, duration: 0.65 },
        0.05
      )
      .fromTo(
        numberRef.current,
        { textContent: Number(data?.oldLevel || 1) },
        {
          textContent: Number(data?.newLevel || 1),
          duration: 0.8,
          snap: { textContent: 1 }
        },
        0.2
      )
      .to(
        ringRef.current,
        {
          boxShadow: isGrand
            ? "0 0 42px rgba(255, 215, 126, 0.88)"
            : "0 0 24px rgba(255, 215, 126, 0.64)",
          duration: 0.35,
          repeat: 1,
          yoyo: true
        },
        0.8
      );

    if (isGrand) {
      tl.to(
        rootRef.current,
        {
          x: -5,
          y: 2,
          duration: 0.06,
          repeat: 7,
          yoyo: true
        },
        0.95
      );
    }

    tl.to(rootRef.current, { opacity: 0, duration: 0.3 }, isGrand ? 2.55 : 2.35);
    return () => {
      tl.kill();
    };
  }, [data?.newLevel, data?.oldLevel, isGrand, onDone]);

  return (
    <div className={`level-up-overlay${isGrand ? " level-up-overlay-grand" : ""}`} ref={rootRef}>
      <div className="level-up-confetti-wrap">
        {confetti.map((item) => (
          <span
            key={item.id}
            className="level-up-confetti"
            style={{
              left: item.left,
              animationDelay: `${item.delay}s`,
              animationDuration: `${item.duration}s`,
              background: `hsl(${item.hue} 88% 66%)`
            }}
          />
        ))}
      </div>
      <div className="level-up-card">
        <div className="level-up-title">LEVEL UP</div>
        <div className="level-up-ring" ref={ringRef}>
          <span ref={numberRef}>{Number(data?.oldLevel || 1)}</span>
          {isGrand ? <span className="level-up-crown">👑</span> : null}
        </div>
        <div className="level-up-rank">{getRank(Number(data?.newLevel || 1))}</div>
        <div className="level-up-xp">+{Number(data?.xpGained || 0)} XP</div>
        {data?.badgeUnlocked ? (
          <div className="level-up-badge">Unlocked: {String(data.badgeUnlocked)}</div>
        ) : null}
      </div>
    </div>
  );
}
