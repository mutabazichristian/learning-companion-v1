import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { usePDFContext } from "../contexts/PDFContext";
import { useCitationHighlight } from "./CitationHighlight";
import "./QuestioningPanel.css";

interface QuestioningPanelProps {
  currentConcept: string | null;
}

interface AskQuestionResponse {
  question: string;
  evaluation?: string;
  feedback: string;
  source_chunks: any[];
  next_difficulty: number;
  scaffold_question?: string;
}

interface Message {
  id: string;
  type: "ai" | "user" | "feedback";
  content: string;
  evaluation?: string;
  sources?: any[];
}

const QuestioningPanel: React.FC<QuestioningPanelProps> = ({
  currentConcept,
}) => {
  const { docId, setCurrentPage, updateConceptProgress, conceptProgress } =
    usePDFContext();
  const { highlight, clear } = useCitationHighlight();

  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentProgress = currentConcept
    ? conceptProgress[currentConcept]
    : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const startLearning = async () => {
    if (!currentConcept || !docId) return;
    setIsLoading(true);

    setMessages([
      {
        id: Date.now().toString(),
        type: "ai",
        content: `Ready to discuss "${currentConcept}"? I'll ask a few questions to see how you're tracking.`,
      },
    ]);

    try {
      const response = await api.post<AskQuestionResponse>(
        "/reading/ask-question",
        {
          doc_id: docId,
          concept: currentConcept,
          difficulty_level: conceptProgress[currentConcept]?.difficulty || 1,
        },
      );
      const { question, source_chunks } = response.data;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: question,
          sources: source_chunks,
        },
      ]);
      setSources(source_chunks);
      highlight(source_chunks, setCurrentPage);
      setIsAnswered(false);
      setAnswer("");
    } catch (error) {
      console.error("Error starting questioning:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !currentConcept || !docId) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), type: "user", content: answer },
    ]);
    setIsLoading(true);

    try {
      const response = await api.post<AskQuestionResponse>(
        "/reading/ask-question",
        {
          doc_id: docId,
          concept: currentConcept,
          student_answer: answer,
          difficulty_level: conceptProgress[currentConcept]?.difficulty || 1,
        },
      );

      const {
        evaluation: evalRes,
        feedback,
        next_difficulty,
        scaffold_question,
      } = response.data;

      const feedbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "feedback",
        content: feedback,
        evaluation: evalRes,
        sources: sources,
      };

      const statusMap: Record<string, any> = {
        correct: "mastered",
        partially_correct: "partial",
        incorrect: "struggling",
      };

      updateConceptProgress(currentConcept, {
        status: statusMap[evalRes || ""] || "partial",
        difficulty: next_difficulty,
        score: (currentProgress?.score || 0) + (evalRes === "correct" ? 1 : 0),
      });

      setMessages((prev) => [...prev, feedbackMsg]);

      if (evalRes === "correct") {
        setIsAnswered(true);
      } else {
        // If not correct, AI must continue. Use AI scaffold or a default nudge to keep session active.
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            type: "ai",
            content:
              scaffold_question ||
              "Could you try explaining that again with more detail from the text?",
            sources: sources,
          },
        ]);
      }
      setAnswer("");
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onReset = () => {
    clear();
    setSources([]);
    setMessages([]);
    setAnswer("");
    setIsAnswered(false);
  };

  return (
    <div className="questioning-panel">
      <div className="panel-header">
        <div className="header-main">
          <h3>Tutor</h3>
          {currentConcept && (
            <span className="active-concept">{currentConcept}</span>
          )}
        </div>
        {currentProgress && (
          <div className="mastery-indicator">
            <span className={`status-dot ${currentProgress.status}`}></span>
            <span className="level-badge">
              Mastery: {currentProgress.difficulty}/3
            </span>
          </div>
        )}
      </div>

      <div className="session-container">
        <div className="conversation-flow" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="message ai-message">
              <div className="message-content">
                <p>
                  {currentConcept
                    ? `Ready to discuss "${currentConcept}"? I'll ask a few questions to see how you're tracking.`
                    : "Select a concept from the list above to start a discussion."}
                </p>
                {currentConcept && !isLoading && (
                  <button className="start-chat-btn" onClick={startLearning}>
                    Start Discussion
                  </button>
                )}
                {isLoading && (
                  <p className="loading-text">Preparing questions...</p>
                )}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.type}-message ${msg.type === "feedback" ? msg.evaluation : ""}`}
                >
                  {msg.type === "feedback" && (
                    <div className="message-header">Feedback</div>
                  )}
                  <div className="message-content">
                    <p>{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="message-sources">
                        {msg.sources.map((s, idx) => (
                          <button
                            key={idx}
                            className="source-link-btn"
                            onClick={() => setCurrentPage(s.page_number)}
                          >
                            Ref: Page {s.page_number}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAnswered ? (
                <div className="mastery-summary">
                  <p>
                    You've completed this section. You can continue or pick
                    another concept.
                  </p>
                  <button className="next-concept-btn" onClick={onReset}>
                    Finish Session
                  </button>
                </div>
              ) : (
                <div className="message user-input-message">
                  <div className="message-content">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your explanation..."
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitAnswer();
                        }
                      }}
                      autoFocus
                    />
                    <div className="input-actions">
                      <button
                        className="submit-btn"
                        onClick={submitAnswer}
                        disabled={!answer.trim() || isLoading}
                      >
                        {isLoading ? "Thinking..." : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {sources.length > 0 && (
          <div className="context-sidebar">
            <div className="sidebar-label">Sources</div>
            <div className="source-list">
              {sources.map((s, i) => (
                <div
                  key={i}
                  className="source-item"
                  onClick={() => setCurrentPage(s.page_number)}
                >
                  <span className="page-link">Page {s.page_number}</span>
                  <p className="truncate-text">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestioningPanel;
