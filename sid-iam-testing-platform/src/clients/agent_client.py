import logging

logger = logging.getLogger(__name__)


class AgentClient:
    def __init__(self, ai_agent=None, auth_client=None, data_client=None):
        self.agent = ai_agent
        self.auth = auth_client
        self.data = data_client

    # --- Lifecycle ---
    def create_agent(self, agent_id=None, config=None):
        return self.agent.create_agent(agent_id, config)

    def start_agent(self, agent_id):
        return self.agent.transition_state(agent_id, "running")

    def stop_agent(self, agent_id):
        return self.agent.transition_state(agent_id, "stopped")

    def pause_agent(self, agent_id):
        return self.agent.transition_state(agent_id, "paused")

    def delete_agent(self, agent_id):
        return self.agent.delete_agent(agent_id)

    def update_config(self, agent_id, config):
        return self.agent.update_config(agent_id, config)

    # --- Auth ---
    def inherit_auth(self, agent_id, token, permissions):
        return self.agent.inherit_auth(agent_id, token, permissions)

    def check_permission(self, agent_id, permission):
        return self.agent.check_permission(agent_id, permission)

    def check_escalation(self, agent_id, permissions):
        return self.agent.check_privilege_escalation(agent_id, permissions)

    # --- Data ---
    def query_data(self, agent_id, query, data_source=None):
        return self.agent.query_data(agent_id, query, data_source)

    def query_with_permission(self, agent_id, query, tenant, warehouse=None):
        return self.agent.query_with_permission(agent_id, query, tenant, warehouse)

    def mask_pii(self, text):
        return self.agent.mask_pii(text)

    # --- Safety ---
    def detect_injection(self, text):
        return self.agent.detect_injection(text)

    def detect_indirect_injection(self, data):
        return self.agent.detect_indirect_injection(data)

    def check_hallucination(self, response, entity_id=None):
        return self.agent.check_hallucination(response, entity_id)

    def filter_sensitive(self, text):
        return self.agent.filter_sensitive_output(text)

    # --- Audit ---
    def get_audit_log(self, agent_id=None, action=None):
        return self.agent.get_audit_log(agent_id, action)

    def get_security_alerts(self):
        return self.agent.get_security_alerts()
