# Learning Companion

An interactive reading assistant that allows students to upload PDF documents and engage with an AI tutor. The application extracts text from PDF pages, generates reading commentary and comprehension questions via a Large Language Model, and uses the Web Speech API for audio output.

## Project Structure

The repository is divided into two main components:

- `/backend`: FastAPI server handling PDF processing and LLM integration (LangChain/Groq).
- `/frontend`: React application for document visualization and user interaction.

## Prerequisites

- Python 3.9+
- Node.js 16+ and npm
- A Groq API key

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set your environment variables:
   ```bash
   export GROQ_API_KEY="your_api_key_here"
   ```

5. Start the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

The backend API will be available at `http://localhost:8000`.

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
   Note: `--legacy-peer-deps` is recommended to resolve version requirements for `react-pdf` and React 18.

3. Start the development server:
   ```bash
   npm start
   ```

The application will be accessible at `http://localhost:3000`.

## Usage

1. Open the application in your browser.
2. Navigate to the Documents section via the navigation bar.
3. Upload a PDF file.
4. As you navigate through the pages, the AI assistant will process the text, provide commentary, and ask a comprehension question.
5. Ensure your system audio is enabled for the voice output functionality.

## Technical Notes

- **PDF Processing**: The backend uses `PyPDFLoader` for extraction. Files are processed in-memory and are not persisted to storage.
- **LLM**: Commentary is generated using Groq-backed models via LangChain and streamed to the frontend for real-time interaction.
- **Speech**: Audio synthesis is handled client-side using the browser's Web Speech API.
- **CORS**: The backend is configured to allow requests from `http://localhost:3000`.