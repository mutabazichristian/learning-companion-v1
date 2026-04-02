import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "../api/axios";

const STORAGE_KEY = "pdf_session_state";

type PagesConcepts = Record<number, string[]>;
type ConceptStatus = "untested" | "partial" | "struggling" | "mastered";
type TeachingTechnique = "Socratic" | "Feynman" | "ActiveRecall" | null;

interface ConceptProgress {
  status: ConceptStatus;
  difficulty: number; // 1-3
  score: number; // cumulative performance score
  timesAsked: number;
  keyInsights: string[];
  lastTechnique: TeachingTechnique;
}

interface RabbitHole {
  question: string;
  timestamp: number;
  conceptAtTime: string | null;
}

interface PDFContextValue {
  pdfFile: File | null;
  pdfName: string;
  currentPage: number;
  docId: string;
  totalPages: number;
  conceptMap: Record<string, string>;
  pagesConcepts: PagesConcepts;
  conceptProgress: Record<string, ConceptProgress>;
  rabbitHoles: RabbitHole[];
  lastTechnique: TeachingTechnique;
  setPdfFile: (f: File | null) => void;
  setPdfName: (n: string) => void;
  setCurrentPage: (p: number) => void;
  setDocId: (id: string) => void;
  setTotalPages: (n: number) => void;
  setConceptMap: (m: Record<string, string>) => void;
  setPagesConcepts: (p: PagesConcepts) => void;
  updateConceptProgress: (
    concept: string,
    progress: Partial<ConceptProgress>,
  ) => void;
  addKeyInsight: (concept: string, insight: string) => void;
  setLastTechnique: (t: TeachingTechnique) => void;
  trackRabbitHole: (question: string, conceptAtTime: string | null) => void;
  getSessionSummary: () => {
    concept: string;
    status: ConceptStatus;
    difficulty: number;
  }[];
  clearPDF: () => void;
}

const defaultValue: PDFContextValue = {
  pdfFile: null,
  pdfName: "",
  currentPage: 1,
  docId: "",
  totalPages: 0,
  conceptMap: {},
  pagesConcepts: {},
  conceptProgress: {},
  rabbitHoles: [],
  lastTechnique: null,
  setPdfFile: () => {},
  setPdfName: () => {},
  setCurrentPage: () => {},
  setDocId: () => {},
  setTotalPages: () => {},
  setConceptMap: () => {},
  setPagesConcepts: () => {},
  updateConceptProgress: () => {},
  addKeyInsight: () => {},
  setLastTechnique: () => {},
  trackRabbitHole: () => {},
  getSessionSummary: () => [],
  clearPDF: () => {},
};

const PDFContext = createContext<PDFContextValue>(defaultValue);

export const PDFProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [pdfFile, setPdfFile] = useState<File | null>(defaultValue.pdfFile);
  const [pdfName, setPdfName] = useState<string>(defaultValue.pdfName);
  const [currentPage, setCurrentPage] = useState<number>(
    defaultValue.currentPage,
  );
  const [docId, setDocId] = useState<string>(defaultValue.docId);
  const [totalPages, setTotalPages] = useState<number>(defaultValue.totalPages);
  const [conceptMap, setConceptMap] = useState<Record<string, string>>(
    defaultValue.conceptMap,
  );
  const [pagesConcepts, setPagesConcepts] = useState<PagesConcepts>(
    defaultValue.pagesConcepts,
  );
  const [conceptProgress, setConceptProgress] = useState<
    Record<string, ConceptProgress>
  >(defaultValue.conceptProgress);
  const [rabbitHoles, setRabbitHoles] = useState<RabbitHole[]>(
    defaultValue.rabbitHoles,
  );
  const [lastTechnique, setLastTechnique] = useState<TeachingTechnique>(
    defaultValue.lastTechnique,
  );

  const updateConceptProgress = (
    concept: string,
    progress: Partial<ConceptProgress>,
  ) => {
    setConceptProgress((prev) => {
      const existing = prev[concept] || {
        status: "untested" as const,
        difficulty: 1,
        score: 0,
        timesAsked: 0,
        keyInsights: [],
        lastTechnique: null,
      };
      const updated = { ...existing, ...progress };

      if (docId) {
        api
          .post("/reading/progress", {
            doc_id: docId,
            concept,
            status: updated.status,
            difficulty: updated.difficulty,
            score: updated.score,
            times_asked: updated.timesAsked,
          })
          .catch((err) => console.error("Failed to sync progress:", err));
      }

      return {
        ...prev,
        [concept]: updated,
      };
    });
  };

  const addKeyInsight = (concept: string, insight: string) => {
    setConceptProgress((prev) => {
      const existing = prev[concept] || {
        status: "untested" as const,
        difficulty: 1,
        score: 0,
        timesAsked: 0,
        keyInsights: [],
        lastTechnique: null,
      };
      return {
        ...prev,
        [concept]: {
          ...existing,
          keyInsights: [...(existing.keyInsights || []), insight],
        },
      };
    });
  };

  const trackRabbitHole = (question: string, conceptAtTime: string | null) => {
    setRabbitHoles((prev) => [
      ...prev,
      { question, timestamp: Date.now(), conceptAtTime },
    ]);
  };

  const getSessionSummary = () => {
    return Object.entries(conceptProgress)
      .filter(([_, p]) => p.status !== "untested")
      .map(([concept, p]) => ({
        concept,
        status: p.status,
        difficulty: p.difficulty,
      }));
  };

  const clearPDF = () => {
    setPdfFile(null);
    setPdfName("");
    setCurrentPage(1);
    setDocId("");
    setTotalPages(0);
    setConceptMap({});
    setPagesConcepts({});
    setConceptProgress({});
    setRabbitHoles([]);
    setLastTechnique(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    const fetchRemoteProgress = async () => {
      if (!docId) return;
      try {
        const res = await api.get(`/reading/progress/${docId}`);
        setConceptProgress((prev) => ({
          ...prev,
          ...(res.data as Record<string, ConceptProgress>),
        }));
      } catch (err) {
        console.error("Failed to fetch remote progress:", err);
      }
    };
    fetchRemoteProgress();
  }, [docId]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.pdfName) setPdfName(parsed.pdfName);
          if (parsed.currentPage) setCurrentPage(parsed.currentPage);
          if (parsed.docId) setDocId(parsed.docId);
          if (parsed.totalPages) setTotalPages(parsed.totalPages);
          if (parsed.conceptMap) setConceptMap(parsed.conceptMap);
          if (parsed.pagesConcepts) setPagesConcepts(parsed.pagesConcepts);
          if (parsed.conceptProgress)
            setConceptProgress(parsed.conceptProgress);
          if (parsed.rabbitHoles) setRabbitHoles(parsed.rabbitHoles);
          if (parsed.lastTechnique) setLastTechnique(parsed.lastTechnique);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const toSave = {
      pdfName,
      currentPage,
      docId,
      totalPages,
      conceptMap,
      pagesConcepts,
      conceptProgress,
      rabbitHoles,
      lastTechnique,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      // ignore
    }
  }, [
    pdfName,
    currentPage,
    docId,
    totalPages,
    conceptMap,
    pagesConcepts,
    conceptProgress,
    rabbitHoles,
    lastTechnique,
  ]);

  return (
    <PDFContext.Provider
      value={{
        pdfFile,
        pdfName,
        currentPage,
        docId,
        totalPages,
        conceptMap,
        pagesConcepts,
        conceptProgress,
        rabbitHoles,
        lastTechnique,
        setPdfFile,
        setPdfName,
        setCurrentPage,
        setDocId,
        setTotalPages,
        setConceptMap,
        setPagesConcepts,
        updateConceptProgress,
        addKeyInsight,
        setLastTechnique,
        trackRabbitHole,
        getSessionSummary,
        clearPDF,
      }}
    >
      {children}
    </PDFContext.Provider>
  );
};

export const usePDFContext = () => useContext(PDFContext);

export {};
