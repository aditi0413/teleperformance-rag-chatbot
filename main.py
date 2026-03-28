"""
Teleperformance RAG Chatbot - FastAPI Backend
Stack: Groq (LLaMA3) + FAISS + Sentence Transformers + LangChain
"""

import os
import json
import time
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate

load_dotenv()

# ── App Setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Teleperformance RAG Chatbot API",
    description="AI-powered customer support chatbot using RAG + Groq LLaMA3",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response Models ──────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    confidence: str
    response_time_ms: int

class HealthResponse(BaseModel):
    status: str
    model: str
    vector_store: str
    documents_indexed: int

# ── Global State ───────────────────────────────────────────────────────────────
vector_store = None
qa_chains: dict = {}          # session_id -> ConversationalRetrievalChain
docs_count = 0

# ── Prompt Template ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a professional and empathetic customer support agent for Teleperformance, 
one of the world's leading customer experience companies. Your job is to help customers by 
answering their questions clearly, accurately, and helpfully using the provided knowledge base.

Guidelines:
- Be warm, professional, and empathetic
- Give concise, direct answers (2-4 sentences unless detail is needed)
- If the answer is not in the context, say so honestly and suggest contacting human support
- Never make up information or policies
- Always end with a helpful follow-up offer if appropriate

Context from knowledge base:
{context}

Chat History:
{chat_history}

Customer Question: {question}

Your Response:"""

QA_PROMPT = PromptTemplate(
    input_variables=["context", "chat_history", "question"],
    template=SYSTEM_PROMPT
)

# ── RAG Pipeline Initialization ────────────────────────────────────────────────
def initialize_rag():
    global vector_store, docs_count

    print("🔄 Loading knowledge base...")
    faq_path = Path(__file__).parent.parent / "data" / "faq.txt"

    if not faq_path.exists():
        raise FileNotFoundError(f"FAQ file not found at {faq_path}")

    # Load and split documents
    loader = TextLoader(str(faq_path), encoding="utf-8")
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=80,
        separators=["\n\n", "\n", "Q:", "A:", ". ", " "],
    )
    chunks = splitter.split_documents(documents)
    docs_count = len(chunks)
    print(f"✅ Split into {docs_count} chunks")

    # Create embeddings and FAISS index
    print("🔄 Creating embeddings (sentence-transformers)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
    vector_store = FAISS.from_documents(chunks, embeddings)
    print("✅ FAISS vector store ready")

def get_qa_chain(session_id: str) -> ConversationalRetrievalChain:
    """Get or create a QA chain with memory for a given session."""
    if session_id not in qa_chains:
        llm = ChatGroq(
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama3-70b-8192",
            temperature=0.3,
            max_tokens=512,
        )
        memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer",
            k=5,  # Keep last 5 exchanges
        )
        retriever = vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 4},
        )
        qa_chains[session_id] = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            memory=memory,
            combine_docs_chain_kwargs={"prompt": QA_PROMPT},
            return_source_documents=True,
            verbose=False,
        )
    return qa_chains[session_id]

def get_confidence(score: float) -> str:
    if score >= 0.85:
        return "high"
    elif score >= 0.65:
        return "medium"
    return "low"

# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    initialize_rag()
    print("🚀 Teleperformance RAG Chatbot API is running")

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    return {"message": "Teleperformance RAG Chatbot API", "docs": "/docs"}

@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health():
    return HealthResponse(
        status="healthy",
        model="llama3-70b-8192 (Groq)",
        vector_store="FAISS (in-memory)",
        documents_indexed=docs_count,
    )

@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    start = time.time()
    try:
        chain = get_qa_chain(request.session_id)
        result = chain({"question": request.message})

        answer = result.get("answer", "I'm sorry, I couldn't find an answer.")
        source_docs = result.get("source_documents", [])

        # Extract unique source snippets
        sources = list({
            doc.page_content[:120].strip() + "..."
            for doc in source_docs[:3]
        })

        # Use simple heuristic for confidence
        confidence = "high" if source_docs else "low"

        elapsed_ms = int((time.time() - start) * 1000)
        return ChatResponse(
            answer=answer,
            sources=sources,
            confidence=confidence,
            response_time_ms=elapsed_ms,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chat/session/{session_id}", tags=["Chat"])
def clear_session(session_id: str):
    if session_id in qa_chains:
        del qa_chains[session_id]
        return {"message": f"Session {session_id} cleared"}
    return {"message": "Session not found"}

@app.get("/stats", tags=["Stats"])
def stats():
    return {
        "active_sessions": len(qa_chains),
        "documents_indexed": docs_count,
        "model": "llama3-70b-8192",
        "embedding_model": "all-MiniLM-L6-v2",
        "vector_store": "FAISS",
    }
