import React from "react";
import { api } from "../../ui/api.js";
import QuizSetup from "./QuizSetup.jsx";
import QuizPage from "./QuizPage.jsx";
import ResultModal from "./ResultModal.jsx";

const toEntries = (value) => Object.entries(value || {});

export default function QuizDashboard() {
  const [stats, setStats] = React.useState(null);
  const [meta, setMeta] = React.useState({ subjects: [], classLevels: [] });
  const [questions, setQuestions] = React.useState([]);
  const [loadingStats, setLoadingStats] = React.useState(true);
  const [loadingQuiz, setLoadingQuiz] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [activeSetup, setActiveSetup] = React.useState(null);
  const [error, setError] = React.useState("");

  const loadStats = React.useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await api.get("/quiz/stats").then((res) => res.data);
      const quizMeta = await api.get("/quiz/meta").then((res) => res.data || { subjects: [], classLevels: [] });
      setStats(data);
      setMeta(quizMeta);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load quiz stats");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const startQuiz = async ({ classLevel, subject, difficulty }) => {
    setLoadingQuiz(true);
    setError("");
    try {
      const data = await api
        .get("/quiz", {
          params: { classLevel, subject, difficulty }
        })
        .then((res) => res.data);
      const list = data?.questions || [];
      if (!list.length) {
        setError("No questions available right now.");
        setQuestions([]);
        setActiveSetup(null);
        return;
      }
      setQuestions(list);
      setActiveSetup({ classLevel, subject, difficulty });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start quiz");
      setQuestions([]);
      setActiveSetup(null);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const submitQuiz = async (answers) => {
    if (!activeSetup) return;
    setSubmitting(true);
    setError("");
    try {
      const previousOverallLevel = Number(stats?.overallLevel || 0);
      const data = await api
        .post("/quiz/submit", {
          answers,
          subject: activeSetup.subject
        })
        .then((res) => res.data);
      setResult({
        ...data,
        previousOverallLevel,
        totalQuestions: questions.length
      });
      setQuestions([]);
      setActiveSetup(null);
      await loadStats();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Skill Quiz Dashboard</h1>
          <p className="page-subtitle">Practice daily, grow streaks, and level up by subject.</p>
        </div>
      </div>
      {error ? (
        <div className="card" style={{ marginTop: "16px" }}>
          <div className="auth-error">{error}</div>
        </div>
      ) : null}
      <div className="grid grid-3" style={{ marginTop: "24px" }}>
        <div className="card">
          <div className="tag">Overall Level</div>
          <div className="dashboard-stat-value">{loadingStats ? "..." : Number(stats?.overallLevel || 0)}</div>
        </div>
        <div className="card">
          <div className="tag">Current Streak</div>
          <div className="dashboard-stat-value">{loadingStats ? "..." : Number(stats?.streakCount || 0)}</div>
        </div>
        <div className="card">
          <div className="tag">Total XP</div>
          <div className="dashboard-stat-value">{loadingStats ? "..." : Number(stats?.totalXP || 0)}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 className="card-title">Subject Progress</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          {toEntries(stats?.subjectXP).map(([subject, xp]) => {
            const progress = Number(xp || 0) % 150;
            const width = `${Math.max(0, Math.min(100, (progress / 150) * 100))}%`;
            const level = Number(stats?.subjectLevel?.[subject] || 0);
            return (
              <div key={subject}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span>{subject}</span>
                  <span>Lvl {level} • {Number(xp || 0)} XP</span>
                </div>
                <div className="badge-progress">
                  <div className="badge-progress-fill" style={{ width }} />
                </div>
              </div>
            );
          })}
          {!toEntries(stats?.subjectXP).length ? (
            <div style={{ color: "var(--muted)", fontSize: "12px" }}>
              No subject XP yet. Start your first quiz.
            </div>
          ) : null}
        </div>
      </div>

      {!questions.length ? (
        <QuizSetup stats={stats} meta={meta} onStart={startQuiz} loading={loadingQuiz} />
      ) : (
        <QuizPage questions={questions} onSubmit={submitQuiz} loading={submitting} />
      )}

      <ResultModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
