"""Pydantic v2 schemas for Phase 9 RAG Knowledge System."""

from typing import List, Optional
from pydantic import BaseModel, Field


class KnowledgeChunk(BaseModel):
    chunk_id: str
    chunk_index: int
    content: str
    heading: Optional[str] = None
    token_count: int = 0


class IngestDocumentRequest(BaseModel):
    document_id: Optional[str] = None
    title: str = Field(..., min_length=3, description="Official title of the circular, GO or policy")
    document_number: str = Field(..., min_length=2, description="Government Order / Circular reference number")
    department: str = Field(..., description="Responsible Karnataka Government Department")
    category: str = Field(..., description="Service or thematic category")
    version: str = Field("1.0", description="Document version number")
    effective_date: str = Field(..., description="Date from which the order is legally active")
    source: str = Field("Karnataka Gazette", description="Publishing authority or gazette source")
    approval_state: str = Field("APPROVED", description="DRAFT | REVIEW | APPROVED | REJECTED")
    document_status: str = Field("ACTIVE", description="ACTIVE | SUPERSEDED | ARCHIVED")
    content: str = Field(..., min_length=20, description="Full text or markdown content of the document")
    tags: List[str] = Field(default_factory=list, description="Keywords for indexing and filtering")


class IngestDocumentResponse(BaseModel):
    success: bool = True
    document_id: str
    document_number: str
    title: str
    total_chunks: int
    indexed_at: str


class SourceReference(BaseModel):
    document_id: str
    title: str
    document_number: str
    department: str
    category: str
    version: str
    effective_date: str
    chunk_id: str
    excerpt: str
    relevance_score: float = Field(..., ge=0.0, le=1.0)


class QueryRagRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Citizen or officer natural language query")
    department_filter: Optional[str] = Field(None, description="Optional department filter")
    max_sources: int = Field(3, ge=1, le=10, description="Maximum citation sources to return")
    language: str = Field("en", description="Preferred output language (en/kn)")


class QueryRagResponse(BaseModel):
    success: bool = True
    query: str
    grounded_answer: str
    sources: List[SourceReference] = Field(default_factory=list)
    is_grounded: bool = True
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    disclaimer: str = "Grounded exclusively in official Government of Karnataka circulars, GOs, and Sakala guidelines."


class KnowledgeDocumentSummary(BaseModel):
    document_id: str
    title: str
    document_number: str
    department: str
    category: str
    version: str
    effective_date: str
    approval_state: str
    document_status: str
    chunk_count: int
    tags: List[str]


class ListDocumentsResponse(BaseModel):
    success: bool = True
    total_documents: int
    documents: List[KnowledgeDocumentSummary]
