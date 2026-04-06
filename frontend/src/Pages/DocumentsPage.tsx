import React, { useState, useEffect, ChangeEvent } from "react";
import api from "../api/axios";
import PDFViewer from "../Components/PDFViewer";
import QuestioningPanel from "../Components/QuestioningPanel";

import { usePDFContext } from "../contexts/PDFContext";
import { useAuth } from "../contexts/AuthContext";
import "./DocumentsPage.css";

interface DocumentItem {
  doc_id: string;
  title: string;
  owner: string;
  total_pages: number;
  concepts?: { [key: number]: string[] };
}

interface UploadResponse extends DocumentItem {
  concepts: { [key: number]: string[] };
}

const DocumentsPage: React.FC = () => {
  const {
    pdfFile,
    pdfName,
    currentPage,
    docId,
    totalPages,
    pagesConcepts,
    conceptProgress,
    setPdfFile,
    setPdfName,
    setCurrentPage,
    setDocId,
    setTotalPages,
    setPagesConcepts,
    setConceptMap,
    clearPDF,
  } = usePDFContext();

  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPageConcepts, setCurrentPageConcepts] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string>("");
  const [showSummary, setShowSummary] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [docAnalytics, setDocAnalytics] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "processing" | "done"
  >("idle");
  const { role } = useAuth();

  const masteryStats = React.useMemo(() => {
    const allConcepts = Object.values(pagesConcepts).flat();
    if (allConcepts.length === 0) return { percent: 0, mastered: 0, total: 0 };

    const uniqueConcepts = Array.from(new Set(allConcepts));
    const mastered = uniqueConcepts.filter(
      (c) => conceptProgress[c]?.status === "mastered",
    ).length;
    const partial = uniqueConcepts.filter(
      (c) => conceptProgress[c]?.status === "partial",
    ).length;

    const score = mastered + partial * 0.5;
    const percent = Math.round((score / uniqueConcepts.length) * 100);

    return { percent, mastered, total: uniqueConcepts.length };
  }, [pagesConcepts, conceptProgress]);

  useEffect(() => {
    const concepts = (pagesConcepts && pagesConcepts[currentPage]) || [];
    setCurrentPageConcepts(concepts);
    if (concepts.length > 0 && !selectedConcept) {
      setSelectedConcept(concepts[0]);
    }
  }, [currentPage, pagesConcepts, selectedConcept]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const res = await api.get("/documents/list");
        setDocuments(res.data as DocumentItem[]);
      } catch (err) {
        setError("Unable to fetch documents");
      }
    };

    loadDocuments();
  }, [role]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setPdfFile(file);
    setIsLoading(true);
    setUploadProgress(0);
    setUploadState("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post<UploadResponse>(
        "/documents/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              setUploadProgress(
                Math.round((progressEvent.loaded * 100) / progressEvent.total),
              );
            }
          },
        } as any,
      );

      setUploadState("processing");

      const { doc_id, total_pages, concepts } = response.data;

      setDocId(doc_id);
      setTotalPages(total_pages);
      setPagesConcepts(concepts);
      setCurrentPage(1);
      setSelectedConcept(null);

      setDocuments((prev) => [...prev, response.data]);
      setPdfName(file.name);
      setPdfFile(file);
      setUploadState("done");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload PDF. Please try again.");
      clearPDF();
      setUploadState("idle");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const fetchAnalytics = async (doc_id: string) => {
    try {
      const res = await api.get(`/documents/${doc_id}/analytics`);
      setDocAnalytics(res.data as any[]);
      setShowAnalytics(true);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    }
  };

  const selectDoc = (doc: DocumentItem) => {
    setDocId(doc.doc_id);
    setTotalPages(doc.total_pages);
    setPagesConcepts(doc.concepts || {});
    setConceptMap({});
    setPdfName(doc.title);
    setCurrentPage(1);
    setSelectedConcept(null);
    setPdfFile(`http://localhost:8000/uploads/${doc.doc_id}.pdf` as any);
  };

  return (
    <div className="documents-page">
      <div className="document-list-panel">
        <h3>Available Documents</h3>
        {documents.length === 0 && <p>No documents uploaded yet.</p>}
        <ul>
          {documents.map((doc) => (
            <li key={doc.doc_id}>
              <button onClick={() => selectDoc(doc)}>
                {doc.title} ({doc.owner})
              </button>
              {role === "teacher" && (
                <div className="teacher-actions">
                  <button
                    className="analytics-btn"
                    onClick={() => fetchAnalytics(doc.doc_id)}
                  >
                    Gaps
                  </button>
                  <button
                    className="delete-btn"
                    onClick={async () => {
                      if (!window.confirm("Delete this document?")) return;
                      try {
                        await api.delete(`/documents/${doc.doc_id}`);
                        setDocuments((prev) =>
                          prev.filter((d) => d.doc_id !== doc.doc_id),
                        );
                        if (doc.doc_id === docId) clearPDF();
                      } catch (err) {
                        console.error("Delete doc failed", err);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      {!pdfFile || totalPages === 0 ? (
        <div className="upload-section">
          {role === "teacher" ? (
            <label className="upload-box">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              <span className="upload-text">
                {isLoading
                  ? uploadState === "uploading"
                    ? `Uploading... ${uploadProgress}%`
                    : uploadState === "processing"
                      ? "Processing PDF..."
                      : "Finalizing..."
                  : pdfName || "Choose PDF or upload"}
              </span>
              {isLoading && uploadState === "uploading" && (
                <div
                  style={{
                    width: "100%",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "4px",
                    marginTop: "8px",
                  }}
                >
                  <div
                    style={{
                      width: `${uploadProgress}%`,
                      height: "8px",
                      backgroundColor: "#4caf50",
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              )}
            </label>
          ) : (
            <div>Please select a document from the list to start reading.</div>
          )}
        </div>
      ) : (
        <div className="reader-container">
          <div className="pdf-panel">
            {pdfFile && (
              <PDFViewer
                file={pdfFile}
                currentPage={currentPage}
                numPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>

          <div className="right-sidebar">
            <div className="sidebar-section progress-section">
              <div className="selector-header">Document Mastery</div>
              <div className="mastery-progress-container">
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${masteryStats.percent}%` }}
                  ></div>
                </div>
                <div className="progress-labels">
                  <span>{masteryStats.percent}% Complete</span>
                  <span>
                    {masteryStats.mastered}/{masteryStats.total} Mastered
                  </span>
                </div>
              </div>
              <button
                className="end-session-btn"
                onClick={() => setShowSummary(true)}
                disabled={masteryStats.percent === 0}
              >
                End Session & Summary
              </button>
            </div>

            <div className="sidebar-section">
              <div className="selector-header">
                Concepts (Page {currentPage})
              </div>
              <div className="concept-list">
                {currentPageConcepts.length === 0 ? (
                  <p className="empty-text">No concepts found on this page.</p>
                ) : (
                  currentPageConcepts.map((concept, idx) => (
                    <button
                      key={idx}
                      className={`concept-btn ${selectedConcept === concept ? "active" : ""}`}
                      onClick={() => setSelectedConcept(concept)}
                    >
                      {concept}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="sidebar-section questioning-container">
              <QuestioningPanel currentConcept={selectedConcept} />
            </div>

            <button className="clear-btn" onClick={clearPDF}>
              Clear & Upload New
            </button>
          </div>
        </div>
      )}

      {showSummary && (
        <div className="summary-overlay">
          <div className="summary-modal">
            <div className="summary-header">
              <h2>Learning Summary</h2>
              <button className="close-x" onClick={() => setShowSummary(false)}>
                ×
              </button>
            </div>
            <div className="summary-content">
              <div className="summary-stat-grid">
                <div className="stat-card">
                  <label>Mastery</label>
                  <div className="value">{masteryStats.percent}%</div>
                </div>
                <div className="stat-card">
                  <label>Concepts Explored</label>
                  <div className="value">
                    {Object.keys(conceptProgress).length}
                  </div>
                </div>
              </div>

              <h3>Concepts Mastered</h3>
              <div className="summary-list">
                {Object.entries(conceptProgress)
                  .filter(([_, p]) => p.status === "mastered")
                  .map(([name, p]) => (
                    <div key={name} className="summary-item mastered">
                      <span className="check">✓</span>
                      <span className="name">{name}</span>
                      <span className="lvl">Level {p.difficulty}</span>
                    </div>
                  ))}
                {Object.entries(conceptProgress).filter(
                  ([_, p]) => p.status === "mastered",
                ).length === 0 && (
                  <p className="empty-msg">
                    Keep going to master your first concept!
                  </p>
                )}
              </div>

              <h3>In Progress</h3>
              <div className="summary-list">
                {Object.entries(conceptProgress)
                  .filter(
                    ([_, p]) =>
                      p.status === "partial" || p.status === "struggling",
                  )
                  .map(([name, p]) => (
                    <div key={name} className={`summary-item ${p.status}`}>
                      <span className="dot">•</span>
                      <span className="name">{name}</span>
                      <span className="status">{p.status}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="summary-footer">
              <button className="download-btn" onClick={() => window.print()}>
                Print Cheat Sheet
              </button>
              <button
                className="close-btn"
                onClick={() => setShowSummary(false)}
              >
                Continue Learning
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnalytics && (
        <div className="summary-overlay">
          <div className="summary-modal analytics-modal">
            <div className="summary-header">
              <h2>Learning Gaps Heatmap</h2>
              <button
                className="close-x"
                onClick={() => setShowAnalytics(false)}
              >
                ×
              </button>
            </div>
            <div className="summary-content">
              <p className="subtitle">
                Concepts sorted by struggle rate across all students.
              </p>
              <div className="analytics-list">
                {docAnalytics.length === 0 ? (
                  <p className="empty-msg">No student data recorded yet.</p>
                ) : (
                  docAnalytics.map((item, idx) => (
                    <div key={idx} className="analytics-card">
                      <div className="card-header">
                        <span className="concept-name">{item.concept}</span>
                        <span
                          className={`risk-badge ${item.struggle_rate > 0.4 ? "high" : item.struggle_rate > 0.1 ? "medium" : "low"}`}
                        >
                          {Math.round(item.struggle_rate * 100)}% Struggle
                        </span>
                      </div>
                      <div className="stat-row">
                        <div className="stat">
                          <label>Mastery Rate</label>
                          <span>{Math.round(item.mastery_rate * 100)}%</span>
                        </div>
                        <div className="stat">
                          <label>Avg Difficulty</label>
                          <span>Lvl {item.avg_difficulty}</span>
                        </div>
                        <div className="stat">
                          <label>Engagements</label>
                          <span>{item.total_students_engaged}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="summary-footer">
              <button
                className="close-btn"
                onClick={() => setShowAnalytics(false)}
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
