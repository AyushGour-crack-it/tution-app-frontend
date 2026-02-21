import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { api } from "../api.js";
import { MAX_LEVEL, getLevelsRemaining, getNextRank, getRank } from "../levelSystem.js";

const JOURNEY_SOUNDTRACK_URL = "/musicthemes/astronaut12-level-up-life_astronaut-265931.mp3";
gsap.registerPlugin(ScrollTrigger);

export default function LevelJourneyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [levelData, setLevelData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hypeMode, setHypeMode] = useState(true);
  const [newlyUnlockedZones, setNewlyUnlockedZones] = useState([]);
  const [cinematicPlaying, setCinematicPlaying] = useState(false);
  const shellRef = useRef(null);
  const orbARef = useRef(null);
  const orbBRef = useRef(null);
  const mapViewportRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const mapSectionRef = useRef(null);
  const heroSectionRef = useRef(null);
  const zoneBadgeSectionRef = useRef(null);
  const mapPathRef = useRef(null);
  const mapEnergyRef = useRef(null);
  const rankRef = useRef(null);
  const xpFillRef = useRef(null);
  const nodeRefs = useRef([]);
  const pulseTweenRef = useRef(null);
  const cinematicTlRef = useRef(null);
  const mapTriggerRef = useRef(null);
  const hasMapPlayedRef = useRef(false);
  const zoneBadgeRefs = useRef({});
  const soundtrackRef = useRef(null);

  const currentLevel = Number(levelData?.level || 1);
  const rank = getRank(currentLevel);
  const nextRank = getNextRank(currentLevel);
  const levelsRemaining = getLevelsRemaining(currentLevel);
  const progressPercent = Math.max(0, Math.min(100, Number(levelData?.progressPercent || 0)));
  const isGrandmaster = currentLevel >= MAX_LEVEL;
  const conqueredCount = Math.max(0, currentLevel - 1);
  const xpToNext = Math.max(0, Number(levelData?.nextLevelXp || 0) - Number(levelData?.currentLevelXp || 0));

  const levels = useMemo(
    () =>
      Array.from({ length: MAX_LEVEL }, (_, index) => {
        const value = index + 1;
        const status = value < currentLevel ? "done" : value === currentLevel ? "current" : "locked";
        return { value, status, isGrand: value === MAX_LEVEL };
      }),
    [currentLevel]
  );
  const particles = useMemo(() => Array.from({ length: 20 }, (_, index) => index), []);
  const mapNodes = useMemo(
    () => [
      { x: 14, y: 100 },
      { x: 32, y: 220 },
      { x: 56, y: 340 },
      { x: 80, y: 460 },
      { x: 62, y: 580 },
      { x: 38, y: 700 },
      { x: 16, y: 820 },
      { x: 30, y: 940 },
      { x: 54, y: 1060 },
      { x: 78, y: 1180 },
      { x: 60, y: 1300 },
      { x: 36, y: 1420 },
      { x: 14, y: 1540 },
      { x: 32, y: 1660 },
      { x: 56, y: 1780 }
    ],
    []
  );
  const mapZones = useMemo(
    () => [
      {
        id: "foundation",
        title: "Foundation District",
        subtitle: "Habits, focus, consistency",
        fromLevel: 1,
        toLevel: 3,
        top: 70,
        height: 340,
        focus: "Discipline XP",
        icon: "⚔"
      },
      {
        id: "scholar",
        title: "Scholar Lab",
        subtitle: "Concept clarity and practice depth",
        fromLevel: 4,
        toLevel: 6,
        top: 430,
        height: 350,
        focus: "Knowledge XP",
        icon: "📚"
      },
      {
        id: "problem",
        title: "Problem Forge",
        subtitle: "Speed, accuracy, exam pressure",
        fromLevel: 7,
        toLevel: 9,
        top: 800,
        height: 350,
        focus: "Challenge XP",
        icon: "🧠"
      },
      {
        id: "mastery",
        title: "Mastery Citadel",
        subtitle: "Retention, revision, leadership",
        fromLevel: 10,
        toLevel: 12,
        top: 1170,
        height: 350,
        focus: "Mastery XP",
        icon: "🏛"
      },
      {
        id: "legend",
        title: "Grand Summit",
        subtitle: "Elite consistency and impact",
        fromLevel: 13,
        toLevel: 15,
        top: 1540,
        height: 300,
        focus: "Legacy XP",
        icon: "👑"
      }
    ],
    []
  );
  const mapHeight = 1880;
  const mapPath = useMemo(
    () =>
      mapNodes
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" "),
    [mapNodes]
  );
  const unlockedZoneCount = useMemo(
    () => mapZones.filter((zone) => currentLevel >= zone.fromLevel).length,
    [currentLevel, mapZones]
  );

  const stopAmbient = useCallback(() => {
    const audio = soundtrackRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const startAmbient = useCallback(() => {
    let audio = soundtrackRef.current;
    if (!audio) {
      audio = new Audio(JOURNEY_SOUNDTRACK_URL);
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = 0.38;
      audio.muted = isMuted;
      soundtrackRef.current = audio;
    }
    audio.muted = isMuted;
    audio.play().catch(() => {
      // autoplay can be blocked until user interacts
    });
  }, [isMuted]);

  const runCinematic = useCallback(() => {
    if (!mapViewportRef.current || !mapCanvasRef.current || !mapPathRef.current || !rankRef.current || !xpFillRef.current || !mapEnergyRef.current) return;

    cinematicTlRef.current?.kill();
    pulseTweenRef.current?.kill();

    const nodes = nodeRefs.current.filter(Boolean);
    const viewport = mapViewportRef.current;
    const canvas = mapCanvasRef.current;
    const path = mapPathRef.current;
    const energy = mapEnergyRef.current;
    const rankEl = rankRef.current;
    const xpFill = xpFillRef.current;
    const pathLength = path.getTotalLength();
    const completedColor = "linear-gradient(155deg, #ffdba1, #f2b759)";
    const currentColor = "linear-gradient(150deg, #ffeab4, #f6c971)";
    const lockedColor = "rgba(95, 112, 128, 0.2)";
    const currentIndex = Math.max(0, Math.min(MAX_LEVEL - 1, currentLevel - 1));
    const stepCount = Math.max(1, currentIndex);
    const perStepDuration = Math.max(0.34, Math.min(0.62, 6.2 / stepCount));

    gsap.set(nodes, {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      color: "#8392a1",
      borderColor: "rgba(116, 129, 144, 0.5)",
      background: lockedColor,
      boxShadow: "0 0 0 rgba(0,0,0,0)"
    });
    gsap.set(path, {
      strokeDasharray: pathLength,
      strokeDashoffset: pathLength
    });
    gsap.set(rankEl, { opacity: 0, y: 10, filter: "blur(5px)" });
    gsap.set(xpFill, { width: "0%" });
    viewport.scrollTop = 0;

    const canvasRect = canvas.getBoundingClientRect();
    const points = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left - canvasRect.left + rect.width / 2,
        y: rect.top - canvasRect.top + rect.height / 2
      };
    });
    const startPoint = points[0] || { x: 0, y: 0 };
    gsap.set(energy, {
      x: startPoint.x,
      y: startPoint.y,
      opacity: 1,
      scale: 0.86
    });

    const viewportHeight = viewport.clientHeight;
    const canvasHeight = canvas.scrollHeight;
    const getScrollTarget = (index) => {
      const node = nodes[index];
      if (!node) return 0;
      const nodeCenter = node.offsetTop + node.offsetHeight / 2;
      return Math.max(0, Math.min(canvasHeight - viewportHeight, nodeCenter - viewportHeight / 2));
    };
    const activePathRatio = currentIndex / Math.max(1, MAX_LEVEL - 1);
    const targetDashOffset = pathLength * (1 - Math.max(0.02, activePathRatio));

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onStart: () => setCinematicPlaying(true),
      onComplete: () => {
        setCinematicPlaying(false);
      }
    });
    tl.to(path, { strokeDashoffset: targetDashOffset, duration: Math.max(3.8, Math.min(6.8, currentLevel * 0.44)), ease: "none" }, 0)
      .to(viewport, { scrollTop: getScrollTarget(Math.max(0, currentIndex - 1)), duration: 1.8, ease: "power3.out" }, 0)
      .to(energy, { scale: 1, duration: 0.62, ease: "power2.out" }, 0.14);

    for (let index = 0; index < currentIndex; index += 1) {
      const nextPoint = points[index + 1] || points[index];
      const segmentStart = 0.22 + index * perStepDuration;
      tl.to(
        energy,
        {
          x: nextPoint.x,
          y: nextPoint.y,
          duration: perStepDuration,
          ease: "power3.inOut"
        },
        segmentStart
      ).to(
        viewport,
        {
          scrollTop: getScrollTarget(index + 1),
          duration: perStepDuration,
          ease: "power3.inOut"
        },
        segmentStart
      ).to(
        nodes[index],
        {
          background: completedColor,
          color: "#3f2808",
          borderColor: "rgba(255, 209, 135, 0.75)",
          boxShadow: "0 0 14px rgba(255, 199, 106, 0.32)",
          duration: 0.34
        },
        segmentStart + perStepDuration * 0.64
      ).to(
        nodes[index],
        {
          scale: 1.2,
          duration: 0.34,
          yoyo: true,
          repeat: 1,
          ease: "power2.out"
        },
        segmentStart + perStepDuration * 0.66
      );
    }

    tl.to(
      nodes[currentIndex],
      {
        background: currentColor,
        color: "#2c1d06",
        borderColor: "rgba(255, 216, 138, 0.95)",
        boxShadow: "0 0 24px rgba(255, 214, 120, 0.62)",
        scale: 1.1,
        duration: 0.38
      },
      `+=${Math.max(0.2, perStepDuration * 0.34)}`
    ).to(
      nodes[currentIndex],
      {
        scale: 1,
        duration: 0.48,
        ease: "power3.out"
      }
    ).to(rankEl, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.92 }, "-=0.02")
      .to(xpFill, { width: `${progressPercent}%`, duration: 1.9, ease: "power3.out" }, "-=0.1");

    if (isGrandmaster && shellRef.current) {
      tl.to(shellRef.current, { scale: 1.01, duration: 0.22 }, "-=0.18")
        .to(shellRef.current, { scale: 1, duration: 0.22 }, "-=0.03");
    }

    pulseTweenRef.current = nodes[currentIndex]
      ? gsap.to(nodes[currentIndex], {
          boxShadow: "0 0 26px rgba(255, 214, 118, 0.7)",
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        })
      : null;
    cinematicTlRef.current = tl;
  }, [currentLevel, isGrandmaster, progressPercent]);

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
    const orbA = orbARef.current
      ? gsap.to(orbARef.current, { y: -24, x: 12, duration: 5.1, yoyo: true, repeat: -1, ease: "sine.inOut" })
      : null;
    const orbB = orbBRef.current
      ? gsap.to(orbBRef.current, { y: 20, x: -14, duration: 5.8, yoyo: true, repeat: -1, ease: "sine.inOut" })
      : null;
    return () => {
      orbA?.kill();
      orbB?.kill();
    };
  }, []);

  useEffect(() => {
    if (loading || error || !levelData || !shellRef.current) return undefined;
    const ctx = gsap.context(() => {
      if (heroSectionRef.current) {
        gsap.from(".level-journey-page-hero-main > *", {
          opacity: 0,
          y: 20,
          duration: 0.72,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: heroSectionRef.current,
            start: "top 72%",
            once: true
          }
        });
        gsap.from(".level-journey-page-stat", {
          opacity: 0,
          y: 20,
          duration: 0.64,
          stagger: 0.09,
          ease: "power2.out",
          scrollTrigger: {
            trigger: heroSectionRef.current,
            start: "top 70%",
            once: true
          }
        });
      }

      if (zoneBadgeSectionRef.current) {
        gsap.from(".level-zone-badge", {
          opacity: 0,
          y: 24,
          scale: 0.96,
          duration: 0.74,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: zoneBadgeSectionRef.current,
            start: "top 72%",
            once: true
          }
        });
      }

      if (mapSectionRef.current) {
        gsap.from(".level-cinematic-head, .level-cinematic-hype-strip, .level-cinematic-xp", {
          opacity: 0,
          y: 18,
          duration: 0.64,
          stagger: 0.11,
          ease: "power2.out",
          scrollTrigger: {
            trigger: mapSectionRef.current,
            start: "top 66%",
            once: true
          }
        });

        gsap.to(".level-map-zone", {
          yPercent: -5,
          ease: "none",
          stagger: 0.03,
          scrollTrigger: {
            trigger: mapSectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.8
          }
        });
      }
    }, shellRef);

    return () => {
      ctx.revert();
    };
  }, [error, levelData, loading]);

  useEffect(() => {
    if (!mapEnergyRef.current) return undefined;
    const idle = gsap.to(mapEnergyRef.current, {
      scale: 1.07,
      duration: 1.1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    return () => idle.kill();
  }, []);

  useEffect(() => {
    if (loading || error || !levelData || !mapSectionRef.current) return;
    mapTriggerRef.current?.kill();
    mapTriggerRef.current = ScrollTrigger.create({
      trigger: mapSectionRef.current,
      start: "top 45%",
      once: true,
      onEnter: () => {
        if (hasMapPlayedRef.current) return;
        hasMapPlayedRef.current = true;
        runCinematic();
      }
    });
    return () => {
      mapTriggerRef.current?.kill();
      mapTriggerRef.current = null;
    };
  }, [error, levelData, loading, runCinematic]);

  useEffect(() => {
    if (!levelData) return;
    const key = "ot_seen_zone_unlock_count_v1";
    const seen = Number(localStorage.getItem(key) || 0);
    if (unlockedZoneCount > seen) {
      const newlyUnlocked = mapZones.slice(seen, unlockedZoneCount).map((zone) => zone.id);
      setNewlyUnlockedZones(newlyUnlocked);
      localStorage.setItem(key, String(unlockedZoneCount));
    } else {
      setNewlyUnlockedZones([]);
    }
  }, [levelData, mapZones, unlockedZoneCount]);

  useEffect(() => {
    if (!newlyUnlockedZones.length) return undefined;
    const targets = newlyUnlockedZones.map((zoneId) => zoneBadgeRefs.current[zoneId]).filter(Boolean);
    if (!targets.length) return undefined;
    const tl = gsap.timeline();
    tl.fromTo(
      targets,
      {
        scale: 0.86,
        y: 14,
        opacity: 0.4,
        boxShadow: "0 0 0 rgba(255, 200, 110, 0)"
      },
      {
        scale: 1,
        y: 0,
        opacity: 1,
        boxShadow: "0 0 34px rgba(255, 206, 124, 0.42)",
        duration: 0.64,
        stagger: 0.1,
        ease: "back.out(1.9)"
      }
    );
    tl.to(
      targets,
      {
        boxShadow: "0 0 18px rgba(123, 196, 255, 0.3)",
        duration: 0.58,
        stagger: 0.08,
        ease: "sine.out"
      },
      "+=0.12"
    );
    const clearTimer = window.setTimeout(() => setNewlyUnlockedZones([]), 2800);
    return () => {
      tl.kill();
      window.clearTimeout(clearTimer);
    };
  }, [newlyUnlockedZones]);

  useEffect(() => {
    startAmbient();
    const retryAmbient = () => startAmbient();
    window.addEventListener("pointerdown", retryAmbient, { passive: true });
    window.addEventListener("keydown", retryAmbient);
    return () => {
      window.removeEventListener("pointerdown", retryAmbient);
      window.removeEventListener("keydown", retryAmbient);
      stopAmbient();
    };
  }, [startAmbient, stopAmbient]);

  useEffect(() => {
    if (!soundtrackRef.current) return;
    soundtrackRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(
    () => () => {
      stopAmbient();
      pulseTweenRef.current?.kill();
      cinematicTlRef.current?.kill();
      mapTriggerRef.current?.kill();
      mapTriggerRef.current = null;
      if (soundtrackRef.current) {
        soundtrackRef.current.src = "";
        soundtrackRef.current = null;
      }
    },
    [stopAmbient]
  );

  return (
    <div className={`page level-journey-page level-journey-cinematic${hypeMode ? " level-journey-hype" : ""}`} ref={shellRef}>
      <div className="level-journey-page-bg">
        <span className="level-journey-vignette" />
        <span className="level-journey-scanline" />
        <span ref={orbARef} className="level-journey-page-orb level-journey-page-orb-a" />
        <span ref={orbBRef} className="level-journey-page-orb level-journey-page-orb-b" />
        {particles.map((particle) => (
          <span
            key={`p-${particle}`}
            className="level-journey-particle"
            style={{
              left: `${4 + ((particle * 7.7) % 92)}%`,
              animationDelay: `${(particle % 8) * 0.55}s`,
              animationDuration: `${6 + (particle % 5) * 1.2}s`
            }}
          />
        ))}
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Level Journey</h1>
          <p className="page-subtitle">Cinematic reveal of your progress path.</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ marginTop: "24px" }}>
          Loading your journey...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="card" style={{ marginTop: "24px" }}>
          <div className="auth-error">{error}</div>
        </div>
      ) : null}

      {!loading && !error && levelData ? (
        <>
          <section ref={heroSectionRef} className="card level-journey-page-hero" style={{ marginTop: "24px" }}>
            <div className="level-journey-page-hero-main">
              <div className="level-journey-page-kicker">Cinematic Mode</div>
              <h2 className="level-journey-page-title">Level {currentLevel} / {MAX_LEVEL}</h2>
              <p className="level-journey-page-copy">
                {isGrandmaster ? "Grandmaster Achieved" : `Next Rank: ${nextRank || "Grandmaster"}`}
              </p>
            </div>
            <div className="level-journey-page-stats">
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Current Rank</div>
                <div className="level-journey-page-stat-value">{rank}</div>
              </div>
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Levels Remaining</div>
                <div className="level-journey-page-stat-value">{levelsRemaining}</div>
              </div>
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Total XP</div>
                <div className="level-journey-page-stat-value">{Number(levelData.totalXp || 0)}</div>
              </div>
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Ambient Audio</div>
                <button
                  className={`level-journey-sound-btn${isMuted ? "" : " is-active"}`}
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                >
                  {isMuted ? "Muted" : "On"}
                </button>
              </div>
              <div className="level-journey-page-stat">
                <div className="level-journey-page-stat-label">Visual Mode</div>
                <button
                  className={`level-journey-sound-btn${hypeMode ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setHypeMode((prev) => !prev)}
                >
                  {hypeMode ? "Hype On" : "Hype Off"}
                </button>
              </div>
            </div>
          </section>

          <section ref={zoneBadgeSectionRef} className="card level-zone-badges" style={{ marginTop: "16px" }}>
            <div className="level-zone-badges-head">
              <h3 className="card-title">Zone Badges</h3>
              <div className="level-zone-badges-meta">
                {unlockedZoneCount} / {mapZones.length} unlocked
              </div>
            </div>
            <div className="level-zone-badges-grid">
              {mapZones.map((zone) => {
                const state =
                  currentLevel < zone.fromLevel
                    ? "locked"
                    : currentLevel <= zone.toLevel
                      ? "active"
                      : "done";
                const isNew = newlyUnlockedZones.includes(zone.id);
                return (
                  <article
                    key={zone.id}
                    ref={(el) => {
                      zoneBadgeRefs.current[zone.id] = el;
                    }}
                    className={`level-zone-badge level-zone-badge-${zone.id} level-zone-badge-${state}${isNew ? " is-new" : ""}`}
                  >
                    <div className="level-zone-badge-icon">{zone.icon}</div>
                    <div className="level-zone-badge-title">{zone.title}</div>
                    <div className="level-zone-badge-subtitle">{zone.subtitle}</div>
                    <div className="level-zone-badge-row">
                      <span>Lv {zone.fromLevel}-{zone.toLevel}</span>
                      <span>{zone.focus}</span>
                    </div>
                    <div className="level-zone-badge-state">
                      {state === "locked"
                        ? `Unlocks at Lv ${zone.fromLevel}`
                        : state === "active"
                          ? "Current Zone"
                          : "Badge Claimed"}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            ref={mapSectionRef}
            className={`card level-cinematic-stage${cinematicPlaying ? " level-cinematic-stage-playing" : ""}`}
            style={{ marginTop: "16px" }}
          >
            <div className={`level-cinematic-overlay${cinematicPlaying ? " is-active" : ""}`} aria-hidden="true">
              <div className="level-cinematic-bar level-cinematic-bar-top" />
              <div className="level-cinematic-bar level-cinematic-bar-bottom" />
              <div className="level-cinematic-caption">SCENE: STUDENT ASCENSION</div>
            </div>
            <div className="level-cinematic-head">
              <div className="level-cinematic-rank" ref={rankRef}>
                {rank}
              </div>
              <button className="btn btn-ghost level-cinematic-replay" type="button" onClick={runCinematic}>
                Replay Cinematic
              </button>
            </div>
            <div className="level-cinematic-hype-strip">
              <div className="level-cinematic-hype-chip">Conquered {conqueredCount} levels</div>
              <div className="level-cinematic-hype-chip">XP to next: {xpToNext}</div>
              <div className="level-cinematic-hype-chip">
                Track: {rank}{nextRank ? ` -> ${nextRank}` : " -> MAX"}
              </div>
              <div className="level-cinematic-hype-chip">Student Power Path</div>
            </div>

            <div className="level-cinematic-viewport" ref={mapViewportRef}>
              <div className="level-map-canvas" ref={mapCanvasRef}>
                {mapZones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`level-map-zone level-map-zone-${zone.id}`}
                    style={{ top: `${zone.top}px`, height: `${zone.height}px` }}
                  >
                    <div className="level-map-zone-title">{zone.title}</div>
                    <div className="level-map-zone-subtitle">{zone.subtitle}</div>
                    <div className="level-map-zone-meta">
                      Lv {zone.fromLevel}-{zone.toLevel} • {zone.focus}
                    </div>
                  </div>
                ))}
                <svg className="level-map-svg" viewBox={`0 0 100 ${mapHeight}`} preserveAspectRatio="none" aria-hidden="true">
                  <path className="level-map-path-ghost" d={mapPath} />
                  <path className="level-map-path-live" d={mapPath} ref={mapPathRef} />
                </svg>
                <div className="level-map-energy" ref={mapEnergyRef} />
                {levels.map((item, index) => (
                  <div
                    key={item.value}
                    ref={(el) => {
                      nodeRefs.current[item.value - 1] = el;
                    }}
                    className={`level-cinematic-node level-cinematic-node-${item.status}${item.isGrand ? " level-cinematic-node-grand" : ""}`}
                    title={`Level ${item.value}`}
                    style={{ left: `${mapNodes[index].x}%`, top: `${mapNodes[index].y}px` }}
                  >
                    <span>{item.value}</span>
                    {item.isGrand ? <span className="level-cinematic-crown">👑</span> : null}
                  </div>
                ))}
                <div className="level-map-start-marker">START</div>
                <div className="level-map-end-marker">BOSS</div>
              </div>
            </div>

            <div className="level-cinematic-xp">
              <div className="level-cinematic-xp-track">
                <div className="level-cinematic-xp-fill" ref={xpFillRef} />
              </div>
              <div className="level-cinematic-xp-text">
                {Number(levelData.currentLevelXp || 0)} / {Number(levelData.nextLevelXp || 0)} XP
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
