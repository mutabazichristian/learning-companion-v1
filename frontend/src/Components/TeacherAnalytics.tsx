import React, { useState, useEffect } from "react";
import api from "../api/axios";
import "./TeacherAnalytics.css";

interface MasteryStats {
  mastered: number;
  partial: number;
  struggling: number;
}

interface ConceptHeatmap {
  concept: string;
  mastery_rate: number;
  struggle_rate: number;
  total_students_engaged: number;
  avg_difficulty: number;
  status_summary: MasteryStats;
}

interface TeacherAnalyticsProps {
  docId: string;
}

const TeacherAnalytics: React.FC<TeacherAnalyticsProps> = ({ docId }) => {
  const [heatmap, setHeatmap] = useState<ConceptHeatmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/documents/${docId}/analytics`);
        setHeatmap(res.data as ConceptHeatmap[]);
        setError("");
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Failed to load class analytics.");
      } finally {
        setLoading(false);
      }
    };

    if (docId) fetchAnalytics();
  }, [docId]);

  if (loading)
    return <div className="analytics-loading">Analyzing class progress...</div>;
  if (error) return <div className="analytics-error">{error}</div>;
  if (heatmap.length === 0)
    return (
      <div className="analytics-empty">
        No student data recorded for this document yet.
      </div>
    );

  return (
    <div className="teacher-analytics">
      <div className="analytics-header">
        <h4>Class Mastery Heatmap</h4>
        <p>
          Insights aggregated from all student interactions with this document.
        </p>
      </div>

      <div className="heatmap-grid">
        {heatmap.map((item, index) => (
          <div key={index} className="heatmap-card">
            <div className="card-top">
              <span className="concept-label">{item.concept}</span>
              <span className="engagement-pill">
                {item.total_students_engaged} students
              </span>
            </div>

            <div className="mastery-viz">
              <div
                className="mastery-segment mastered"
                style={{ flex: item.status_summary.mastered }}
                title={`Mastered: ${item.status_summary.mastered}`}
              />
              <div
                className="mastery-segment partial"
                style={{ flex: item.status_summary.partial }}
                title={`Partial: ${item.status_summary.partial}`}
              />
              <div
                className="mastery-segment struggling"
                style={{ flex: item.status_summary.struggling }}
                title={`Struggling: ${item.status_summary.struggling}`}
              />
            </div>

            <div className="card-metrics">
              <div className="metric">
                <span className="metric-val">
                  {Math.round(item.mastery_rate * 100)}%
                </span>
                <span className="metric-label">Success Rate</span>
              </div>
              <div className="metric">
                <span className="metric-val">Lvl {item.avg_difficulty}</span>
                <span className="metric-label">Avg Complexity</span>
              </div>
              {item.struggle_rate > 0.4 && (
                <div className="gap-warning">⚠️ Learning Gap Detected</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherAnalytics;
