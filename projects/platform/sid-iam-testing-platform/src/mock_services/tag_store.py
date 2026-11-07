import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class TagError(Exception):
    pass


class MockTagStore:
    def __init__(self):
        self._tags = {}
        self._entity_tags = {}
        self._governance_queue = []

    def reset(self):
        self._tags.clear()
        self._entity_tags.clear()
        self._governance_queue.clear()

    def create_tag(self, name, category, parent_id=None, description=""):
        logger.info(f"Creating tag: {name} ({category})")
        for t in self._tags.values():
            if t["name"] == name and t["category"] == category:
                raise TagError(f"Duplicate tag: {name} in category {category}")
        tag_id = str(uuid.uuid4())
        if parent_id and parent_id not in self._tags:
            raise TagError(f"Parent tag not found: {parent_id}")
        tag = {
            "id": tag_id,
            "name": name,
            "category": category,
            "parent_id": parent_id,
            "description": description,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._tags[tag_id] = tag
        return tag

    def get_tag(self, tag_id):
        tag = self._tags.get(tag_id)
        if not tag:
            raise TagError(f"Tag not found: {tag_id}")
        return tag

    def attach_tag(self, tag_id, entity_id):
        if tag_id not in self._tags:
            raise TagError(f"Tag not found: {tag_id}")
        self._entity_tags.setdefault(entity_id, set()).add(tag_id)
        return True

    def detach_tag(self, tag_id, entity_id):
        tags = self._entity_tags.get(entity_id, set())
        tags.discard(tag_id)
        return True

    def get_entity_tags(self, entity_id):
        tag_ids = self._entity_tags.get(entity_id, set())
        return [self._tags[tid] for tid in tag_ids if tid in self._tags]

    def query_by_tag(self, tag_id):
        entities = []
        for entity_id, tag_ids in self._entity_tags.items():
            if tag_id in tag_ids:
                entities.append(entity_id)
        return entities

    def get_children(self, parent_id):
        return [t for t in self._tags.values() if t["parent_id"] == parent_id]

    def get_hierarchy(self, tag_id):
        path = []
        current = self._tags.get(tag_id)
        while current:
            path.insert(0, current)
            parent_id = current.get("parent_id")
            current = self._tags.get(parent_id) if parent_id else None
        return path

    def submit_for_governance(self, tag_id, action, requester):
        if tag_id not in self._tags:
            raise TagError(f"Tag not found: {tag_id}")
        request_id = str(uuid.uuid4())
        request = {
            "request_id": request_id,
            "tag_id": tag_id,
            "action": action,
            "requester": requester,
            "status": "pending",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }
        self._governance_queue.append(request)
        return request

    def approve_governance(self, request_id, approver):
        for req in self._governance_queue:
            if req["request_id"] == request_id:
                req["status"] = "approved"
                req["approved_by"] = approver
                return req
        raise TagError(f"Governance request not found: {request_id}")

    def reject_governance(self, request_id, approver, reason=""):
        for req in self._governance_queue:
            if req["request_id"] == request_id:
                req["status"] = "rejected"
                req["rejected_by"] = approver
                req["reason"] = reason
                return req
        raise TagError(f"Governance request not found: {request_id}")

    def batch_create_tags(self, tags):
        created = []
        for tag_def in tags:
            tag = self.create_tag(**tag_def)
            created.append(tag)
        return created

    def batch_attach(self, tag_id, entity_ids):
        for eid in entity_ids:
            self.attach_tag(tag_id, eid)
        return len(entity_ids)

    def delete_tag(self, tag_id):
        if tag_id not in self._tags:
            raise TagError(f"Tag not found: {tag_id}")
        children = self.get_children(tag_id)
        affected_entities = self.query_by_tag(tag_id)
        for entity_id in affected_entities:
            self._entity_tags[entity_id].discard(tag_id)
        del self._tags[tag_id]
        return {"deleted": tag_id, "children_orphaned": len(children), "entities_affected": len(affected_entities)}

    def tag_count(self):
        return len(self._tags)
