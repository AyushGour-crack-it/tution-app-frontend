import React from "react";

export default function ResultModal({ result, onClose }) {
  if (!result) return null;

  const levelUp = Number(result.newOverallLevel || 0) > Number(result.previousOverallLevel || 0);
  const motivational =
    Number(result.correctCount || 0) >= 4
      ? "You’re improving fast!"
      : "Let’s strengthen this topic";

  return (
    <div className="fee-success-popup-overlay" onClick={onClose}>
      <div className="fee-success-popup-card" onClick={(event) => event.stopPropagation()}>
        <div className="fee-success-popup-pill">Quiz Complete</div>
        <h2 className="fee-success-popup-title">+{Number(result.earnedXP || 0)} XP</h2>
        <p className="fee-success-popup-text">
          Correct: {Number(result.correctCount || 0)} / {Number(result.totalQuestions || 5)}
        </p>
        <p className="fee-success-popup-text">Streak: {Number(result.streakCount || 0)} days</p>
        <p className="fee-success-popup-text">
          Overall Level: {Number(result.newOverallLevel || 0)}
        </p>
        <p className="fee-success-popup-text">
          Subject Level: {Number(result.newSubjectLevel || 0)}
        </p>
        {levelUp ? <div className="pill">Level Up!</div> : null}
        <p className="fee-success-popup-text">{motivational}</p>
        <button className="btn" type="button" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}
