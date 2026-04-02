import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "./PDFViewer.css";

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  file: string | File | null;
  currentPage: number;
  numPages: number;
  onPageChange: (page: number) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  currentPage,
  numPages,
  onPageChange,
}) => {
  const [numPagesLoaded, setNumPagesLoaded] = useState(0);
  const [scale, setScale] = useState(1.0);

  if (!file) {
    return <div className="pdf-empty">Select a PDF to view</div>;
  }

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < numPagesLoaded) onPageChange(currentPage + 1);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  return (
    <div className="pdf-viewer">
      <div className="pdf-document">
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => setNumPagesLoaded(numPages)}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
      <div className="pdf-controls">
        <div className="page-navigation">
          <button onClick={handlePrev} disabled={currentPage <= 1}>
            ← Previous
          </button>
          <div className="pdf-page-info">
            {currentPage} of {numPagesLoaded}
          </div>
          <button onClick={handleNext} disabled={currentPage >= numPagesLoaded}>
            Next →
          </button>
        </div>
        <div className="zoom-controls">
          <button onClick={zoomOut} disabled={scale <= 0.5}>
            −
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 3.0}>
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
