import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Leaderboard() {
  const [data, setData] = useState(null);

  const load = async () => {
    const res = await api.get("/leaderboard").then((r) => r.data);
    setData(res);
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Leaderboards</h1>
            <p className="page-subtitle">Loading rankings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leaderboards</h1>
          <p className="page-subtitle">Attendance streaks and academic performance.</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: "24px" }}>
        <div className="card">
          <h2 className="card-title">Top Streaks</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Streak</th>
              </tr>
            </thead>
            <tbody>
              {data.streaks.map((row) => (
                <tr key={row.studentId}>
                  <td>{row.name}</td>
                  <td>{row.streak} days</td>
                </tr>
              ))}
              {!data.streaks.length && (
                <tr>
                  <td colSpan="2">No streak data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="card-title">Top Scores</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {data.averages.map((row) => (
                <tr key={row.studentId}>
                  <td>{row.name}</td>
                  <td>{row.percent}%</td>
                </tr>
              ))}
              {!data.averages.length && (
                <tr>
                  <td colSpan="2">No marks yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
