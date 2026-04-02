# Backend for Learning Companion MVP

This backend provides minimal endpoints to support an interactive reading
assistant. It is implemented using FastAPI and leverages LangChain with
Groq, as well as PyPDFLoader for PDF parsing.

## Setup & Running

1. **Environment**: make sure you have a Python environment with the necessary
   packages. A `conda` environment named `langchain` is expected in this
   workspace; activate it with:

   ```bash
   conda activate langchain
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure API key**: set `GROQ_API_KEY` in your shell so the LLM client
   can authenticate.

4. **Start server**:

   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   The API will be available at `http://localhost:8000`.

## Available Endpoints

### `POST /reading/upload-pdf`
Accepts a PDF via multipart form field named `file`. The service uses
`PyPDFLoader` to extract text page-by-page and returns a JSON object
with a `pages` array. Each entry has:

```json
{ "page": 1, "text": "...extracted content..." }
```

No files are persisted; the PDF is processed in-memory and deleted.

### `POST /reading/stream-commentary`
Receives a JSON body containing `text` (the page content). It invokes a
Groq-backed Chat model with a system prompt instructing it to read the
passage aloud followed by one comprehension question. Responses are streamed
back as plain text chunks, so clients can process and vocalize partial
results using a `ReadableStream` or `EventSource`.

Example request body:

```json
{ "text": "Once upon a time..." }
```

The endpoint returns a `text/plain` streaming response.

## Notes

- Authentication, storage, and vector indices are intentionally omitted for
  this MVP.
- CORS is configured to allow requests from `http://localhost:3000`.

