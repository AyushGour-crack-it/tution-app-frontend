import React from "react";

const initialSeconds = 30;

export default function QuizPage({ questions, onSubmit, loading }) {
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState([]);
  const [locked, setLocked] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(initialSeconds);

  const current = questions[index] || null;

  React.useEffect(() => {
    setIndex(0);
    setAnswers([]);
    setLocked(false);
    setSecondsLeft(initialSeconds);
  }, [questions]);

  React.useEffect(() => {
    if (!current || locked) return undefined;
    if (secondsLeft <= 0) {
      setLocked(true);
      return undefined;
    }
    const timeoutId = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timeoutId);
  }, [secondsLeft, current, locked]);

  if (!current) return null;

  const selected = answers.find((item) => item.questionId === current._id);
  const progressWidth = `${Math.max(0, (secondsLeft / initialSeconds) * 100)}%`;

  const selectOption = (optionIndex) => {
    if (locked || selected) return;
    setAnswers((prev) => [...prev, { questionId: current._id, selectedOption: optionIndex }]);
    setLocked(true);
  };

  const goNext = async () => {
    if (index >= questions.length - 1) {
      await onSubmit(answers);
      return;
    }
    setIndex((prev) => prev + 1);
    setLocked(false);
    setSecondsLeft(initialSeconds);
  };

  return (
    <div className="card" style={{ marginTop: "24px" }}>
      <h2 className="card-title">
        Question {index + 1} / {questions.length}
      </h2>
      <div className="badge">{current.subject} • {current.difficulty}</div>
      <div style={{ marginTop: "12px", fontWeight: 700 }}>{current.question}</div>
      <div className="badge-progress" style={{ marginTop: "12px" }}>
        <div className="badge-progress-fill" style={{ width: progressWidth }} />
      </div>
      <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--muted)" }}>
        Time left: {secondsLeft}s
      </div>
      <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
        {(current.options || []).map((option, optionIndex) => (
          <button
            key={`${current._id}-${optionIndex}`}
            className="btn btn-ghost"
            type="button"
            disabled={locked}
            onClick={() => selectOption(optionIndex)}
          >
            {option}
          </button>
        ))}
      </div>
      {locked ? (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--muted)" }}>
          Explanation: {current.explanation}
        </div>
      ) : null}
      <div style={{ marginTop: "16px" }}>
        <button className="btn" type="button" disabled={!locked || loading} onClick={goNext}>
          {index >= questions.length - 1 ? (loading ? "Submitting..." : "Submit Quiz") : "Next"}
        </button>
      </div>
    </div>
  );
}
