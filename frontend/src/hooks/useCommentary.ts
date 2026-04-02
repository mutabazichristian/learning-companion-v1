import { useEffect, useState } from "react";

interface CommentaryResult {
  transcript: string;
  error?: string;
}

export function useCommentary(pageText: string | null): CommentaryResult {
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!pageText) {
      setTranscript("");
      return;
    }

    const controller = new AbortController();
    const reader = new TextDecoder();

    fetch("http://localhost:8000/reading/stream-commentary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pageText }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.body) throw new Error("No response body");
        const streamReader = res.body.getReader();
        let partial = "";

        const read = () => {
          streamReader
            .read()
            .then(({ done, value }) => {
              if (done) return;
              const chunk = reader.decode(value);
              partial += chunk;
              setTranscript((prev) => prev + chunk);
              // speak chunk immediately
              speak(chunk);
              read();
            })
            .catch((err) => {
              if (err.name !== "AbortError") setError(err.message);
            });
        };
        read();
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });

    return () => {
      controller.abort();
    };
  }, [pageText]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    // default to English voice when available
    utter.lang = "en-US";
    window.speechSynthesis.speak(utter);
  };

  return { transcript, error };
}
