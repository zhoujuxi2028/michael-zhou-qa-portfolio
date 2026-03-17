# SID IAM Testing Platform — Requirements

## 1. Product Domain Analysis

SID is a university IAM product (SSO core), expanding into data analytics (ontology, pipelines, warehouse, tags, analytics) with AI Agent capabilities.

| Domain | Components | Data Flow | Quality Risks |
|--------|-----------|-----------|---------------|
| **Auth** | SSO, LDAP, Kerberos, MFA, Zero Trust | User→IdP→SP (token flow) | Privilege escalation, session hijack, injection, replay |
| **Data** | Ontology, Pipeline, Warehouse, Tags, Analytics | Source→Pipeline→Warehouse→Tags→Analytics | Data loss, schema drift, permission leak |
| **AI Agent** | Engine, Auth Proxy, Data Retrieval, Safety | User→Agent→(Auth+Data)→Response | Prompt injection, privilege escalation, hallucination, PII leak |

## 2. Key Concepts

### Authentication

| Concept | Definition | Role in SID |
|---------|-----------|-------------|
| **IAM** | Identity and Access Management | Core positioning — manage "who can access what" |
| **SSO** | Single Sign-On | Base feature — one login for all campus systems |
| **SAML 2.0** | XML-based auth protocol | SSO protocol — IdP sends Assertions to SP |
| **OIDC** | OpenID Connect (OAuth 2.0 identity layer) | SSO protocol — returns JWT ID Token |
| **IdP** | Identity Provider | SID itself — verifies user identity |
| **SP** | Service Provider | Campus apps depending on SID auth |
| **LDAP** | Lightweight Directory Access Protocol | User/org directory (names, departments, roles) |
| **Kerberos** | Ticket-based network auth protocol | Enterprise auth via KDC issuing TGT + service tickets |
| **MFA** | Multi-Factor Authentication | TOTP/SMS as second factor |
| **Zero Trust** | "Never trust, always verify" | Every access verified by identity + device + context |
| **Session Fixation** | Attacker pre-sets Session ID | Must regenerate Session ID after auth |

### Data Platform

| Concept | Definition | Role in SID |
|---------|-----------|-------------|
| **Ontology** | Formal knowledge representation | Graph model: Student-enrolls-Course-belongs-Department |
| **Graph DB** | Node/edge storage (e.g., Neo4j) | Store ontology, support relationship traversal |
| **Pipeline** | Automated data processing flow | ETL: extract from academic system → transform → load to warehouse |
| **DAG** | Directed Acyclic Graph | Task dependency graph for pipeline execution order |
| **Data Warehouse** | Analytics-oriented data store | Centralized data for reports and BI |
| **Tag Platform** | Entity labeling system | Label students (e.g., "honors", "financial aid") for analysis |
| **Data Lineage** | End-to-end data tracking | Know where report numbers come from — audit and debug |
| **Row-Level Security** | Per-user row filtering | Department A sees only Department A's data |

### AI Agent

| Concept | Definition | Role in SID |
|---------|-----------|-------------|
| **AI Agent** | Autonomous task-executing AI with tool access | Users query data and generate reports via conversation |
| **Permission Inheritance** | Agent inherits caller's permissions | Student's agent can only query own grades |
| **Prompt Injection** | Crafted input tricks AI into unintended actions | Attacker tries to leak system prompts or escalate privileges |
| **Hallucination** | AI generates plausible but false information | Agent claims "GPA 4.0" with no database record |
| **PII Masking** | Hide personally identifiable information | Mask ID numbers, phone numbers in agent responses |
| **Guardrails** | Input/output safety checks | Detect injection, filter sensitive output, verify facts |

## 3. Functional Requirements

### FR-1: Authentication Security

| ID | Requirement | Priority | Verification |
|----|------------|----------|-------------|
| FR-1.1 | SSO login flow (SAML/OIDC) correctness | P0 | Mock IdP + assertion validation |
| FR-1.2 | LDAP auth and directory query | P0 | Mock LDAP service |
| FR-1.3 | Kerberos ticket lifecycle management | P1 | Mock KDC |
| FR-1.4 | Zero Trust policy engine evaluation | P1 | Policy rule engine test |
| FR-1.5 | Session management (timeout, concurrent, fixation) | P0 | State machine validation |
| FR-1.6 | MFA multi-factor auth | P1 | TOTP algorithm validation |
| FR-1.7 | Security defense (injection, replay, hijack) | P0 | Attack pattern simulation |

### FR-2: Data Platform

| ID | Requirement | Priority | Verification |
|----|------------|----------|-------------|
| FR-2.1 | Ontology model CRUD and graph traversal | P0 | networkx graph operations |
| FR-2.2 | Pipeline DAG orchestration and execution | P0 | Topological sort + state tracking |
| FR-2.3 | Warehouse schema management and query correctness | P1 | SQLite execution validation |
| FR-2.4 | Tag platform hierarchy management and governance | P1 | CRUD + approval flow simulation |
| FR-2.5 | Analytics API and aggregation computation | P1 | Result comparison validation |
| FR-2.6 | Data lineage tracking | P2 | Pipeline metadata recording |
| FR-2.7 | Row-level security (multi-tenant data isolation) | P0 | Permission context switching |

### FR-3: AI Agent

| ID | Requirement | Priority | Verification |
|----|------------|----------|-------------|
| FR-3.1 | Agent lifecycle management | P1 | State transition validation |
| FR-3.2 | Agent inherits user auth context | P0 | Permission chain verification |
| FR-3.3 | Agent data access permission control | P0 | Role switching test |
| FR-3.4 | Prompt injection defense | P0 | Attack vector library |
| FR-3.5 | Hallucination detection and guardrails | P1 | Fact-checking rules |
| FR-3.6 | PII masking | P0 | Pattern matching validation |
| FR-3.7 | Audit log completeness | P1 | Log assertions |
| FR-3.8 | Cross-domain E2E integration | P0 | Full-chain scenarios |

## 4. Non-Functional Requirements

| ID | Requirement | Standard | Verification |
|----|------------|----------|-------------|
| NFR-1 | Tests run independently | No real SID dependency | Full mock architecture |
| NFR-2 | Code quality | pylint ≥ 9.0, black formatted, coverage ≥ 90% | CI quality gates |
| NFR-3 | Documentation completeness | Architecture, test catalog, execution report | Doc review |
| NFR-4 | CI/CD integration | GitHub Actions auto-run | Workflow validation |
| NFR-5 | Maintainability | Modular fixtures, client-mock separation | Code review |
| NFR-6 | Portfolio presentation | Clear README, professional structure, technical depth | Peer review |

## 5. Test Strategy

```
Test Pyramid:
    ┌─────────┐
    │ E2E (8) │ ← Cross-domain (Agent→Auth→Data→Response)
    ├─────────┤
    │Integr.  │ ← Component interaction (Auth+Data, Agent+Auth)
    │  (30)   │
    ├─────────┤
    │  Unit   │ ← Single component (each mock service independently)
    │  (100)  │
    └─────────┘
```

| Type | Count | Frequency | Mock Level |
|------|-------|-----------|-----------|
| Unit | ~100 | Every commit | Single service |
| Integration | ~30 | Every commit | Multi-service |
| E2E | ~8 | PR / manual | Full chain |

## 6. Test Coverage Matrix

| Domain | Module | Tests | TC ID Range | Key Scenarios |
|--------|--------|-------|-------------|---------------|
| Auth | test_sso | 12 | TC-AUTH-SSO-001~012 | SAML/OIDC flows, logout, multi-tenant |
| Auth | test_ldap | 10 | TC-AUTH-LDAP-001~010 | Bind, search, injection prevention, TLS |
| Auth | test_kerberos | 8 | TC-AUTH-KRB-001~008 | TGT, service ticket, replay detection |
| Auth | test_zero_trust | 10 | TC-AUTH-ZT-001~010 | Device posture, context-aware, micro-seg |
| Auth | test_session | 8 | TC-AUTH-SES-001~008 | Timeout, fixation, concurrent limits |
| Auth | test_mfa | 6 | TC-AUTH-MFA-001~006 | TOTP, enrollment, bypass detection |
| Data | test_ontology | 10 | TC-DATA-ONT-001~010 | Entity CRUD, graph traversal, migration |
| Data | test_pipeline | 10 | TC-DATA-PIP-001~010 | DAG exec, lineage, retry, idempotency |
| Data | test_warehouse | 8 | TC-DATA-WH-001~008 | Schema, query, row-level security |
| Data | test_tag_platform | 8 | TC-DATA-TAG-001~008 | Tag CRUD, hierarchy, governance |
| Data | test_analytics | 8 | TC-DATA-ANA-001~008 | Dashboard API, aggregation, export |
| AI | test_agent_lifecycle | 8 | TC-AI-LCY-001~008 | CRUD, state transitions, resource limits |
| AI | test_agent_auth | 8 | TC-AI-AUTH-001~008 | Context inheritance, privilege escalation |
| AI | test_agent_data | 8 | TC-AI-DAT-001~008 | Permission-scoped queries, PII masking |
| AI | test_agent_safety | 8 | TC-AI-SAF-001~008 | Prompt injection, hallucination, audit |
| AI | test_integration | 8 | TC-AI-INT-001~008 | E2E cross-domain, failure cascade |
| | **Total** | **138** | | |

## 7. Mock Service Architecture

| Mock | Implementation | Purpose |
|------|---------------|---------|
| sso_provider | FastAPI (session fixture) | SAML/OIDC endpoints |
| ldap_server | Python dict + LDAP-like API | Bind, search, modify |
| kerberos_kdc | Token store + timestamp | Ticket lifecycle |
| graph_db | networkx.DiGraph | Ontology traversal |
| data_warehouse | SQLite `:memory:` | Real SQL execution |
| pipeline_engine | Dict + topological sort | DAG orchestration |
| ai_agent | Rule-based pattern matching | Safety guardrails |

## 8. Constraints & Assumptions

**Constraints:**
- No real SID instance → full mock architecture
- Portfolio project → code quality and docs > feature completeness
- Follow existing portfolio structure conventions

**Assumptions:**
- SID SSO based on standard SAML 2.0 / OIDC
- Data platform API follows RESTful design
- AI Agent interacts with auth/data services via API
- Graph database used for ontology management (entity-relationship modeling)

## 9. Implementation Phases

| Sub-phase | Content | New Tests | Cumulative |
|-----------|---------|-----------|------------|
| 3.1 | Scaffold + Auth core (SSO, LDAP) | 22 | 22 |
| 3.2 | Auth complete (Kerberos, ZT, Session, MFA) | 32 | 54 |
| 3.3 | Data platform (all 5 modules) | 44 | 98 |
| 3.4 | AI agent (all 5 modules) | 40 | 138 |
