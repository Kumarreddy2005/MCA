# VCGIS — Complete System Requirements

**Project Name:** Volunteer-CGIS  
**Full Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System  
**Document:** Master Product & Technical Requirements  
**Status:** Authoritative Development Requirement  
**Version:** 1.0  
**Last Updated:** 2026-09-12

---

# 1. Purpose

VCGIS is a digital grievance-management platform designed to connect citizens, village volunteers, government department officials, and administrators through a centralized complaint-management and intelligence system.

The system must support:

1. Direct citizen grievance submission.
2. Village volunteer-assisted citizen registration and grievance submission.
3. Volunteer field verification.
4. Department-wise grievance routing.
5. AI-assisted complaint understanding.
6. Generative-AI-assisted decision support.
7. Duplicate and similar complaint detection.
8. Complaint priority intelligence.
9. Location intelligence.
10. Department official review and action.
11. SLA monitoring.
12. Complaint tracking and notifications.
13. Administrative management.
14. Auditability and accountability.
15. Analytics and reporting.
16. Multilingual and rural-friendly interaction.
17. Human-in-the-loop governance.
18. Secure role-based access.
19. Multi-agent software-development support using multiple coding agents.

The platform must NOT allow AI to replace authorized human government decisions.

AI is a decision-support layer.

Authorized officials remain responsible for final decisions, assignments, actions, approvals, and resolutions.

---

# 2. Core Principles

## 2.1 Human Authority

AI may:

- analyze
- classify
- summarize
- recommend
- detect similarity
- extract information
- suggest priority
- recommend departments
- assist users

AI must NOT independently:

- resolve complaints
- reject legitimate complaints
- approve government actions
- make legally binding decisions
- change user permissions
- bypass RBAC
- modify audit history
- impersonate officials
- fabricate evidence
- fabricate government policy
- finalize sensitive decisions without authorized human review

## 2.2 Assisted Rural Access

Village Volunteers are an assisted-access and field-verification layer.

A citizen who cannot or does not want to use the digital portal must be able to approach a Village Volunteer.

The volunteer must be able to:

- register citizens
- create complaints on behalf of citizens
- upload evidence
- capture location
- verify information
- update permitted information
- track complaints
- assist citizens in understanding complaint status

The volunteer must not gain unrestricted access to citizen data or department functions.

## 2.3 Department Isolation

Department officials must only access complaints that belong to:

- their department
- their assigned jurisdiction
- their authorized scope

Cross-department access must be explicitly authorized.

## 2.4 Auditability

Important operations must create audit records.

The system must preserve:

- who performed an action
- when it happened
- what changed
- previous state where appropriate
- new state where appropriate
- source of action
- actor role
- complaint identifier
- related entity
- relevant AI recommendation

Audit history must not be silently modified or deleted.

---

# 3. Technology Architecture

## 3.1 Frontend

Technology:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- reusable component architecture
- responsive UI

The frontend must support:

- desktop
- tablet
- mobile
- low-complexity rural workflows
- accessibility
- multilingual UI
- role-specific dashboards

## 3.2 Backend

Technology:

- Node.js
- Express
- TypeScript
- REST APIs
- JWT authentication
- RBAC
- validation
- logging
- Socket.IO/realtime events
- background jobs where required

The backend is the primary application and business-logic layer.

The backend must enforce:

- authentication
- authorization
- validation
- department isolation
- workflow rules
- complaint state transitions
- SLA rules
- audit rules
- notification rules

## 3.3 AI Service

Technology:

- Python
- FastAPI

The AI service must expose controlled APIs for:

- OCR
- NLP
- complaint classification
- location extraction
- priority intelligence
- semantic similarity
- summarization
- keyword extraction
- multilingual processing
- GenAI
- RAG

The AI service must not directly bypass the backend security model.

## 3.4 Database

Primary database:

- MongoDB

The database must support:

- users
- roles
- departments
- jurisdictions
- complaints
- complaint history
- evidence
- AI results
- assignments
- SLA records
- notifications
- audit records
- analytics data
- knowledge documents
- volunteer verification data

## 3.5 File/Evidence Storage

Evidence may include:

- images
- documents
- PDFs
- audio
- video where required

Evidence must be stored securely.

The application must store metadata separately from raw evidence where appropriate.

---

# 4. User Roles

## 4.1 Citizen

Citizen capabilities:

- signup
- login
- profile
- submit complaint
- upload evidence
- view complaints
- track complaint status
- view complaint history
- receive notifications
- communicate through permitted workflows
- reopen eligible complaints
- provide feedback
- use AI-assisted help

## 4.2 Village Volunteer

Volunteer capabilities:

- login
- profile
- register citizens
- create complaints for citizens
- upload evidence
- capture location
- verify citizen-provided information
- perform field verification
- update verification status
- view assigned/authorized complaints
- track complaints
- assist citizens
- receive notifications
- use Volunteer AI Assistant

Volunteers must not:

- access unrelated department data
- change final official decisions
- resolve complaints unless explicitly authorized by workflow
- access administrator functions

## 4.3 Department Official

Department officials must be able to:

- login
- access department dashboard
- view assigned complaints
- review complaint information
- view evidence
- view AI analysis
- review similarity results
- review priority recommendation
- verify department routing
- assign/reassign within permitted authority
- update complaint status
- add official notes
- record actions
- request additional information
- record resolution
- reject with valid reason where permitted
- reopen eligible complaints
- monitor SLA
- communicate with citizen/volunteer through approved channels
- use Official AI Assistant

## 4.4 Administrator

Administrator capabilities:

- administrator login
- manage users
- manage roles
- manage departments
- manage jurisdictions
- manage volunteers
- manage officials
- manage system configuration
- manage complaint categories
- manage workflows
- monitor complaints
- monitor SLA
- monitor AI services
- view analytics
- manage knowledge base
- view audit logs
- manage notifications
- monitor security events

Administrator must not be used as a substitute for proper application roles.

---

# 5. Authentication & Authorization

## 5.1 Authentication

Implement:

- citizen signup
- citizen login
- volunteer login
- department official login
- admin login
- logout
- token validation
- token refresh where required
- password hashing
- password reset
- account activation/deactivation

## 5.2 Account Creation Rules

Citizen accounts:

- citizens may self-register

Volunteer accounts:

- created/approved by authorized administration

Department official accounts:

- created/approved by authorized administration

Admin accounts:

- provisioned securely

Administrative credentials must NEVER be hardcoded into source code.

Credentials must NOT be stored in:

- Git
- frontend source
- `.env.example`
- documentation
- logs
- database seed files containing real passwords

Development credentials must use environment variables or secure local configuration.

## 5.3 RBAC

Every protected API endpoint must verify:

1. authentication
2. role
3. resource ownership/scope
4. department/jurisdiction permissions

Frontend route protection is not sufficient.

Backend authorization is mandatory.

---

# 6. Citizen Portal

## Dashboard

Display:

- active complaints
- resolved complaints
- pending complaints
- recent updates
- notifications
- important SLA/status information

## Complaint Creation

Citizen must be able to:

- enter complaint title
- enter description
- select or suggest category
- attach evidence
- provide location
- submit complaint

The system should support:

- text
- images
- documents
- audio where implemented
- multilingual input where implemented

## Complaint Tracking

Citizen must see:

- complaint ID
- title
- category
- department
- location
- priority
- current status
- assigned department
- assigned official where permitted
- submission date
- last update
- SLA information
- resolution information

## Complaint Timeline

Display chronological events:

- created
- verified
- analyzed
- routed
- assigned
- action taken
- information requested
- resolved
- reopened
- closed

## Feedback

Citizen should be able to provide:

- satisfaction rating
- feedback
- resolution quality feedback

---

# 7. Volunteer Portal

## Volunteer Dashboard

Display:

- assigned complaints
- pending verification
- recent registrations
- unresolved complaints
- urgent complaints
- SLA-related tasks
- citizen assistance requests

## Citizen Registration

Volunteer must be able to register a citizen.

Fields may include:

- name
- contact information
- address
- locality
- optional identification information where legally required

The system must follow data minimization.

## Complaint Registration on Behalf of Citizen

Volunteer must be able to:

1. select registered citizen
2. enter complaint
3. capture citizen statement
4. attach evidence
5. capture location
6. submit complaint
7. verify information
8. track generated complaint ID

The system must record that the complaint was created through volunteer assistance.

## Field Verification

Volunteer must be able to:

- open assigned verification task
- view complaint
- visit/report field information
- add verification notes
- upload photographs
- capture location
- indicate verification result
- submit verification

Verification must be timestamped and auditable.

## Volunteer AI Assistant

The assistant may help volunteers:

- structure a citizen's verbal complaint
- summarize complaint information
- suggest complaint category
- identify missing information
- suggest questions to ask
- translate supported languages
- explain complaint status
- explain next workflow step
- draft a clear complaint description

The assistant must not fabricate citizen statements.

---

# 8. Complaint Management

Every complaint must have a unique identifier.

Complaint data should contain:

- complaint ID
- citizen
- volunteer if applicable
- title
- description
- category
- subcategory
- location
- evidence
- source
- department
- jurisdiction
- priority
- AI analysis
- similarity results
- assignment
- SLA
- status
- timestamps
- history
- resolution
- feedback

---

# 9. Complaint Lifecycle

Recommended lifecycle:

```text
DRAFT
    ↓
SUBMITTED
    ↓
VALIDATING
    ↓
VERIFICATION_REQUIRED
    ↓
VERIFIED
    ↓
AI_ANALYSIS
    ↓
ROUTING
    ↓
ASSIGNED
    ↓
UNDER_REVIEW
    ↓
ACTION_IN_PROGRESS
    ↓
INFORMATION_REQUIRED
    ↓
RESOLVED
    ↓
CLOSED
```

Additional states:

```text
REOPENED
REJECTED
DUPLICATE
CANCELLED
ESCALATED
ON_HOLD
```

All transitions must be validated.

Users cannot arbitrarily set any status.

---

# 10. Complaint Validation

Before final processing:

- validate required fields
- validate file types
- validate file sizes
- validate location
- validate user authorization
- validate complaint state
- detect possible duplicate complaints
- detect incomplete information
- verify department routing

---

# 11. AI Intelligence Layer

AI must operate as a structured processing pipeline.

Recommended pipeline:

```text
Complaint
   ↓
Input Validation
   ↓
OCR / Document Processing
   ↓
Text Extraction
   ↓
NLP
   ↓
Entity / Location Extraction
   ↓
Classification
   ↓
Priority Intelligence
   ↓
Similarity Detection
   ↓
Department Recommendation
   ↓
Summary / Keywords
   ↓
Human Review
   ↓
Backend Workflow
```

---

# 12. OCR

OCR must support appropriate uploaded documents/images.

Capabilities:

- image text extraction
- PDF text extraction
- scanned document processing
- OCR confidence
- extracted text storage
- source/evidence reference

OCR output must be distinguishable from original citizen content.

Low-confidence OCR must be flagged.

---

# 13. NLP

NLP must extract:

- complaint intent
- entities
- location
- department clues
- issue type
- keywords
- important dates
- mentioned organizations
- mentioned infrastructure
- urgency indicators

---

# 14. Complaint Classification

AI should classify complaints into configured categories.

Examples:

- roads
- drainage
- electricity
- water
- sanitation
- waste management
- public infrastructure
- government services
- certificates/documents
- welfare services
- agriculture
- education-related public services
- health-related public services
- other configured departments/categories

Categories must be configurable.

AI must return:

- predicted category
- confidence
- alternative categories where useful
- explanation/features

Low-confidence results require human review.

---

# 15. Location Intelligence

Extract and normalize:

- village
- ward
- mandal/block
- district
- state
- landmark
- address
- coordinates when available

Support:

- user-provided coordinates
- volunteer-captured coordinates
- extracted textual location

Location information must be validated before routing.

---

# 16. Priority Intelligence

The system must calculate an AI-assisted priority recommendation.

Possible factors:

- severity
- urgency
- number of affected citizens
- public safety implications
- infrastructure importance
- vulnerable population indicators
- geographic impact
- complaint age
- repeated complaints
- SLA risk

AI output:

```text
priority
confidence
factors
explanation
recommended_action
```

Priority must remain reviewable by authorized officials.

AI must not silently change official priority decisions.

---

# 17. Similarity & Duplicate Detection

The system must identify potentially duplicate/similar complaints.

Use:

- semantic similarity
- embeddings where appropriate
- metadata similarity
- location similarity
- category similarity
- time-window similarity

Results must include:

- similar complaint IDs
- similarity score
- reason
- duplicate recommendation

The system must never automatically discard a complaint solely because an AI model says it is a duplicate.

---

# 18. Department Recommendation

AI may recommend the most appropriate department.

Output:

```text
recommended_department
confidence
reason
alternative_departments
```

Backend workflow must validate the recommendation.

Authorized officials must be able to override it.

---

# 19. AI Summarization

Generate concise summaries for:

- citizens
- volunteers
- officials
- administrators

Summaries must preserve important facts.

Do not invent:

- evidence
- dates
- people
- actions
- resolutions
- government policies

---

# 20. Keywords

Extract useful keywords for:

- search
- analytics
- classification
- similarity
- reporting
- department dashboards

---

# 21. Human Review

Human review is mandatory when:

- confidence is low
- complaint is sensitive
- AI results conflict
- evidence is unclear
- routing is uncertain
- duplicate detection is uncertain
- policy/legal interpretation is involved
- official review is required

The UI must clearly distinguish:

```text
AI Recommendation
```

from:

```text
Official Decision
```

---

# 22. Generative AI Layer

GenAI is an assistant, not the system of authority.

GenAI capabilities include:

## Complaint Understanding

Convert unstructured input into structured information.

```text
Citizen statement
        ↓
Structured complaint draft
```

## Complaint Rewriting

Generate clear complaint descriptions without changing facts.

## Summarization

Summarize:

- complaint
- history
- evidence
- verification
- actions
- related complaints

## Missing Information Detection

Identify information that may be required.

Example:

```text
Missing:
- exact location
- date of incident
- affected area
```

## Volunteer Assistant

Assist volunteers with:

- complaint drafting
- translation
- clarification questions
- status explanations
- structured data entry

## Official Assistant

Assist officials with:

- complaint summaries
- related complaint summaries
- action history
- possible next steps
- draft responses
- draft official notes
- SLA risk summaries

Official must approve generated responses before sending.

## Citizen Assistant

Assist citizens with:

- complaint creation
- status explanation
- workflow explanation
- required information
- general system guidance

The assistant must clearly state when it cannot provide authoritative government/legal decisions.

---

# 23. Multilingual Support

The system should support Indian-language workflows where feasible.

Requirements:

- multilingual UI
- multilingual complaint input
- translation
- multilingual AI assistance
- language-aware summarization
- preservation of original text

Original citizen content must always remain available.

Translated/generated text must be labeled appropriately.

---

# 24. RAG Knowledge Assistant

Implement a Retrieval-Augmented Generation system for trusted knowledge.

Knowledge sources may include:

- department procedures
- approved FAQs
- service guidelines
- government documents
- workflow instructions
- official policy documents

RAG must:

1. retrieve approved information
2. provide source references
3. generate an answer based on retrieved content
4. avoid unsupported claims

Knowledge documents must have:

- title
- department
- version
- effective date
- source
- approval state
- document status

Outdated documents must not silently remain authoritative.

---

# 25. Department Portal

Department dashboard must show:

- total complaints
- new complaints
- pending complaints
- urgent complaints
- SLA-risk complaints
- resolved complaints
- reopened complaints

## Complaint Review

Official can view:

- complaint details
- citizen information permitted by role
- volunteer information permitted by role
- evidence
- field verification
- AI analysis
- similarity
- location
- timeline
- SLA
- previous actions

---

# 26. Official Actions

Officials may:

- accept
- assign
- reassign
- request information
- add notes
- start action
- update progress
- resolve
- reject with reason where permitted
- reopen
- escalate

Every important action must be audited.

---

# 27. SLA Management

Each complaint type may have configured SLA rules.

Track:

- SLA start
- SLA deadline
- elapsed time
- remaining time
- breached state
- escalation state

Statuses:

```text
ON_TRACK
AT_RISK
BREACHED
RESOLVED
```

The system must support escalation.

---

# 28. Notifications

Notifications must support:

- in-app notifications
- realtime updates
- email where configured
- SMS/other channels where configured

Events include:

- complaint created
- complaint verified
- complaint assigned
- complaint updated
- information requested
- SLA warning
- SLA breach
- complaint resolved
- complaint reopened

Users must only receive notifications they are authorized to receive.

---

# 29. Realtime

Use Socket.IO or equivalent realtime mechanism for:

- status changes
- assignments
- notifications
- dashboard updates
- official action updates where appropriate

Realtime events must also respect authorization.

---

# 30. Admin Portal

## User Management

Manage:

- citizens
- volunteers
- officials
- administrators

Operations:

- create
- activate
- deactivate
- approve
- assign role
- assign department
- assign jurisdiction

## Department Management

- create department
- update department
- deactivate department
- categories
- subcategories
- SLA configuration

## Volunteer Management

- registration
- approval
- assignment
- jurisdiction
- status
- performance

## Official Management

- account creation
- department assignment
- jurisdiction
- permissions
- activation/deactivation

---

# 31. Analytics

## Complaint Analytics

- total complaints
- complaints by category
- complaints by department
- complaints by location
- complaints by status
- complaints by priority
- complaints over time

## SLA Analytics

- average resolution time
- SLA compliance
- SLA breach rate
- department performance

## Volunteer Analytics

- registrations
- complaints registered
- verification activity
- resolution tracking

## AI Analytics

- classification accuracy
- routing accuracy
- OCR accuracy
- similarity performance
- priority agreement
- human-AI agreement
- confidence distribution

---

# 32. Geographic Intelligence

Where location data is available:

- map complaints
- cluster complaints
- show complaint density
- identify hotspots
- filter by department
- filter by category
- filter by priority
- filter by date

Maps must not expose unauthorized citizen information.

---

# 33. Evidence Management

Evidence management must support:

- upload
- preview where supported
- download where authorized
- metadata
- timestamps
- source
- complaint association
- verification association

Security controls:

- file validation
- file-size validation
- safe filenames
- malware/security scanning where available
- access control
- no public exposure by default

---

# 34. Audit System

Audit events should include:

```text
actor
actorRole
action
entityType
entityId
timestamp
previousState
newState
source
ip/device metadata where appropriate
```

Audit logs must be protected from ordinary users.

---

# 35. Search

Global search must support authorized data only.

Search targets:

- complaint ID
- complaint title
- keywords
- citizen reference
- department
- category
- location
- status
- priority

Semantic search may be added using embeddings.

---

# 36. API Requirements

Backend REST APIs must be organized by domain.

Examples:

```text
/api/auth
/api/users
/api/citizens
/api/volunteers
/api/officials
/api/admin
/api/complaints
/api/complaints/:id
/api/complaints/:id/evidence
/api/complaints/:id/history
/api/complaints/:id/assign
/api/complaints/:id/verify
/api/complaints/:id/actions
/api/complaints/:id/resolve
/api/complaints/:id/reopen
/api/ai
/api/ai/ocr
/api/ai/classify
/api/ai/priority
/api/ai/similarity
/api/ai/summary
/api/ai/location
/api/ai/department
/api/genai
/api/rag
/api/sla
/api/notifications
/api/analytics
/api/audit
```

Exact API naming may be adjusted during architecture review, but APIs must remain consistent.

---

# 37. API Validation

Every endpoint must validate:

- authentication
- authorization
- input schema
- path parameters
- query parameters
- request body
- files
- resource ownership
- workflow state

Never trust frontend validation alone.

---

# 38. Error Handling

All APIs must return consistent error structures.

Example:

```json
{
  "success": false,
  "error": {
    "code": "COMPLAINT_NOT_FOUND",
    "message": "Complaint not found"
  }
}
```

Do not expose:

- stack traces
- secrets
- internal database details
- model credentials
- sensitive system information

---

# 39. Frontend Requirements

Frontend must have reusable:

- buttons
- forms
- inputs
- selects
- dialogs
- modals
- tables
- cards
- badges
- status indicators
- charts
- maps
- timelines
- notification components
- AI result components
- evidence components

Avoid duplicate UI implementations.

---

# 40. Role-Based Frontend Routing

Routes must be separated by role.

Example:

```text
/login
/signup

/citizen/*
/volunteer/*
/official/*
/admin/*
```

Unauthorized users must be redirected appropriately.

---

# 41. UI/UX Requirements

The interface must be:

- clean
- professional
- responsive
- accessible
- consistent
- easy to understand
- suitable for non-technical citizens
- suitable for rural assisted workflows

Avoid unnecessary complexity.

Use clear status labels.

AI recommendations must be visually distinguishable from official decisions.

---

# 42. Accessibility

Support:

- keyboard navigation
- readable typography
- sufficient contrast
- labels
- accessible forms
- screen-reader-friendly controls
- responsive layouts

---

# 43. Security

Mandatory security requirements:

- secure password hashing
- JWT security
- RBAC
- backend authorization
- input validation
- output sanitization
- secure file handling
- rate limiting
- CORS configuration
- secure headers
- environment-based secrets
- logging
- audit trail
- department isolation
- data minimization

Never commit secrets.

---

# 44. Privacy

Collect only necessary information.

Protect:

- citizen personal information
- contact information
- evidence
- location
- complaint history

Do not expose personal information in:

- public dashboards
- unauthorized APIs
- logs
- AI prompts unnecessarily
- analytics

---

# 45. AI Security

AI systems must prevent:

- prompt injection where applicable
- unauthorized data retrieval
- sensitive-data leakage
- hallucinated government decisions
- unauthorized tool execution
- cross-department data leakage

AI-generated content must be treated as untrusted output until validated.

---

# 46. AI Explainability

Important AI outputs should include:

```text
prediction
confidence
reason
supporting factors
timestamp
model/version where appropriate
human decision
```

The system should preserve enough metadata to evaluate AI performance later.

---

# 47. AI Evaluation

The system must support evaluation of:

- OCR accuracy
- classification F1
- routing accuracy
- priority agreement
- similarity precision/recall/F1
- summary quality
- human-AI agreement
- processing latency

Evaluation datasets and metrics must be separated from production user data.

---

# 48. Background Processing

Long-running operations should use background jobs where appropriate.

Examples:

- OCR
- embeddings
- similarity indexing
- AI analysis
- notifications
- report generation
- analytics aggregation

Users should not be forced to wait for unnecessary long-running operations.

---

# 49. Observability

Implement:

- application logs
- API logs
- AI processing logs
- error tracking
- performance monitoring
- job monitoring
- audit events

Logs must not contain secrets or unnecessary personal data.

---

# 50. Testing Requirements

Every major feature requires tests.

## Unit Tests

Test:

- services
- utilities
- validators
- authorization
- workflow rules
- AI processing logic

## Integration Tests

Test:

- APIs
- database operations
- authentication
- authorization
- complaint lifecycle
- AI integration
- notification integration

## End-to-End Tests

Test complete workflows.

Citizen workflow:

```text
Citizen Signup
↓
Login
↓
Create Complaint
↓
AI Analysis
↓
Department Routing
↓
Official Review
↓
Action
↓
Resolution
↓
Citizen Notification
```

Volunteer workflow:

```text
Volunteer Login
↓
Register Citizen
↓
Create Complaint
↓
Verify
↓
AI Analysis
↓
Department Routing
↓
Official Action
↓
Resolution
```

---

# 51. Regression Testing

Every significant change must verify that existing functionality continues to work.

At minimum:

- frontend build
- backend build
- AI service validation
- type checking
- linting
- unit tests
- integration tests where applicable
- authorization tests

---

# 52. Documentation

Maintain documentation for:

- architecture
- APIs
- database models
- AI pipeline
- GenAI architecture
- RAG
- authentication
- RBAC
- workflows
- deployment
- development
- testing
- agent architecture

Architecture decisions must be recorded as ADRs.

---

# 53. Multi-Agent Development System

VCGIS must be designed so multiple coding agents can work on the same project.

Supported agents/tools should include:

- Antigravity
- GitHub Copilot
- Claude Code
- OpenCode
- Codex
- Cursor
- Gemini CLI
- zcode
- other compatible CLI/IDE agents

The system must not depend on one particular AI vendor.

---

# 54. Shared Agent Intelligence

The existing `.ai/` project-intelligence system is the shared project memory/index.

Agents must use the existing project intelligence instead of repeatedly scanning the entire repository.

Source code remains authoritative.

The graph/index is an intelligent project map.

Agents should retrieve only relevant context.

---

# 55. Agent Instruction Files

Maintain adapters/instructions for supported tools.

Required:

```text
AGENTS.md
CLAUDE.md
.github/copilot-instructions.md
.opencode/agents/
```

Additional tool-specific configuration may be added where supported.

All agent instructions must point back to the same `.ai/` project intelligence.

No tool may create an independent competing project memory.

---

# 56. Specialized Agents

The system should support specialized agents for:

```text
Orchestrator
Architect
Planner
Frontend
Backend
Database
AI/ML
GenAI
RAG
Security
UI/UX
QA
DevOps
Documentation
Reviewer
Research
Performance
```

---

# 57. Orchestrator Agent

The Orchestrator coordinates development.

Responsibilities:

1. understand request
2. retrieve project context
3. identify affected features
4. inspect architecture
5. determine dependencies
6. create implementation plan
7. split work
8. assign specialized agents
9. prevent conflicting edits
10. track task state
11. coordinate tests
12. coordinate reviews
13. integrate completed work
14. update project intelligence
15. verify completion

---

# 58. Agent Task Protocol

Every agent task should contain:

```text
TASK_ID
FEATURE
OBJECTIVE
ROLE
INPUTS
DEPENDENCIES
FILES_ALLOWED
FILES_READ_ONLY
ACCEPTANCE_CRITERIA
TEST_REQUIREMENTS
OUTPUT
```

Agents must not modify files outside their assigned scope without approval.

---

# 59. Task Lifecycle

Tasks should follow:

```text
BACKLOG
↓
PLANNED
↓
ASSIGNED
↓
IN_PROGRESS
↓
WAITING
↓
IMPLEMENTED
↓
TESTING
↓
REVIEW
↓
INTEGRATION
↓
DONE
```

Exceptional states:

```text
BLOCKED
FAILED
CANCELLED
```

---

# 60. Parallel Agent Development

Parallel development is allowed only when tasks do not create unsafe file conflicts.

Example:

```text
Frontend Agent
      +
Backend Agent
      +
AI Agent
      +
Database Agent
      ↓
Integration
      ↓
QA
      ↓
Security Review
      ↓
Final Review
```

Two agents must not simultaneously modify the same file unless explicitly coordinated.

Git worktrees/branches should be used for isolated parallel development where supported.

---

# 61. Agent Workflow

Every agent should follow:

```text
1. Read instructions
2. Read project state
3. Retrieve relevant context
4. Inspect affected files
5. Understand dependencies
6. Plan
7. Implement
8. Test
9. Validate
10. Report changes
11. Update project intelligence
```

Agents must not blindly scan the whole repository unless explicitly required.

---

# 62. Existing Project Intelligence Commands

The development system should use the existing `ai-project` workflow.

Important operations include:

```bash
ai-project sync
ai-project context "<task>"
ai-project plan
ai-project impact "<feature>"
ai-project feature
ai-project search
ai-project dependencies
ai-project changes
ai-project record-change
ai-project docs
ai-project architecture
ai-project validate
ai-project dashboard
ai-project graph
ai-project status
```

Agents must use the appropriate command before and after significant work.

---

# 63. Change Tracking

Every meaningful implementation change must be recorded.

Record:

- task ID
- feature
- files changed
- reason
- implementation summary
- tests
- affected dependencies
- architecture impact
- documentation impact

---

# 64. Definition of Done

A feature is NOT complete merely because code was written.

A feature is DONE only when:

- requirements implemented
- frontend implemented where required
- backend implemented where required
- database changes implemented where required
- AI integration implemented where required
- authentication verified
- RBAC verified
- API validation verified
- tests added
- tests passing
- typecheck passing
- lint passing
- build passing
- security checked
- documentation updated
- architecture impact reviewed
- project graph synchronized
- change recorded
- no known regression

---

# 65. Development Phases

## Phase 0 — Foundation

Implement:

- project structure
- shared configuration
- frontend foundation
- backend foundation
- AI service foundation
- MongoDB
- storage
- logging
- validation
- project intelligence

## Phase 1 — Authentication

Implement:

- signup
- login
- logout
- password hashing
- JWT
- RBAC
- protected routes
- user profiles
- role management

## Phase 2 — Citizen Portal

Implement:

- citizen dashboard
- complaint creation
- evidence
- location
- complaint tracking
- history
- notifications
- feedback

## Phase 3 — Volunteer Portal

Implement:

- volunteer dashboard
- citizen registration
- complaint registration
- evidence
- verification
- location
- tracking
- volunteer assistant

## Phase 4 — Complaint Engine

Implement:

- complaint model
- lifecycle
- validation
- workflow
- history
- assignment
- notifications
- audit

## Phase 5 — Department Portal

Implement:

- department dashboard
- work queue
- complaint review
- assignment
- actions
- resolution
- reopen
- escalation

## Phase 6 — SLA

Implement:

- SLA rules
- timers
- warnings
- escalation
- SLA analytics

## Phase 7 — AI

Implement:

- OCR
- NLP
- classification
- location extraction
- priority
- similarity
- department recommendation
- summaries
- keywords

## Phase 8 — GenAI

Implement:

- citizen assistant
- volunteer assistant
- official assistant
- complaint structuring
- summarization
- response drafting
- multilingual assistance

## Phase 9 — RAG

Implement:

- knowledge ingestion
- chunking
- embeddings
- retrieval
- source references
- knowledge assistant
- document versioning

## Phase 10 — Admin

Implement:

- user management
- department management
- volunteer management
- official management
- categories
- workflow configuration
- SLA configuration
- knowledge management
- audit management

## Phase 11 — Analytics

Implement:

- dashboards
- charts
- geographic analytics
- SLA analytics
- volunteer analytics
- AI analytics
- exports
- reporting

## Phase 12 — Production Hardening

Implement:

- security hardening
- performance
- monitoring
- backup strategy
- error handling
- rate limiting
- deployment
- CI/CD
- testing
- documentation
- final audit

---

# 66. Required End-to-End Workflow

```text
CITIZEN
   │
   ├── Direct Portal
   │
   └── Village Volunteer
          │
          ▼
     Complaint Creation
          │
          ▼
       Validation
          │
          ▼
     Evidence Processing
          │
          ▼
         OCR
          │
          ▼
         NLP
          │
          ├── Classification
          ├── Location
          ├── Priority
          ├── Similarity
          ├── Summary
          └── Department Recommendation
                    │
                    ▼
             Human Review
                    │
                    ▼
          Department Assignment
                    │
                    ▼
             Official Review
                    │
                    ▼
              Official Action
                    │
                    ▼
              SLA Monitoring
                    │
                    ▼
                Resolution
                    │
                    ▼
             Citizen Notification
                    │
                    ▼
                Feedback
                    │
                    ▼
               Audit/Analytics
```

---

# 67. AI Decision Boundary

## AI MAY

```text
Understand
Extract
Classify
Summarize
Recommend
Compare
Detect similarity
Predict priority
Suggest department
Translate
Assist
Retrieve knowledge
Draft
```

## AI MUST NOT independently

```text
Decide government outcome
Resolve complaint
Reject complaint without workflow
Change permissions
Change audit records
Access unauthorized data
Fabricate information
Override officials
```

---

# 68. Data Ownership

Each entity must have explicit ownership and access rules.

Examples:

```text
Citizen
    → own profile
    → own complaints

Volunteer
    → assigned/authorized citizens
    → assigned/authorized complaints

Department Official
    → authorized department complaints

Admin
    → administrative scope

AI
    → only data explicitly supplied/authorized
```

---

# 69. Performance Requirements

The system should be designed for:

- responsive API requests
- asynchronous AI processing
- scalable complaint volume
- efficient database queries
- indexed search
- pagination
- background processing
- realtime updates

Do not load entire datasets unnecessarily.

---

# 70. Scalability

Architecture should allow future support for:

- multiple districts
- multiple states
- multiple departments
- large citizen populations
- many volunteers
- large complaint datasets
- multiple AI models
- multiple GenAI providers

Avoid hardcoding one district, department, or state into business logic.

---

# 71. Configuration

Configurable items should include:

- departments
- categories
- subcategories
- SLA rules
- priorities
- supported languages
- AI thresholds
- notification channels
- workflow rules

Avoid hardcoding configurable business rules.

---

# 72. Environment Management

Separate:

```text
development
testing
staging
production
```

Secrets must be provided through secure environment/configuration mechanisms.

Never commit real:

- API keys
- JWT secrets
- database passwords
- admin passwords
- service credentials

---

# 73. Code Quality

All code must:

- use TypeScript where applicable
- follow project conventions
- use reusable components
- avoid unnecessary duplication
- use meaningful names
- contain appropriate validation
- contain error handling
- contain tests
- avoid dead code
- avoid unnecessary dependencies

---

# 74. Architectural Integrity

Agents must not introduce technologies that contradict the established architecture without an explicit architecture decision.

Before replacing:

- database
- frontend framework
- backend framework
- AI service architecture
- authentication architecture
- workflow architecture

an ADR/architecture review is required.

---

# 75. No Feature Left as Mock

Production-facing functionality must not be represented by fake behavior.

Avoid:

```text
fake API responses
fake login
fake complaint data
fake AI decisions
fake database persistence
fake notifications
fake status updates
```

Mocks may be used only in tests.

If a feature cannot yet be implemented, it must be explicitly marked as:

```text
NOT_IMPLEMENTED
```

rather than pretending to work.

---

# 76. Integration Requirement

All modules must eventually integrate into one working system.

Required integration:

```text
Frontend
   ↕
Backend
   ↕
MongoDB
   ↕
AI Service
   ↕
Storage
   ↕
Notifications
```

GenAI and RAG must integrate through controlled backend/service interfaces.

---

# 77. Final Product Requirement

The final VCGIS system must provide a complete working lifecycle:

```text
Citizen Access
        ↓
Complaint Registration
        ↓
Volunteer Assistance if needed
        ↓
Verification
        ↓
AI Intelligence
        ↓
Department Recommendation
        ↓
Human Review
        ↓
Official Assignment
        ↓
SLA Tracking
        ↓
Official Action
        ↓
Resolution
        ↓
Citizen Notification
        ↓
Feedback
        ↓
Analytics
        ↓
Audit
```

The final product must be:

- functional
- secure
- auditable
- role-based
- AI-assisted
- human-controlled
- multilingual-ready
- scalable
- testable
- maintainable
- production-oriented

---

# 78. Agent Final Instruction

When working on VCGIS:

1. Treat this document as the master functional requirement.
2. Treat the existing `.ai/` project intelligence as the shared project context.
3. Do not recreate an independent project-memory system.
4. Do not blindly scan the entire repository.
5. Retrieve only relevant context.
6. Respect architecture.
7. Respect RBAC.
8. Respect department isolation.
9. Never commit secrets.
10. Never allow AI to become the final authority.
11. Do not modify unrelated functionality.
12. Add tests with implementation.
13. Update documentation when architecture changes.
14. Synchronize project intelligence after meaningful changes.
15. Record meaningful changes.
16. Run validation before declaring completion.
17. Coordinate with other agents through explicit tasks and ownership.
18. Never claim a feature is complete if it is only mocked or partially implemented.

---

# 79. Master Success Criteria

VCGIS is considered successfully implemented only when all major requirements in this document are either:

```text
IMPLEMENTED + TESTED + INTEGRATED
```

or explicitly tracked as:

```text
PLANNED
IN_PROGRESS
BLOCKED
NOT_IMPLEMENTED
```

No hidden TODOs, fake implementations, undocumented architectural changes, or untracked critical functionality are acceptable.

The goal is not to generate a large amount of code.

The goal is to build a coherent, secure, tested, maintainable, end-to-end Volunteer-CGIS platform.
