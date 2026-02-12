export function resolveAvatarFrame({ badges = [], totalXp = 0, level = 1, rank = null }) {
  const safeBadges = Array.isArray(badges) ? badges : [];
  const maxBadgeXp = safeBadges.reduce((max, badge) => {
    const xp = Number(badge?.xpValue) || 0;
    return xp > max ? xp : max;
  }, 0);
  const legendaryCount = safeBadges.filter((badge) => (Number(badge?.xpValue) || 0) >= 450).length;

  if (maxBadgeXp >= 1000) {
    return { frameClass: "frame-legendary-cosmic", frameLabel: "Cosmic Frame" };
  }
  if (legendaryCount >= 3) {
    return { frameClass: "frame-legendary-dual", frameLabel: "Dual Legendary Frame" };
  }
  if (maxBadgeXp >= 450) {
    return { frameClass: "frame-legendary-gold", frameLabel: "Legendary Gold Frame" };
  }

  if (rank === 1) {
    return { frameClass: "frame-premium-crystal", frameLabel: "Crystal Frame" };
  }
  if (rank === 2 || rank === 3) {
    return { frameClass: "frame-premium-royal", frameLabel: "Royal Frame" };
  }

  const xp = Number(totalXp) || 0;
  const lv = Number(level) || 1;
  if (xp >= 1200 || lv >= 11) {
    return { frameClass: "frame-premium-crystal", frameLabel: "Crystal Frame" };
  }
  if (xp >= 900 || lv >= 9) {
    return { frameClass: "frame-premium-emerald", frameLabel: "Emerald Frame" };
  }
  if (xp >= 700 || lv >= 7) {
    return { frameClass: "frame-premium-flame", frameLabel: "Flame Frame" };
  }
  if (xp >= 500 || lv >= 6) {
    return { frameClass: "frame-premium-royal", frameLabel: "Royal Frame" };
  }
  if (xp >= 300 || lv >= 4) {
    return { frameClass: "frame-premium-electric", frameLabel: "Electric Frame" };
  }
  if (xp >= 120 || lv >= 3) {
    return { frameClass: "frame-standard-blue", frameLabel: "Standard Blue Frame" };
  }
  if (xp >= 40 || lv >= 2) {
    return { frameClass: "frame-standard-green", frameLabel: "Standard Green Frame" };
  }
  return { frameClass: "frame-standard-gray", frameLabel: "Standard Frame" };
}
