import React, { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { api } from "../api.js";
import LevelJourney from "../components/LevelJourney.jsx";
import { MAX_LEVEL, getLevelsRemaining, getNextRank, getRank } from "../levelSystem.js";

export default function LevelJourneyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [levelData, setLevelData] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const shellRef = useRef(null);
  const orbARef = useRef(null);
  const orbBRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioLoopTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.get("/badges/me").then((res) => res.data || {});
        if (!mounted) return;
        setLevelData(data.level || null);
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.message || "Failed to load level journey.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shellRef.current) return undefined;
    const sections = shellRef.current.querySelectorAll("[data-journey-section]");
    const intro = gsap.fromTo(
      sections,
      { opacity: 0, y: 24, filter: "blur(4px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power3.out", stagger: 0.08 }
    );
    const orbA = orbARef.current
      ? gsap.to(orbARef.current, { y: -18, x: 8, duration: 4.2, yoyo: true, repeat: -1, ease: "sine.inOut" })
      : null;
    const orbB = orbBRef.current
      ? gsap.to(orbBRef.current, { y: 16, x: -10, duration: 4.8, yoyo: true, repeat: -1, ease: "sine.inOut" })
      : null;
    return () => {
      intro.kill();
      orbA?.kill();
      orbB?.kill();
    };
  }, [levelData]);

  const playJourneyChime = React.useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    const context = audioContextRef.current;
    if (context.state === "suspended") {
      context.resume();
    }
    const now = context.currentTime + 0.02;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      const t = now + index * 0.115;
      const lead = context.createOscillator();
      const leadGain = context.createGain();
      lead.type = "square";
      lead.frequency.setValueAtTime(freq, t);
      leadGain.gain.setValueAtTime(0.0001, t);
      leadGain.gain.exponentialRampToValueAtTime(0.03, t + 0.012);
      leadGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      lead.connect(leadGain);
      leadGain.connect(context.destination);
      lead.start(t);
      lead.stop(t + 0.14);

      const sparkle = context.createOscillator();
      const sparkleGain = context.createGain();
      sparkle.type = "triangle";
      sparkle.frequency.setValueAtTime(freq * 2, t + 0.01);
      sparkleGain.gain.setValueAtTime(0.0001, t + 0.01);
      sparkleGain.gain.exponentialRampToValueAtTime(0.01, t + 0.025);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      sparkle.connect(sparkleGain);
      sparkleGain.connect(context.destination);
      sparkle.start(t + 0.01);
      sparkle.stop(t + 0.12);
    });

    const finishAt = now + notes.length * 0.115;
    const finish = context.createOscillator();
    const finishGain = context.createGain();
    finish.type = "sawtooth";
    finish.frequency.setValueAtTime(1318.51, finishAt);
    finish.frequency.exponentialRampToValueAtTime(1567.98, finishAt + 0.09);
    finishGain.gain.setValueAtTime(0.0001, finishAt);
    finishGain.gain.exponentialRampToValueAtTime(0.018, finishAt + 0.02);
    finishGain.gain.exponentialRampToValueAtTime(0.0001, finishAt + 0.13);
    finish.connect(finishGain);
    finishGain.connect(context.destination);
    finish.start(finishAt);
    finish.stop(finishAt + 0.14);
  }, []);

  useEffect(() => {
    if (!soundEnabled) {
      if (audioLoopTimerRef.current) {
        window.clearInterval(audioLoopTimerRef.current);
        audioLoopTimerRef.current = null;
      }
      return;
    }
    playJourneyChime();
    audioLoopTimerRef.current = window.setInterval(() => {
      playJourneyChime();
    }, 12000);
    return () => {
      if (audioLoopTimerRef.current) {
        window.clearInterval(audioLoopTimerRef.current);
        audioLoopTimerRef.current = null;
      }
    };
  }, [playJourneyChime, soundEnabled]);

  useEffect(
    () => () => {
      if (audioLoopTimerRef.current) {
        window.clearInterval(audioLoopTimerRef.current);
        audioLoopTimerRef.current = null;
      }
      if (audioContextRef.current && typeof audioContextRef.current.close === "function") {
        audioContextRef.current.close();
      }
    },
    []
  );

  const currentLevel = Number(levelData?.level || 1);
  const conqueredLevels = useMemo(
    () => Array.from({ length: Math.max(0, Math.min(MAX_LEVEL, currentLevel)) }, (_, index) => index + 1),
    [currentLevel]
  );
  const upcomingLevels = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, MAX_LEVEL - currentLevel) },
        (_, index) => currentLevel + index + 1
      ),
    [currentLevel]
  );

  return (
    <div className="page level-journey-page" ref={shellRef}>
      <div className="level-journey-page-bg">
        <span ref={orbARef} className="level-journey-page-orb level-journey-page-orb-a" />
        <span ref={orbBRef} className="level-journey-page-orb level-journey-page-orb-b" />
      </div>

      <div className="page-header" data-journey-section>
        <div>
          <h1 className="page-title">Level Journey</h1>
          <p className="page-subtitle">Track your conquered levels and your path to Grandmaster.</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ marginTop: "24px" }} data-journey-section>
          Loading your level journey...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="card" style={{ marginTop: "24px" }} data-journey-section>
          <div className="auth-error">{error}</div>
        </div>
      ) : null}

      {!loading && !error && levelData ? (
        <>
          <section className="card level-journey-page-hero" style={{ marginTop: "24px" }} data-journey-section>
            <div className="level-journey-page-hero-main">
              <div className="level-journey-page-kicker">Profile Progress</div>
              <h2 className="level-journey-page-title">
                Level {currentLevel} / {MAX_LEVEL}
              </h2>
              <p className="level-journey-page-copy">
                Rank: <strong>{getRank(currentLevel)}</strong>
              </p>
            </div>
            <div className="level-journey-page-stats">
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Theme Audio</div>
                <button
                  className={`level-journey-sound-btn${soundEnabled ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setSoundEnabled((prev) => !prev)}
                >
                  {soundEnabled ? "On" : "Off"}
                </button>
              </div>
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Next Rank</div>
                <div className="level-journey-page-stat-value">{getNextRank(currentLevel) || "Grandmaster"}</div>
              </div>
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Levels Remaining</div>
                <div className="level-journey-page-stat-value">{getLevelsRemaining(currentLevel)}</div>
              </div>
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Total XP</div>
                <div className="level-journey-page-stat-value">{Number(levelData.totalXp || 0)}</div>
              </div>
            </div>
          </section>

          <section data-journey-section>
            <LevelJourney levelData={levelData} />
          </section>

          <section className="grid grid-2" style={{ marginTop: "16px" }} data-journey-section>
            <div className="card level-journey-page-panel">
              <h3 className="card-title">Conquered Levels</h3>
              <div className="level-chip-wrap">
                {conqueredLevels.map((value) => (
                  <span key={`done-${value}`} className="level-chip level-chip-done">
                    {value}
                  </span>
                ))}
              </div>
            </div>
            <div className="card level-journey-page-panel">
              <h3 className="card-title">Upcoming Levels</h3>
              <div className="level-chip-wrap">
                {upcomingLevels.length ? (
                  upcomingLevels.map((value) => (
                    <span key={`locked-${value}`} className="level-chip level-chip-locked">
                      {value}
                    </span>
                  ))
                ) : (
                  <span className="student-directory-meta">All levels conquered. Grandmaster unlocked.</span>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
