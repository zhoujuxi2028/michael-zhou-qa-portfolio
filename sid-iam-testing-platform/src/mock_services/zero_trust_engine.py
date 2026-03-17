import logging
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DEFAULT_POLICIES = [
    {
        "id": "pol-001",
        "name": "compliant_device",
        "priority": 10,
        "action": "allow",
        "condition": lambda ctx: ctx.get("device", {}).get("compliant", False),
    },
    {
        "id": "pol-002",
        "name": "block_non_compliant",
        "priority": 20,
        "action": "deny",
        "condition": lambda ctx: not ctx.get("device", {}).get("compliant", True),
    },
    {
        "id": "pol-003",
        "name": "geo_anomaly",
        "priority": 5,
        "action": "deny",
        "condition": lambda ctx: ctx.get("geo_anomaly", False),
    },
    {
        "id": "pol-004",
        "name": "business_hours",
        "priority": 30,
        "action": "allow",
        "condition": lambda ctx: 8 <= ctx.get("hour", 12) <= 18,
    },
    {
        "id": "pol-005",
        "name": "block_after_hours",
        "priority": 31,
        "action": "deny",
        "condition": lambda ctx: ctx.get("hour", 12) < 8 or ctx.get("hour", 12) > 18,
    },
]


class ZeroTrustEngine:
    def __init__(self):
        self._policies = list(DEFAULT_POLICIES)
        self._sessions = {}
        self._network_segments = {
            "internal": ["10.0.0.0/8", "172.16.0.0/12"],
            "dmz": ["192.168.1.0/24"],
            "external": ["0.0.0.0/0"],
        }
        self._lock = threading.Lock()

    def reset(self):
        self._policies = list(DEFAULT_POLICIES)
        self._sessions.clear()

    def evaluate_device(self, device_info):
        logger.info(f"Evaluating device: {device_info.get('device_id', 'unknown')}")
        required_fields = ["os_version", "antivirus", "encryption", "device_id"]
        missing = [f for f in required_fields if f not in device_info]
        if missing:
            return {"compliant": False, "reason": f"Missing fields: {missing}", "score": 0}
        score = 0
        issues = []
        if device_info.get("antivirus"):
            score += 30
        else:
            issues.append("No antivirus")
        if device_info.get("encryption"):
            score += 30
        else:
            issues.append("No disk encryption")
        if device_info.get("os_patched", True):
            score += 20
        else:
            issues.append("OS not patched")
        if device_info.get("firewall", True):
            score += 20
        else:
            issues.append("Firewall disabled")
        compliant = score >= 60
        return {"compliant": compliant, "score": score, "issues": issues}

    def evaluate_access(self, context):
        logger.info(f"Evaluating access for user={context.get('user_id', 'unknown')}")
        sorted_policies = sorted(self._policies, key=lambda p: p["priority"])
        for policy in sorted_policies:
            try:
                if policy["condition"](context):
                    return {
                        "allowed": policy["action"] == "allow",
                        "policy": policy["name"],
                        "policy_id": policy["id"],
                    }
            except Exception:
                continue
        return {"allowed": False, "policy": "default_deny", "policy_id": "default"}

    def calculate_risk_score(self, context):
        score = 0
        if context.get("geo_anomaly"):
            score += 40
        if context.get("new_device"):
            score += 20
        if context.get("unusual_time"):
            score += 15
        if context.get("failed_attempts", 0) > 3:
            score += 25
        device = context.get("device", {})
        if not device.get("compliant", True):
            score += 30
        if context.get("vpn"):
            score -= 10
        return {"risk_score": max(0, min(100, score)), "factors": context}

    def check_network_segment(self, ip_address, required_segment):
        allowed = self._network_segments.get(required_segment, [])
        if not allowed:
            return {"allowed": False, "reason": f"Unknown segment: {required_segment}"}
        return {"allowed": True, "segment": required_segment, "ip": ip_address}

    def start_continuous_validation(self, session_id, context):
        self._sessions[session_id] = {
            "context": context,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "valid": True,
        }
        return True

    def re_evaluate_session(self, session_id, updated_context):
        session = self._sessions.get(session_id)
        if not session:
            return {"valid": False, "reason": "Session not found"}
        session["context"].update(updated_context)
        result = self.evaluate_access(session["context"])
        session["valid"] = result["allowed"]
        return {"valid": result["allowed"], "policy": result["policy"]}

    def add_policy(self, policy_id, name, priority, action, condition):
        with self._lock:
            self._policies.append(
                {
                    "id": policy_id,
                    "name": name,
                    "priority": priority,
                    "action": action,
                    "condition": condition,
                }
            )

    def remove_policy(self, policy_id):
        with self._lock:
            self._policies = [p for p in self._policies if p["id"] != policy_id]

    def reload_policies(self, new_policies=None):
        with self._lock:
            if new_policies:
                self._policies = new_policies
            else:
                self._policies = list(DEFAULT_POLICIES)
        return len(self._policies)

    def get_policy_count(self):
        return len(self._policies)
