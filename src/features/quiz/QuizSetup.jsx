import React from "react";

const fallbackSubjects = ["Math", "Science", "English", "Social"];

const isDifficultyUnlocked = (difficulty, level) => {
  if (difficulty === "easy") return true;
  if (difficulty === "medium") return Number(level || 0) >= 2;
  if (difficulty === "hard") return Number(level || 0) >= 5;
  return false;
};

export default function QuizSetup({ stats, onStart, loading }) {
  const subjectXP = stats?.subjectXP || {};
  const subjectLevel = stats?.subjectLevel || {};
  const subjects = [...new Set([...fallbackSubjects, ...Object.keys(subjectXP)])];

  const [subject, setSubject] = React.useState(subjects[0] || "Math");
  const [difficulty, setDifficulty] = React.useState("easy");
  const [classLevel, setClassLevel] = React.useState(8);

  React.useEffect(() => {
    if (!subjects.includes(subject)) {
      setSubject(subjects[0] || "Math");
    }
  }, [subjects, subject]);

  React.useEffect(() => {
    const lvl = subjectLevel?.[subject] || 0;
    if (!isDifficultyUnlocked(difficulty, lvl)) {
      setDifficulty("easy");
    }
  }, [difficulty, subject, subjectLevel]);

  const selectedLevel = Number(subjectLevel?.[subject] || 0);

  return (
    <div className="card" style={{ marginTop: "24px" }}>
      <h2 className="card-title">Quiz Setup</h2>
      <div className="form">
        <select className="select" value={subject} onChange={(event) => setSubject(event.target.value)}>
          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min="1"
          max="12"
          value={classLevel}
          onChange={(event) => setClassLevel(Number(event.target.value || 1))}
          placeholder="Class Level"
        />
        <select className="select" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
          <option value="easy">Easy</option>
          <option value="medium" disabled={!isDifficultyUnlocked("medium", selectedLevel)}>
            Medium {isDifficultyUnlocked("medium", selectedLevel) ? "" : "(Locked)"}
          </option>
          <option value="hard" disabled={!isDifficultyUnlocked("hard", selectedLevel)}>
            Hard {isDifficultyUnlocked("hard", selectedLevel) ? "" : "(Locked)"}
          </option>
        </select>
        <button
          className="btn"
          type="button"
          disabled={loading}
          onClick={() => onStart({ subject, classLevel, difficulty })}
        >
          {loading ? "Loading..." : "Start Quiz"}
        </button>
      </div>
    </div>
  );
}
