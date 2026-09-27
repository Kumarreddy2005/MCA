"""FastAPI Router for Phase 9 RAG Knowledge System."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.rag import (
    IngestDocumentRequest,
    IngestDocumentResponse,
    ListDocumentsResponse,
    QueryRagRequest,
    QueryRagResponse,
)
from app.services.rag_service import rag_service

router = APIRouter(tags=["RAG Knowledge Assistant"])


@router.post(
    "/ingest",
    response_model=IngestDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest and index a government order or policy circular",
)
def ingest_document(req: IngestDocumentRequest):
    try:
        return rag_service.ingest_document(req)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Knowledge ingestion error: {str(exc)}",
        ) from exc


@router.post(
    "/query",
    response_model=QueryRagResponse,
    summary="Query trusted knowledge base and return grounded answer with citations",
)
def query_knowledge(req: QueryRagRequest):
    try:
        return rag_service.query(req)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Knowledge retrieval error: {str(exc)}",
        ) from exc


@router.get(
    "/documents",
    response_model=ListDocumentsResponse,
    summary="List active authoritative government circulars and policies",
)
def list_documents(department: Optional[str] = Query(None, description="Filter by department")):
    try:
        return rag_service.list_documents(department=department)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document listing error: {str(exc)}",
        ) from exc


@router.post(
    "/documents/{doc_id}/archive",
    summary="Archive or supersede a government order",
)
def archive_document(doc_id: str, new_status: str = Query("SUPERSEDED", description="SUPERSEDED or ARCHIVED")):
    success = rag_service.archive_document(doc_id, new_status=new_status)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found",
        )
    return {"success": True, "document_id": doc_id, "document_status": new_status.upper()}
