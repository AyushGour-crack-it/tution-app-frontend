import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const DetailRow = ({ label, value }) => (
  <div className="list-item">
    <div style={{ fontWeight: 600 }}>{label}</div>
    <div>{value || "-"}</div>
  </div>
);

export default function TeacherStudentProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.get(`/students/directory/${userId}`).then((res) => res.data);
        if (!cancelled) setStudent(data || null);
      } catch (err) {
        if (!cancelled) {
          setStudent(null);
          setError(err?.response?.data?.message || "Failed to load student profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Biodata</h1>
          <p className="page-subtitle">All registration/profile fields except password and profile picture.</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => navigate("/students")}>
          Back to Students
        </button>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        {loading ? <div>Loading...</div> : null}
        {error ? <div className="auth-error">{error}</div> : null}
        {!loading && !error && student ? (
          <div className="grid grid-2">
            <div className="card">
              <h2 className="card-title">Basic Details</h2>
              <div className="list">
                <DetailRow label="Full Name" value={student.name} />
                <DetailRow label="Email" value={student.email} />
                <DetailRow label="Phone" value={student.phone} />
                <DetailRow label="Bio" value={student.bio} />
                <DetailRow label="Roll Number" value={student.rollNumber} />
                <DetailRow label="Class / Grade" value={student.grade} />
                <DetailRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
                <DetailRow label="Tuition Joined On" value={formatDate(student.joinedAt)} />
                <DetailRow label="Monthly Fee" value={student.monthlyFee ? money(student.monthlyFee) : "-"} />
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">School & Contact</h2>
              <div className="list">
                <DetailRow label="School Name" value={student.schoolName} />
                <DetailRow label="Address" value={student.address} />
                <DetailRow label="Emergency Contact" value={student.emergencyContact} />
                <DetailRow label="Guardian Name" value={student.guardian?.name} />
                <DetailRow label="Guardian Phone" value={student.guardian?.phone} />
                <DetailRow label="Guardian Relation" value={student.guardian?.relation} />
                <DetailRow label="Guardian Email" value={student.guardian?.email} />
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">Academic Profile</h2>
              <div className="list">
                <DetailRow label="Strong Subjects" value={(student.strongSubjects || []).join(", ")} />
                <DetailRow label="Weak Subjects" value={(student.weakSubjects || []).join(", ")} />
                <DetailRow label="Subjects" value={(student.subjects || []).join(", ")} />
                <DetailRow label="Goals" value={student.goals} />
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">Personal Interests</h2>
              <div className="list">
                <DetailRow label="Hobbies" value={(student.hobbies || []).join(", ")} />
                <DetailRow label="Student ID (Profile Link)" value={student.studentProfileId} />
                <DetailRow label="Likes" value={String(student.likesCount || 0)} />
                <DetailRow label="Online Status" value={student.isOnline ? "Online" : "Offline"} />
                <DetailRow label="Last Seen" value={student.lastSeenAt ? new Date(student.lastSeenAt).toLocaleString() : "-"} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
