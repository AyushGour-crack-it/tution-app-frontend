import React, { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { MAX_LEVEL, getLevelsRemaining, getNextRank, getRank, clampLevel } from "../levelSystem.js";

export default function LevelJourney({ levelData }) {
  const fillRef = useRef(null);
  const pulseRef = useRef(null);
  const level = clampLevel(levelData?.level || 1);
  const maxLevel = Math.min(MAX_LEVEL, Number(levelData?.maxLevel || MAX_LEVEL));
  const progressPercent = Math.max(0, Math.min(100, Number(levelData?.progressPercent || 0)));
  const currentRank = getRank(level);
  const nextRank = getNextRank(level);
  const levelsRemaining = getLevelsRemaining(level);

  useEffect(() => {
    if (!fillRef.current) return;
    gsap.to(fillRef.current, {
      width: `${progressPercent}%`,
      duration: 1.1,
      ease: "power3.out"
    });
  }, [progressPercent]);

  useEffect(() => {
    if (!pulseRef.current) return undefined;
    const tween = gsap.to(pulseRef.current, {
      scale: 1.04,
      boxShadow: "0 0 26px rgba(255, 212, 112, 0.48)",
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    return () => {
      tween.kill();
    };
  }, [level]);

  const levels = useMemo(
    () =>
      Array.from({ length: maxLevel }, (_, index) => {
        const value = index + 1;
        const status = value < level ? "done" : value === level ? "current" : "locked";
        return { value, status };
      }),
    [level, maxLevel]
  );

  return (
    <div className="card level-journey-card">
      <div className="level-journey-head">
        <div className="level-journey-main">Level {level} / {maxLevel}</div>
        <div className="level-journey-rank">{currentRank}</div>
      </div>
      <div className="level-journey-meta">
        <span>Next Rank: {nextRank || "Maxed"}</span>
        <span>Levels Remaining: {levelsRemaining}</span>
      </div>
      <div className="level-journey-progress">
        <div ref={fillRef} className="level-journey-progress-fill" />
      </div>
      <div className="level-journey-progress-text">
        {Number(levelData?.currentLevelXp || 0)} / {Number(levelData?.nextLevelXp || 0)} XP
      </div>
      <div className="level-timeline-scroll">
        <div className="level-timeline-row">
          {levels.map((item) => {
            const isGrand = item.value === MAX_LEVEL;
            const isCurrent = item.status === "current";
            return (
              <div
                key={item.value}
                ref={isCurrent ? pulseRef : null}
                className={`level-node level-node-${item.status}${isGrand ? " level-node-grand" : ""}`}
                title={`Level ${item.value}`}
              >
                <span>{item.value}</span>
                {isGrand ? <span className="level-node-crown">👑</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
