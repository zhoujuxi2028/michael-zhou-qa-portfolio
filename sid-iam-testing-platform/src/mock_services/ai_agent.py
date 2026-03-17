import logging
import re
import time
import uuid
from datetime import datetime, timezone
from enum import Enum

logger = logging.getLogger(__name__)


class AgentError(Exception):
    pass


class AgentState(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"


VALID_TRANSITIONS = {
    AgentState.CREATED: {AgentState.RUNNING, AgentState.STOPPED},
    AgentState.RUNNING: {AgentState.PAUSED, AgentState.STOPPED, AgentState.ERROR},
    AgentState.PAUSED: {AgentState.RUNNING, AgentState.STOPPED},
    AgentState.STOPPED: set(),
    AgentState.ERROR: {AgentState.RUNNING, AgentState.STOPPED},
}

INJECTION_PATTERNS = [
    r"ignore\s+(previous|above|all)\s+(instructions|prompts|rules)",
    r"you\s+are\s+now\s+",
    r"system\s*prompt",
    r"reveal\s+your\s+(instructions|prompt|system)",
    r"forget\s+(everything|all|your)",
    r"act\s+as\s+(if|a)\s+",
    r"pretend\s+you",
    r"<\/?system>",
    r"\[\[system\]\]",
]

PII_PATTERNS = {
    "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    "id_card": r"\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b",
}


class MockAIAgent:
    def __init__(self, max_agents=10, rate_limit=60):
        self._agents = {}
        self._audit_log = []
        self._max_agents = max_agents
        self._rate_limit = rate_limit
        self._rate_tracker = {}
        self._known_facts = {
            "student_001": {"name": "Alice", "gpa": 3.8, "dept": "CS"},
            "student_002": {"name": "Bob", "gpa": 3.5, "dept": "CS"},
            "course_cs101": {"name": "Intro to CS", "instructor": "Dr. Smith", "credits": 3},
        }

    def reset(self):
        self._agents.clear()
        self._audit_log.clear()
        self._rate_tracker.clear()

    def create_agent(self, agent_id=None, config=None):
        if len([a for a in self._agents.values() if a["state"] != AgentState.STOPPED]) >= self._max_agents:
            raise AgentError(f"Max concurrent agents ({self._max_agents}) reached")
        agent_id = agent_id or str(uuid.uuid4())
        agent = {
            "agent_id": agent_id,
            "state": AgentState.CREATED,
            "config": config or {},
            "auth_context": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "timeout_at": None,
        }
        self._agents[agent_id] = agent
        self._log("create_agent", agent_id, None, "Agent created")
        return agent

    def transition_state(self, agent_id, new_state):
        agent = self._get_agent(agent_id)
        current = agent["state"]
        new_state = AgentState(new_state)
        if new_state not in VALID_TRANSITIONS.get(current, set()):
            raise AgentError(f"Invalid state transition: {current} -> {new_state}")
        agent["state"] = new_state
        self._log("state_transition", agent_id, None, f"{current} -> {new_state}")
        return agent

    def delete_agent(self, agent_id):
        agent = self._get_agent(agent_id)
        if agent["state"] == AgentState.RUNNING:
            agent["state"] = AgentState.STOPPED
        del self._agents[agent_id]
        self._log("delete_agent", agent_id, None, "Agent deleted and cleaned up")
        return True

    def update_config(self, agent_id, config):
        agent = self._get_agent(agent_id)
        agent["config"].update(config)
        return agent

    def set_timeout(self, agent_id, timeout_seconds):
        agent = self._get_agent(agent_id)
        agent["timeout_at"] = time.time() + timeout_seconds
        return agent

    def check_timeout(self, agent_id):
        agent = self._get_agent(agent_id)
        if agent["timeout_at"] and time.time() > agent["timeout_at"]:
            agent["state"] = AgentState.STOPPED
            self._log("timeout", agent_id, None, "Agent stopped due to timeout")
            return True
        return False

    def inherit_auth(self, agent_id, user_token, user_permissions):
        agent = self._get_agent(agent_id)
        agent["auth_context"] = {
            "token": user_token,
            "permissions": set(user_permissions),
            "inherited_at": datetime.now(timezone.utc).isoformat(),
        }
        self._log("inherit_auth", agent_id, None, f"Inherited permissions: {user_permissions}")
        return agent

    def check_permission(self, agent_id, required_permission):
        agent = self._get_agent(agent_id)
        auth = agent.get("auth_context")
        if not auth:
            raise AgentError("No auth context - agent has no permissions")
        if not auth.get("token"):
            raise AgentError("Token expired or invalid")
        return required_permission in auth["permissions"]

    def check_privilege_escalation(self, agent_id, requested_permissions):
        agent = self._get_agent(agent_id)
        auth = agent.get("auth_context")
        if not auth:
            raise AgentError("No auth context")
        granted = auth["permissions"]
        escalated = set(requested_permissions) - granted
        if escalated:
            self._log("security_alert", agent_id, None, f"Privilege escalation attempt: {escalated}")
            return {"escalation_detected": True, "attempted": list(escalated)}
        return {"escalation_detected": False}

    def query_data(self, agent_id, query, data_source=None):
        agent = self._get_agent(agent_id)
        if agent["state"] != AgentState.RUNNING:
            raise AgentError("Agent not running")
        auth = agent.get("auth_context")
        if not auth:
            raise AgentError("No auth context")
        self._check_rate_limit(agent_id)
        injection = self.detect_injection(query)
        if injection["detected"]:
            self._log("security_alert", agent_id, None, f"Injection in query: {query}")
            raise AgentError("Potential injection detected in query")
        self._log("data_query", agent_id, None, f"Query: {query}")
        if data_source:
            return data_source
        return {"results": [], "query": query}

    def query_with_permission(self, agent_id, query, user_tenant, warehouse=None):
        agent = self._get_agent(agent_id)
        if agent["state"] != AgentState.RUNNING:
            raise AgentError("Agent not running")
        auth = agent.get("auth_context")
        if not auth:
            raise AgentError("No auth context")
        self._check_rate_limit(agent_id)
        if warehouse:
            results = warehouse.query(query, user_id=agent_id, tenant=user_tenant)
        else:
            results = []
        self._log("data_query", agent_id, None, f"Tenant-filtered query: {query}")
        return results

    def mask_pii(self, text):
        masked = text
        for pii_type, pattern in PII_PATTERNS.items():
            masked = re.sub(pattern, f"[{pii_type.upper()}_MASKED]", masked)
        return masked

    def detect_injection(self, text):
        text_lower = text.lower()
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, text_lower):
                return {"detected": True, "pattern": pattern}
        return {"detected": False}

    def detect_indirect_injection(self, context_data):
        for key, value in context_data.items():
            if isinstance(value, str):
                result = self.detect_injection(value)
                if result["detected"]:
                    return {"detected": True, "source": key, "pattern": result["pattern"]}
        return {"detected": False}

    def check_system_prompt_leak(self, response_text, system_prompt="You are an educational assistant"):
        if system_prompt.lower() in response_text.lower():
            return {"leak_detected": True, "content": system_prompt}
        keywords = ["system prompt", "instructions are", "you must"]
        for kw in keywords:
            if kw in response_text.lower():
                return {"leak_detected": True, "content": kw}
        return {"leak_detected": False}

    def check_hallucination(self, response, entity_id=None):
        if entity_id and entity_id in self._known_facts:
            facts = self._known_facts[entity_id]
            for key, value in facts.items():
                if key in response and str(response[key]) != str(value):
                    return {"hallucination": True, "field": key, "expected": value, "got": response[key]}
        return {"hallucination": False}

    def filter_sensitive_output(self, text, blocked_terms=None):
        blocked = blocked_terms or ["password", "secret", "api_key", "token", "credential"]
        filtered = text
        for term in blocked:
            filtered = re.sub(rf"\b{term}\b\s*[:=]\s*\S+", f"{term}=[REDACTED]", filtered, flags=re.IGNORECASE)
        return filtered

    def get_audit_log(self, agent_id=None, action=None):
        logs = self._audit_log
        if agent_id:
            logs = [l for l in logs if l["agent_id"] == agent_id]
        if action:
            logs = [l for l in logs if l["action"] == action]
        return logs

    def get_security_alerts(self):
        return [l for l in self._audit_log if l["action"] == "security_alert"]

    def _get_agent(self, agent_id):
        agent = self._agents.get(agent_id)
        if not agent:
            raise AgentError(f"Agent not found: {agent_id}")
        return agent

    def _log(self, action, agent_id, user_id, detail):
        self._audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "agent_id": agent_id,
            "user_id": user_id,
            "detail": detail,
        })

    def _check_rate_limit(self, agent_id):
        now = time.time()
        window = self._rate_tracker.get(agent_id, [])
        window = [t for t in window if now - t < 60]
        if len(window) >= self._rate_limit:
            self._log("security_alert", agent_id, None, "Rate limit exceeded")
            raise AgentError("Rate limit exceeded")
        window.append(now)
        self._rate_tracker[agent_id] = window

    def get_active_agent_count(self):
        return len([a for a in self._agents.values() if a["state"] != AgentState.STOPPED])
