import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(HexColor("#64748B"))
        
        # Header (on pages after cover/first page)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "VCGIS — Current Architecture & User Flow Document")
            self.setStrokeColor(HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 36, page_text)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — VCGIS PROJECT")
        self.setStrokeColor(HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 8.5 * inch - 54, 48)
        self.restoreState()

def create_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=HexColor('#0F172A'),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=HexColor('#2563EB'),
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=HexColor('#1E293B'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=HexColor('#334155'),
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=HexColor('#334155'),
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=HexColor('#0F172A'),
        spaceAfter=0
    )

    callout_style = ParagraphStyle(
        'Callout_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=HexColor('#1E3A8A'),
        spaceAfter=0
    )

    elements = []

    # Title & Header
    elements.append(Paragraph("VCGIS — Architecture & User Flow Document", subtitle_style))
    elements.append(Paragraph("Volunteer-Assisted Civic Grievance Intelligence System", title_style))
    elements.append(Paragraph("Comprehensive Current Implementation Specification", ParagraphStyle('SubSub', parent=subtitle_style, fontSize=10, textColor=HexColor('#64748B'), spaceAfter=10)))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=HexColor('#2563EB'), spaceBefore=0, spaceAfter=12))

    # Executive Overview Callout
    overview_text = "<b>Executive Summary:</b> This document details the EXACT current architecture and operational user flows of VCGIS. It serves as an authoritative reference based on the existing codebase without assuming future redesigns or modifying any code."
    callout_data = [[Paragraph(overview_text, callout_style)]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor('#EFF6FF')),
        ('BOX', (0,0), (-1,-1), 1, HexColor('#93C5FD')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(callout_table)
    elements.append(Spacer(1, 10))

    # Section 1
    elements.append(Paragraph("1. Project Architecture", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    elements.append(Paragraph("The VCGIS system follows a modern decoupled microservices architecture designed for human-in-the-loop verification.", body_style))
    
    arch_components = [
        "<b>Frontend:</b> React 18, TypeScript, TailwindCSS, Lucide Icons (Vite SPA). Integrated with Web Speech API for voice input and Mapbox/Leaflet for geolocation tagging.",
        "<b>Backend API:</b> Node.js with Express, TypeScript, and Prisma ORM. Handles JWT auth, RBAC authorization, CRUD operations, grievance routing, and state transitions.",
        "<b>AI Service:</b> Python 3.11 with FastAPI. Executes NLP extraction, automated category/department classification, priority calculation, duplicate detection, and uncertainty scoring.",
        "<b>Database:</b> PostgreSQL relational database managed via Prisma ORM schemas. Stores users, grievances, audit logs, volunteer assignments, department queues, and AI scores.",
        "<b>Communication Channels:</b> Frontend ← (HTTP / REST) → Backend API ← (HTTP / REST) → AI Service, Backend ← (Prisma Client) → PostgreSQL DB."
    ]
    for comp in arch_components:
        elements.append(Paragraph(f"• {comp}", bullet_style))
    
    elements.append(Spacer(1, 6))

    # Architecture Box Diagram
    arch_diag = (
        "<b>Component Dataflow Diagram:</b><br/>"
        "&nbsp;&nbsp;[ Citizen UI / Voice / Web ]<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│ (REST / JSON + JWT)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br/>"
        "&nbsp;&nbsp;[ Express Backend API (Port 5000) ] ◄── Prisma ORM ──► [ PostgreSQL Database ]<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│ (HTTP POST /classify)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br/>"
        "&nbsp;&nbsp;[ Python FastAPI AI Service (Port 8000) ] (TF-IDF / HuggingFace Embeddings)"
    )
    diag_table = Table([[Paragraph(arch_diag, code_style)]], colWidths=[504])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(diag_table)
    elements.append(Spacer(1, 10))

    # Section 2
    elements.append(Paragraph("2. User Roles & RBAC Permissions", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    roles_data = [
        [Paragraph("<b>Role</b>", body_style), Paragraph("<b>Target User</b>", body_style), Paragraph("<b>Key Responsibilities & Capabilities</b>", body_style)],
        [Paragraph("<b>CITIZEN</b>", body_style), Paragraph("General Public", body_style), Paragraph("Simplified grievance submission, voice input, tracking, feedback on resolution.", body_style)],
        [Paragraph("<b>VOLUNTEER</b>", body_style), Paragraph("Community Verifiers", body_style), Paragraph("Mandatory human verification layer. Validates AI predictions, performs field check, routes to dept.", body_style)],
        [Paragraph("<b>DEPARTMENT_STAFF</b>", body_style), Paragraph("Water, Road, Electricity", body_style), Paragraph("Receives verified grievances in department queue, assigns field teams, updates status, uploads proof.", body_style)],
        [Paragraph("<b>OFFICIAL</b>", body_style), Paragraph("Supervisors", body_style), Paragraph("Monitors SLA compliance, reviews escalated/high-priority issues, overrides routing, analytics.", body_style)],
        [Paragraph("<b>ADMIN</b>", body_style), Paragraph("Administrators", body_style), Paragraph("User management, role assignment, system health monitoring, department setup, master config.", body_style)],
    ]
    roles_table = Table(roles_data, colWidths=[110, 110, 284])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#F1F5F9')),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(roles_table)
    elements.append(Spacer(1, 10))

    # Section 3 & 4
    elements.append(Paragraph("3. Simplified Citizen User Flow & AI Assist", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    cit_points = [
        "<b>Zero Technical Complexity:</b> Citizens do NOT select departments, categories, or priority levels.",
        "<b>Voice & Multi-lingual Input:</b> Citizen records audio or types problem in natural everyday language.",
        "<b>Real-time AI Assist:</b> AI extracts location, detects potential duplicate complaints in real-time, and assists input.",
        "<b>Submission & Tracking:</b> Citizen receives a tracking code (e.g. <code>GRV-2026-X892</code>) and tracks status live."
    ]
    for pt in cit_points:
        elements.append(Paragraph(f"• {pt}", bullet_style))
    
    elements.append(Spacer(1, 8))

    elements.append(Paragraph("4. End-to-End Complaint Journey", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    journey_steps = [
        "<b>1. Submission:</b> Citizen submits raw text/voice → Saved as <code>SUBMITTED</code>.",
        "<b>2. AI Analysis:</b> AI Service generates category, department, severity score (1-5), priority, and confidence score.",
        "<b>3. Mandatory Verification:</b> Moves to <code>PENDING_VERIFICATION</code>. Sent to Volunteer pool.",
        "<b>4. Volunteer Review:</b> Volunteer verifies AI recommendations, validates photo/location, and clicks <code>VERIFY & ROUTE</code>.",
        "<b>5. Department Execution:</b> Grievance reaches targeted Department Queue. Staff accepts (<code>IN_PROGRESS</code>) and resolves (<code>RESOLVED</code>).",
        "<b>6. Official Oversight & Feedback:</b> Official monitors SLA. Citizen confirms resolution satisfaction."
    ]
    for step in journey_steps:
        elements.append(Paragraph(f"• {step}", bullet_style))

    elements.append(Spacer(1, 10))

    # Section 5 & 6
    elements.append(Paragraph("5. AI Service Flow & Severity Scoring", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    ai_points = [
        "<b>Multi-Modal Input:</b> Accepts natural language text description, GPS coordinates, and media attachments.",
        "<b>Feature Extraction:</b> TF-IDF + Keyword matching identifies core intent (e.g., 'pipeline break' → Water Dept).",
        "<b>Severity Matrix (1 to 5):</b> Calculates risk score based on hazard terms (e.g., 'flooding', 'exposed wire', 'hospital').",
        "<b>Uncertainty Calibration:</b> If confidence < 0.65, flagged as <code>NEEDS_HUMAN_ATTENTION</code> for priority volunteer review.",
        "<b>Duplicate Detection Engine:</b> Cosine similarity over embeddings flags potential duplicate complaints."
    ]
    for pt in ai_points:
        elements.append(Paragraph(f"• {pt}", bullet_style))

    elements.append(Spacer(1, 8))

    elements.append(Paragraph("6. Volunteer Human-in-the-Loop Flow", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    vol_points = [
        "<b>CRITICAL ARCHITECTURAL GUARANTEE:</b> No direct Citizen → Department routing exists. Volunteer layer is MANDATORY.",
        "<b>Verification Interface:</b> Volunteer sees original Citizen description alongside AI suggestions.",
        "<b>Refinement Capabilities:</b> Volunteer can adjust category, correct department mistargets, refine location, and attach notes.",
        "<b>Action Triggers:</b> Clicking 'Verify & Route' changes status to <code>VERIFIED</code> and pushes complaint to Department Staff queue."
    ]
    for pt in vol_points:
        elements.append(Paragraph(f"• {pt}", bullet_style))

    elements.append(Spacer(1, 10))

    # Section 7 & 8
    elements.append(Paragraph("7. Department Staff, Official & Admin Workflows", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    dept_points = [
        "<b>Department Staff:</b> View isolated department queue (e.g., Water Staff only sees Water complaints). Picks up <code>VERIFIED</code> complaints, transitions to <code>IN_PROGRESS</code>, uploads completion photos/notes, and updates to <code>RESOLVED</code>.",
        "<b>Official Supervision:</b> High-level dashboard tracking SLA breaches, department bottleneck charts, high-priority alerts, and re-routing.",
        "<b>Admin Management:</b> Complete governance over user accounts, role assignments, department setup, logs, and master configuration."
    ]
    for pt in dept_points:
        elements.append(Paragraph(f"• {pt}", bullet_style))

    elements.append(Spacer(1, 8))

    elements.append(Paragraph("8. Complaint Status Lifecycle", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    status_data = [
        [Paragraph("<b>Status Code</b>", body_style), Paragraph("<b>Description / State Trigger</b>", body_style)],
        [Paragraph("<code>SUBMITTED</code>", body_style), Paragraph("Newly submitted by Citizen. Stored in DB, sent to AI analysis.", body_style)],
        [Paragraph("<code>PENDING_VERIFICATION</code>", body_style), Paragraph("AI analysis completed. Awaiting Volunteer review.", body_style)],
        [Paragraph("<code>VERIFIED</code>", body_style), Paragraph("Volunteer verified & confirmed routing. Added to Department queue.", body_style)],
        [Paragraph("<code>IN_PROGRESS</code>", body_style), Paragraph("Department Staff accepted complaint and dispatched field workers.", body_style)],
        [Paragraph("<code>RESOLVED</code>", body_style), Paragraph("Work completed by Department Staff with proof uploaded.", body_style)],
        [Paragraph("<code>CLOSED</code>", body_style), Paragraph("Citizen confirmed satisfaction or auto-closed after SLA period.", body_style)],
        [Paragraph("<code>REJECTED</code>", body_style), Paragraph("Flagged as invalid, spam, or duplicate by Volunteer/Official.", body_style)],
    ]
    status_table = Table(status_data, colWidths=[150, 354])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#F1F5F9')),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(status_table)

    elements.append(Spacer(1, 10))

    # Section 9 & 10
    elements.append(Paragraph("9. End-to-End System Flow Diagram", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    flow_diagram = (
        "CITIZEN (Simple Voice / Text Submission)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;│<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;▼<br/>"
        "AI ASSIST & SERVICE (Auto-Categorization, Severity Scoring & Duplicate Check)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;│<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;▼<br/>"
        "VOLUNTEER REVIEW (Mandatory Human-in-the-Loop Verification)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;│<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;▼<br/>"
        "DEPARTMENT ROUTING (Queued to Water, Roads, Electricity, etc.)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;│<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;▼<br/>"
        "DEPARTMENT STAFF (Field Work & Resolution Upload)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;│<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;├─────────────────────────────┐<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;▼                             ▼<br/>"
        "OFFICIAL SUPERVISION           CITIZEN TRACKING & CLOSURE<br/>"
        "(SLA & Escalation Monitoring)  (Feedback & Resolution Verification)"
    )
    flow_table = Table([[Paragraph(flow_diagram, code_style)]], colWidths=[504])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor('#EFF6FF')),
        ('BOX', (0,0), (-1,-1), 1, HexColor('#3B82F6')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(flow_table)

    elements.append(Spacer(1, 10))

    elements.append(Paragraph("10. Architectural Highlights & Verification", h1_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CBD5E1'), spaceBefore=0, spaceAfter=6))
    
    highlights = [
        "<b>No Direct Routing Safeguard:</b> Enforced both at UI level and API middleware. Direct citizen submit to department endpoints is blocked.",
        "<b>Resilient Verification Suite:</b> Frontend TypeScript check (0 errors), Backend Express typecheck (0 errors), AI Service PyTest suite (29/29 passing).",
        "<b>Demo Seed Data Ready:</b> Department staff demo accounts active for Water (water.staff@vcgis.gov.in), Roads (roads.staff@vcgis.gov.in), and Electricity (electricity.staff@vcgis.gov.in)."
    ]
    for h in highlights:
        elements.append(Paragraph(f"• {h}", bullet_style))

    doc.build(elements, canvasmaker=NumberedCanvas)

if __name__ == "__main__":
    out_dir = os.path.join(os.getcwd(), "docs")
    os.makedirs(out_dir, exist_ok=True)
    pdf_path = os.path.join(out_dir, "VCGIS_CURRENT_ARCHITECTURE_AND_USER_FLOW.pdf")
    create_pdf(pdf_path)
    print(f"PDF successfully generated at: {pdf_path}")
