export const MAX_LEVEL = 15;

export const RANK_STEPS = [
  { min: 1, max: 3, label: "Beginner" },
  { min: 4, max: 6, label: "Learner" },
  { min: 7, max: 9, label: "Scholar" },
  { min: 10, max: 12, label: "Achiever" },
  { min: 13, max: 14, label: "Master" },
  { min: 15, max: 15, label: "Grandmaster" }
];

export const clampLevel = (level) => {
  const parsed = Number(level) || 1;
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(parsed)));
};

export const getRank = (level) => {
  const safeLevel = clampLevel(level);
  const found = RANK_STEPS.find((item) => safeLevel >= item.min && safeLevel <= item.max);
  return found ? found.label : "Beginner";
};

export const getNextRank = (level) => {
  const safeLevel = clampLevel(level);
  const current = getRank(safeLevel);
  const next = RANK_STEPS.find((item) => item.min > safeLevel && item.label !== current);
  return next ? next.label : null;
};

export const getLevelsRemaining = (level) => {
  const safeLevel = clampLevel(level);
  return Math.max(0, MAX_LEVEL - safeLevel);
};

export const LEVEL_UP_EVENT = "ot:level-up";

export const playLevelUpAnimation = (data = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LEVEL_UP_EVENT, {
      detail: {
        oldLevel: clampLevel(data.oldLevel || 1),
        newLevel: clampLevel(data.newLevel || data.oldLevel || 1),
        xpGained: Number(data.xpGained || 0),
        badgeUnlocked: data.badgeUnlocked || null
      }
    })
  );
};
