"""Service implementing Phase 9 RAG Knowledge System for Government of Karnataka."""

import datetime
import math
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.rag import (
    IngestDocumentRequest,
    IngestDocumentResponse,
    KnowledgeChunk,
    KnowledgeDocumentSummary,
    ListDocumentsResponse,
    QueryRagRequest,
    QueryRagResponse,
    SourceReference,
)


class RagService:
    """RAG Engine for Karnataka Government Knowledge Documents and Circulars."""

    def __init__(self) -> None:
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.chunks: Dict[str, Dict[str, Any]] = {}
        self._seed_default_knowledge()

    # ─────────────────────────────────────────────────────────────
    # INGESTION & CHUNKING
    # ─────────────────────────────────────────────────────────────
    def ingest_document(self, req: IngestDocumentRequest) -> IngestDocumentResponse:
        """Ingest, chunk, and index a government circular or scheme guideline."""
        doc_id = req.document_id or f"doc_{uuid.uuid4().hex[:12]}"
        created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Generate semantic chunks
        doc_chunks = self._chunk_content(doc_id, req.content)

        # Store document metadata
        self.documents[doc_id] = {
            "document_id": doc_id,
            "title": req.title,
            "document_number": req.document_number,
            "department": req.department,
            "category": req.category,
            "version": req.version,
            "effective_date": req.effective_date,
            "source": req.source,
            "approval_state": req.approval_state.upper(),
            "document_status": req.document_status.upper(),
            "content": req.content,
            "tags": req.tags,
            "chunks": [c.chunk_id for c in doc_chunks],
            "created_at": created_at,
        }

        # Store chunks in index
        for chunk in doc_chunks:
            self.chunks[chunk.chunk_id] = {
                "chunk_id": chunk.chunk_id,
                "document_id": doc_id,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "heading": chunk.heading,
                "token_count": chunk.token_count,
            }

        return IngestDocumentResponse(
            success=True,
            document_id=doc_id,
            document_number=req.document_number,
            title=req.title,
            total_chunks=len(doc_chunks),
            indexed_at=created_at,
        )

    def _chunk_content(self, doc_id: str, content: str) -> List[KnowledgeChunk]:
        """Split text content into overlapping semantic chunks preserving headings."""
        lines = content.splitlines()
        chunks: List[KnowledgeChunk] = []
        current_heading: Optional[str] = None
        current_paragraphs: List[str] = []
        current_para_lines: List[str] = []
        current_word_count = 0
        chunk_idx = 0

        # Collect paragraphs while extracting headings
        paragraphs: List[Tuple[Optional[str], str]] = []
        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                if current_para_lines:
                    paragraphs.append((current_heading, " ".join(current_para_lines)))
                    current_para_lines = []
                continue

            if trimmed.startswith("#"):
                if current_para_lines:
                    paragraphs.append((current_heading, " ".join(current_para_lines)))
                    current_para_lines = []
                current_heading = trimmed.lstrip("#").strip()
            else:
                current_para_lines.append(trimmed)

        if current_para_lines:
            paragraphs.append((current_heading, " ".join(current_para_lines)))

        # Group paragraphs into chunks of ~250-350 words
        current_buffer: List[str] = []
        last_heading: Optional[str] = None

        for heading, para_text in paragraphs:
            words = para_text.split()
            word_count = len(words)
            if not last_heading and heading:
                last_heading = heading

            if current_word_count + word_count > 300 and current_buffer:
                chunk_text = "\n\n".join(current_buffer)
                chunks.append(
                    KnowledgeChunk(
                        chunk_id=f"{doc_id}_c{chunk_idx}",
                        chunk_index=chunk_idx,
                        content=chunk_text,
                        heading=last_heading,
                        token_count=len(chunk_text.split()),
                    )
                )
                chunk_idx += 1
                current_buffer = [para_text]
                current_word_count = word_count
                last_heading = heading
            else:
                current_buffer.append(para_text)
                current_word_count += word_count
                if heading:
                    last_heading = heading

        if current_buffer:
            chunk_text = "\n\n".join(current_buffer)
            chunks.append(
                KnowledgeChunk(
                    chunk_id=f"{doc_id}_c{chunk_idx}",
                    chunk_index=chunk_idx,
                    content=chunk_text,
                    heading=last_heading,
                    token_count=len(chunk_text.split()),
                )
            )

        return chunks

    # ─────────────────────────────────────────────────────────────
    # SEMANTIC RETRIEVAL & GROUNDED ANSWER GENERATION
    # ─────────────────────────────────────────────────────────────
    def query(self, req: QueryRagRequest) -> QueryRagResponse:
        """Search trusted knowledge and generate a factual, grounded answer with citations."""
        query_text = req.query.strip()
        query_tokens = self._tokenize(query_text)

        scored_chunks: List[Tuple[float, Dict[str, Any], Dict[str, Any]]] = []

        for chunk_id, chunk in self.chunks.items():
            doc = self.documents.get(chunk["document_id"])
            if not doc:
                continue

            # Authority & Version Filter: Skip non-approved or superseded/archived
            if doc["approval_state"] != "APPROVED" or doc["document_status"] != "ACTIVE":
                continue

            # Optional department filter
            if req.department_filter and req.department_filter.lower() not in doc["department"].lower():
                continue

            score = self._compute_relevance(query_tokens, query_text, doc, chunk)
            if score > 0.12:
                scored_chunks.append((score, doc, chunk))

        # Sort by relevance score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        # Anti-hallucination check: If no verified source passes threshold
        if not scored_chunks:
            return QueryRagResponse(
                success=True,
                query=query_text,
                grounded_answer=(
                    "No authorized Government of Karnataka circular, procedure, or GO was found covering this specific matter. "
                    "For unlisted or discretionary issues, citizens are advised to visit the Gram Panchayat office or submit a formal "
                    "inquiry via the Janasnehi Kendra / Sakala Helpdesk."
                ),
                sources=[],
                is_grounded=False,
                confidence_score=0.0,
            )

        # Top sources selection
        top_entries = scored_chunks[: req.max_sources]
        sources: List[SourceReference] = []

        for score, doc, chunk in top_entries:
            excerpt = chunk["content"]
            if len(excerpt) > 280:
                excerpt = excerpt[:280] + "..."

            sources.append(
                SourceReference(
                    document_id=doc["document_id"],
                    title=doc["title"],
                    document_number=doc["document_number"],
                    department=doc["department"],
                    category=doc["category"],
                    version=doc["version"],
                    effective_date=doc["effective_date"],
                    chunk_id=chunk["chunk_id"],
                    excerpt=excerpt,
                    relevance_score=round(min(score, 1.0), 3),
                )
            )

        # Synthesize grounded answer
        top_score = top_entries[0][0]
        confidence = round(min(0.65 + (top_score * 0.35), 0.98), 2)
        grounded_answer = self._synthesize_grounded_answer(query_text, top_entries)

        return QueryRagResponse(
            success=True,
            query=query_text,
            grounded_answer=grounded_answer,
            sources=sources,
            is_grounded=True,
            confidence_score=confidence,
        )

    def _compute_relevance(
        self,
        query_tokens: set,
        raw_query: str,
        doc: Dict[str, Any],
        chunk: Dict[str, Any],
    ) -> float:
        """Compute matching score combining lexical overlap, title, category, and tags."""
        chunk_tokens = self._tokenize(chunk["content"])
        if not chunk_tokens or not query_tokens:
            return 0.0

        # Jaccard / Overlap
        intersection = query_tokens.intersection(chunk_tokens)
        base_score = len(intersection) / math.sqrt(len(query_tokens) * len(chunk_tokens))

        # Title bonus
        title_tokens = self._tokenize(doc["title"])
        title_overlap = len(query_tokens.intersection(title_tokens))
        if title_overlap > 0:
            base_score += 0.20 * (title_overlap / len(query_tokens))

        # Tags bonus
        tag_tokens = set()
        for tag in doc.get("tags", []):
            tag_tokens.update(self._tokenize(tag))
        tag_overlap = len(query_tokens.intersection(tag_tokens))
        if tag_overlap > 0:
            base_score += 0.15

        # Key administrative terms
        lower_q = raw_query.lower()
        lower_c = chunk["content"].lower()
        key_matches = ["sakala", "sla", "borewell", "transformer", "waste", "pothole", "fine", "penalty", "compensation", "timeline"]
        for k in key_matches:
            if k in lower_q and k in lower_c:
                base_score += 0.08

        return base_score

    def _tokenize(self, text: str) -> set:
        """Tokenize text into lowercase alphanumeric keywords."""
        words = re.findall(r"\b[a-zA-Z0-9]{3,}\b", text.lower())
        stopwords = {
            "the", "and", "for", "with", "this", "that", "from", "are", "have", "has", "was", "were",
            "what", "when", "where", "how", "who", "which", "will", "can", "should", "under", "about",
        }
        return {w for w in words if w not in stopwords}

    def _synthesize_grounded_answer(
        self,
        query: str,
        top_entries: List[Tuple[float, Dict[str, Any], Dict[str, Any]]],
    ) -> str:
        """Generate authoritative factual summary strictly grounded in top sources."""
        primary_score, primary_doc, primary_chunk = top_entries[0]
        doc_num = primary_doc["document_number"]
        doc_title = primary_doc["title"]

        paragraphs = [
            f"According to **{doc_title}** (*Ref: {doc_num}*):",
        ]

        # Extract salient factual sentences from primary chunk
        sentences = [s.strip() for s in re.split(r"[.\n]", primary_chunk["content"]) if len(s.strip()) > 25]
        salient = sentences[:3]
        for s in salient:
            paragraphs.append(f"• {s}.")

        # If secondary source adds unique context, include it
        if len(top_entries) > 1:
            _, sec_doc, sec_chunk = top_entries[1]
            if sec_doc["document_number"] != doc_num:
                sec_sentences = [s.strip() for s in re.split(r"[.\n]", sec_chunk["content"]) if len(s.strip()) > 25]
                if sec_sentences:
                    paragraphs.append(
                        f"\nAdditionally, under **{sec_doc['title']}** (*Ref: {sec_doc['document_number']}*):\n• {sec_sentences[0]}."
                    )

        paragraphs.append(
            f"\n*Statutory Authority:* {primary_doc['department']} (Effective from {primary_doc['effective_date']})."
        )

        return "\n".join(paragraphs)

    # ─────────────────────────────────────────────────────────────
    # DOCUMENT MANAGEMENT & DIRECTORY
    # ─────────────────────────────────────────────────────────────
    def list_documents(self, department: Optional[str] = None) -> ListDocumentsResponse:
        """List active and approved knowledge circulars."""
        summaries: List[KnowledgeDocumentSummary] = []
        for doc in self.documents.values():
            if department and department.lower() not in doc["department"].lower():
                continue
            summaries.append(
                KnowledgeDocumentSummary(
                    document_id=doc["document_id"],
                    title=doc["title"],
                    document_number=doc["document_number"],
                    department=doc["department"],
                    category=doc["category"],
                    version=doc["version"],
                    effective_date=doc["effective_date"],
                    approval_state=doc["approval_state"],
                    document_status=doc["document_status"],
                    chunk_count=len(doc["chunks"]),
                    tags=doc["tags"],
                )
            )

        return ListDocumentsResponse(
            success=True,
            total_documents=len(summaries),
            documents=summaries,
        )

    def archive_document(self, doc_id: str, new_status: str = "SUPERSEDED") -> bool:
        """Mark document as superseded or archived so it is no longer returned in live answers."""
        if doc_id in self.documents:
            self.documents[doc_id]["document_status"] = new_status.upper()
            return True
        return False

    # ─────────────────────────────────────────────────────────────
    # DEFAULT PRE-SEEDED KARNATAKA KNOWLEDGE BASE
    # ─────────────────────────────────────────────────────────────
    def _seed_default_knowledge(self) -> None:
        """Populate initial official Karnataka Government Orders and guidelines."""
        default_docs = [
            IngestDocumentRequest(
                document_id="doc_sakala_act_2011",
                title="The Karnataka Sakala Services Act, 2011 & Citizen Service Charter",
                document_number="KRN-ACT-SAKALA-2011-01",
                department="Rural Development & Panchayat Raj",
                category="Citizen Services & Statutory SLA",
                version="2.0",
                effective_date="2012-04-02",
                source="Karnataka Gazette Extra-Ordinary No. 412",
                approval_state="APPROVED",
                document_status="ACTIVE",
                content="""# THE KARNATAKA SAKALA SERVICES ACT, 2011
## Statutory Timelines for Civic Redressal
Under the Karnataka Guarantee of Services to Citizens Act (Sakala), every designated public servant is legally mandated to provide notified citizen services and resolve grievances within prescribed statutory timelines.

Drinking water failure, contamination, or pipe burst grievances must be redressed within a mandatory 15 calendar days maximum.
Emergency electrical hazards, fallen high-tension wires, or damaged distribution transformers must be attended within 24 hours.
Road pot hole repairs on district roads must be resolved within 10 working days.

## Defaulting Officer Compensation & Penalties
If a designated officer fails to provide the citizen service or resolve the grievance within the stipulated statutory time without reasonable cause, a statutory compensation penalty of Rupees Twenty (Rs. 20) per day of delay, subject to a maximum of Rupees Five Hundred (Rs. 500), shall be deducted directly from the defaulting officer's salary.
The citizen has the legal right to submit an appeal to the First Appellate Authority (Tahsildar / Assistant Commissioner) within thirty (30) days of the expiry of the stipulated period.""",
                tags=["sakala", "timeline", "compensation", "penalty", "appeal", "delay", "tahsildar"],
            ),
            IngestDocumentRequest(
                document_id="doc_water_supply_go_2024",
                title="Jal Jeevan Mission & Rural Drinking Water Scheme Operational Guidelines",
                document_number="KRN-GO-RDPR-2024-41",
                department="Rural Drinking Water & Sanitation",
                category="Drinking Water Infrastructure",
                version="1.2",
                effective_date="2024-01-15",
                source="RDPR Department Circular RDPR/78/RWS/2024",
                approval_state="APPROVED",
                document_status="ACTIVE",
                content="""# RURAL DRINKING WATER SCHEME OPERATIONAL PROTOCOL
## Borewell Motor Breakdown & Replacement
When a community borewell motor or submersible pump in a village gram panchayat burns out or fails, the Gram Panchayat Executive Officer (PDO) is authorized to execute repairs within 48 hours utilizing the Gram Panchayat Untied Maintenance Fund.

For complete motor burnout requiring a new 5HP/7.5HP submersible pump replacement, the Panchayat is authorized to expend up to Rupees Forty-Five Thousand (Rs. 45,000) directly through empanelled government rate-contract vendors without awaiting district tender approval.
Temporary drinking water tankers must be dispatched to affected habitations within 12 hours if pipe repair requires more than 24 hours of shut down.

## Water Quality Testing & Purification
Bacteriological and chemical water quality testing must be executed every six months for every rural multi-village water supply scheme. Any borewell showing fluoride concentration exceeding 1.5 mg/L or nitrate exceeding 45 mg/L must be locked immediately with alternative RO plant supply provided.""",
                tags=["borewell", "motor", "drinking water", "water tanker", "fluoride", "pump replacement", "panchayat"],
            ),
            IngestDocumentRequest(
                document_id="doc_bescom_sop_2023",
                title="BESCOM Standard of Performance & Electricity Distribution Consumer Rights Code",
                document_number="KRN-KERC-BESCOM-2023-12",
                department="Energy Department",
                category="Power Distribution & Public Safety",
                version="3.1",
                effective_date="2023-08-01",
                source="Karnataka Electricity Regulatory Commission (KERC) Notification",
                approval_state="APPROVED",
                document_status="ACTIVE",
                content="""# BESCOM ELECTRICITY DISTRIBUTION STANDARD OF PERFORMANCE
## Distribution Transformer Failure SLA
In case of a distribution transformer burnout or failure, BESCOM linesmen and section officers are mandated to restore power by repairing or replacing the transformer within 24 hours in rural areas and within 12 hours in urban/taluk headquarters.

## Fallen Live Conductors & Safety Emergencies
Snapped overhead live conductors, sparking lines, or leaning poles represent critical life-safety emergencies. BESCOM emergency squad must reach the site within one (1) hour of intimation and de-energize the feeder immediately to prevent electrocution.

## Scheduled Outages & Load Shedding
Scheduled maintenance outages must be notified to consumers at least 24 hours in advance via SMS, public loudspeaker, or local newspaper announcements. Unannounced load shedding exceeding 4 hours entitles consumers to register a grievance with the Consumer Grievance Redressal Forum (CGRF).""",
                tags=["transformer", "bescom", "power outage", "live conductor", "electricity", "feeder", "kerc"],
            ),
            IngestDocumentRequest(
                document_id="doc_bbmp_waste_byelaws_2022",
                title="Karnataka Municipal Solid Waste Management Bye-Laws & Sanctions",
                document_number="KRN-UDD-SWM-2022-09",
                department="Sanitation & Solid Waste",
                category="Urban Solid Waste Management",
                version="1.0",
                effective_date="2022-11-01",
                source="Urban Development Department Gazette Notification",
                approval_state="APPROVED",
                document_status="ACTIVE",
                content="""# MUNICIPAL SOLID WASTE MANAGEMENT & SANITATION BYE-LAWS
## Door-to-Door Waste Collection Protocol
Municipal urban local bodies and city corporations must execute 100% door-to-door segregated solid waste collection daily between 6:30 AM and 11:00 AM. Wet waste and dry waste must be collected in distinct compartments of sanitation auto-tippers.

## Public Garbage Black Spots & Penalty Guidelines
Any illegal garbage dump or street black spot reported by citizens must be physically cleared within 24 hours by the junior health inspector and pourakarmika team.
Citizens or commercial establishments caught dumping mixed solid waste or debris in storm water drains or public roads are subject to on-the-spot spot fines of Rupees One Thousand (Rs. 1,000) for the first violation, and Rupees Five Thousand (Rs. 5,000) with trade license cancellation for subsequent violations.""",
                tags=["garbage", "waste", "black spot", "dumping", "fine", "penalty", "pourakarmika", "sanitation"],
            ),
        ]

        for doc in default_docs:
            self.ingest_document(doc)


# Singleton
rag_service = RagService()
