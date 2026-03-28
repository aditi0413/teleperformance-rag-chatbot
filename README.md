# 🤖 TP Support AI — RAG-Powered Customer Support Chatbot

> An AI-powered customer support chatbot built for Teleperformance using Retrieval-Augmented Generation (RAG), Groq LLaMA3, FAISS vector search, FastAPI, and React.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Groq](https://img.shields.io/badge/LLM-Groq%20LLaMA3-orange?style=flat-square)
![FAISS](https://img.shields.io/badge/VectorDB-FAISS-red?style=flat-square)

---

## 📌 Project Overview

This project demonstrates an end-to-end **Retrieval-Augmented Generation (RAG)** pipeline applied to customer support in a BPO context. Instead of relying solely on an LLM's training data, the chatbot retrieves relevant information from a curated knowledge base before generating a response — making it grounded, accurate, and explainable.

### Why RAG for BPO?

| Traditional Chatbot | RAG Chatbot (This Project) |
|---|---|
| Rule-based, brittle | Understands natural language |
| Hard to update | Add a document, instantly updated |
| No source attribution | Shows retrieved sources |
| Hallucinates facts | Grounded in real knowledge base |
| Requires retraining | No retraining needed |

---

## 🏗️ Architecture

```
User Query
    │
    ▼
React Frontend (Vite)
    │  HTTP POST /chat
    ▼
FastAPI Backend
    ├── Sentence Transformer (MiniLM-L6-v2) ──► Embed query
    │                                               │
    │                                               ▼
    │                                        FAISS Vector Store
    │                                          (FAQ chunks)
    │                                               │
    │                                    Top-K relevant chunks
    │                                               │
    ├── LangChain ConversationalRetrievalChain ◄────┘
    │        │
    │        ▼
    │    Groq API (LLaMA3-70b-8192)
    │        │
    │        ▼
    │   Grounded answer + sources
    │
    ▼
Response → React Frontend
```

---

## 🚀 Features

- **Semantic Search** — Uses sentence embeddings to find contextually relevant FAQ chunks, not just keyword matches
- **Conversational Memory** — Maintains last 5 exchanges per session for follow-up questions
- **Source Attribution** — Shows which knowledge base chunks were used to generate the answer
- **Confidence Scoring** — Indicates response confidence level
- **Session Management** — Isolated per-user sessions with clear session support
- **FastAPI REST API** — Production-ready with auto-generated Swagger docs at `/docs`
- **React Frontend** — Clean, dark-themed UI with suggested questions, typing indicator, and real-time stats

---

## 📁 Project Structure

```
teleperformance-rag-chatbot/
├── backend/
│   ├── main.py              # FastAPI app + RAG pipeline
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main chat interface
│   │   ├── index.css        # Global styles + design system
│   │   ├── main.jsx         # React entry point
│   │   ├── components/
│   │   │   ├── Message.jsx  # Chat bubble, sources, confidence
│   │   │   └── StatsSidebar.jsx  # Live system stats panel
│   │   └── hooks/
│   │       └── useApi.js    # Axios API client
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── data/
│   └── faq.txt              # Knowledge base (add your own docs here!)
├── .gitignore
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/teleperformance-rag-chatbot.git
cd teleperformance-rag-chatbot
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start the backend server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
Interactive API docs at `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root / welcome |
| GET | `/health` | System health check |
| GET | `/stats` | Live usage stats |
| POST | `/chat` | Send a message, get AI response |
| DELETE | `/chat/session/{id}` | Clear session memory |

### Example Request

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I reset my password?", "session_id": "user-123"}'
```

### Example Response

```json
{
  "answer": "To reset your password, click 'Forgot Password' on the login page and enter your registered email address. You will receive a reset link within 5 minutes...",
  "sources": [
    "Click 'Forgot Password' on the login page and enter your registered email address. You will receive a password reset link within 5 minutes..."
  ],
  "confidence": "high",
  "response_time_ms": 842
}
```

---

## 📚 Extending the Knowledge Base

To add your own documents, simply place `.txt` or `.pdf` files in the `data/` folder and update `main.py` to load them:

```python
# For multiple files:
from langchain_community.document_loaders import DirectoryLoader
loader = DirectoryLoader("../data", glob="**/*.txt")

# For PDFs:
from langchain_community.document_loaders import PyPDFLoader
loader = PyPDFLoader("../data/manual.pdf")
```

Restart the backend and the new documents are automatically embedded and indexed.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| LLM | Groq (LLaMA3-70b) | Fast, free inference |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 | Semantic text embeddings |
| Vector Store | FAISS | Similarity search over embeddings |
| RAG Framework | LangChain | Retrieval chain + memory |
| Backend | FastAPI + Uvicorn | REST API |
| Frontend | React 18 + Vite | UI |
| HTTP Client | Axios | API calls from React |

---

## 📈 Future Improvements

- [ ] Support PDF and URL ingestion from the UI
- [ ] Add multilingual support (relevant for global BPO)
- [ ] Agent performance analytics dashboard
- [ ] Persistent vector store (Pinecone / Weaviate)
- [ ] Docker Compose for one-command deployment
- [ ] Unit and integration tests

---

## 👤 Author

Built as part of an AI/ML internship application for **Teleperformance**.

---

## 📄 License

MIT License — free to use and modify.
