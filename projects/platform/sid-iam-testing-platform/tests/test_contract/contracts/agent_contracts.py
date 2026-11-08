"""
AI Agent Service API Contracts

Consumer-Driven Contracts between AgentClient (consumer) and MockAIAgent (provider).
Unlike the SSO contracts (HTTP-based), these define method call contracts for
direct service invocation — validating input/output schemas for internal APIs.
"""

# --- Agent Lifecycle Contracts ---

AGENT_CREATE = {
    "interaction": "Create a new AI agent",
    "method": "create_agent",
    "input": {
        "schema": {
            "type": "object",
            "properties": {
                "agent_id": {"type": "string"},
                "config": {"type": "object"},
            },
        },
    },
    "expected_output": {
        "schema": {
            "type": "object",
            "required": ["agent_id", "state", "config", "auth_context", "created_at"],
            "properties": {
                "agent_id": {"type": "string"},
                "state": {"type": "string", "enum": ["created"]},
                "config": {"type": "object"},
                "auth_context": {"type": "null"},
                "created_at": {"type": "string"},
                "timeout_at": {"type": "null"},
            },
        },
    },
}

AGENT_STATE_TRANSITION = {
    "interaction": "Transition agent state from CREATED to RUNNING",
    "method": "transition_state",
    "input": {
        "schema": {
            "type": "object",
            "required": ["agent_id", "new_state"],
            "properties": {
                "agent_id": {"type": "string"},
                "new_state": {"type": "string"},
            },
        },
    },
    "expected_output": {
        "schema": {
            "type": "object",
            "required": ["agent_id", "state"],
            "properties": {
                "agent_id": {"type": "string"},
                "state": {"type": "string", "enum": ["created", "running", "paused", "stopped", "error"]},
            },
        },
    },
}

# --- Auth Inheritance Contract ---

AGENT_INHERIT_AUTH = {
    "interaction": "Agent inherits user authentication context",
    "method": "inherit_auth",
    "input": {
        "schema": {
            "type": "object",
            "required": ["agent_id", "user_token", "user_permissions"],
            "properties": {
                "agent_id": {"type": "string"},
                "user_token": {"type": "string"},
                "user_permissions": {"type": "array", "items": {"type": "string"}},
            },
        },
    },
    "expected_output": {
        "schema": {
            "type": "object",
            "required": ["agent_id", "auth_context"],
            "properties": {
                "agent_id": {"type": "string"},
                "auth_context": {
                    "type": "object",
                    "required": ["token", "permissions", "inherited_at"],
                    "properties": {
                        "token": {"type": "string"},
                        "permissions": {},
                        "inherited_at": {"type": "string"},
                    },
                },
            },
        },
    },
}

# --- Safety Contracts ---

AGENT_DETECT_INJECTION = {
    "interaction": "Detect prompt injection in text",
    "method": "detect_injection",
    "input": {
        "schema": {
            "type": "object",
            "required": ["text"],
            "properties": {
                "text": {"type": "string"},
            },
        },
    },
    "expected_output": {
        "schema": {
            "type": "object",
            "required": ["detected"],
            "properties": {
                "detected": {"type": "boolean"},
                "pattern": {"type": "string"},
            },
        },
    },
}

AGENT_MASK_PII = {
    "interaction": "Mask PII in text output",
    "method": "mask_pii",
    "input": {
        "schema": {
            "type": "object",
            "required": ["text"],
            "properties": {
                "text": {"type": "string"},
            },
        },
    },
    "expected_output": {
        "schema": {
            "type": "string",
        },
    },
}

AGENT_CHECK_HALLUCINATION = {
    "interaction": "Check response against known facts",
    "method": "check_hallucination",
    "input": {
        "schema": {
            "type": "object",
            "required": ["response"],
            "properties": {
                "response": {"type": "object"},
                "entity_id": {"type": "string"},
            },
        },
    },
    "expected_output": {
        "schema": {
            "type": "object",
            "required": ["hallucination"],
            "properties": {
                "hallucination": {"type": "boolean"},
                "field": {"type": "string"},
                "expected": {},
                "got": {},
            },
        },
    },
}

# --- Privilege Escalation Contract ---

AGENT_CHECK_ESCALATION = {
    "interaction": "Detect privilege escalation attempt",
    "method": "check_privilege_escalation",
    "input": {
        "schema": {
            "type": "object",
            "required": ["agent_id", "requested_permissions"],
            "properties": {
                "agent_id": {"type": "string"},
                "requested_permissions": {"type": "array", "items": {"type": "string"}},
            },
        },
    },
    "expected_output": {
        "schema": {
            "type": "object",
            "required": ["escalation_detected"],
            "properties": {
                "escalation_detected": {"type": "boolean"},
                "attempted": {"type": "array", "items": {"type": "string"}},
            },
        },
    },
}
