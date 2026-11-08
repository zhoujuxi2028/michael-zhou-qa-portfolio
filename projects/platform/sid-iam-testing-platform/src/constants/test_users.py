"""Shared test user constants used by mock services and test fixtures."""

STUDENT_001 = {
    "uid": "student001",
    "password": "pass123",
    "email": "student001@university.edu",
    "display_name": "Test Student",
    "roles": ["student"],
    "tenant": "default",
}

STUDENT_002 = {
    "uid": "student002",
    "password": "pass456",
    "email": "student002@university.edu",
    "display_name": "Second Student",
    "roles": ["student"],
    "tenant": "default",
}

TEACHER_001 = {
    "uid": "teacher001",
    "password": "teach123",
    "email": "teacher001@university.edu",
    "display_name": "Test Teacher",
    "roles": ["teacher", "advisor"],
    "tenant": "default",
}

ADMIN_001 = {
    "uid": "admin001",
    "password": "admin123",
    "email": "admin001@university.edu",
    "display_name": "Test Admin",
    "roles": ["admin"],
    "tenant": "default",
}

TENANT_A_USER = {
    "uid": "tenant_a_user",
    "password": "tenanta123",
    "email": "user@tenant-a.edu",
    "display_name": "Tenant A User",
    "roles": ["student"],
    "tenant": "tenant_a",
}

TENANT_B_USER = {
    "uid": "tenant_b_user",
    "password": "tenantb123",
    "email": "user@tenant-b.edu",
    "display_name": "Tenant B User",
    "roles": ["student"],
    "tenant": "tenant_b",
}

# All users indexed by uid (for SSO provider)
ALL_USERS = {
    user["uid"]: user for user in [STUDENT_001, STUDENT_002, TEACHER_001, ADMIN_001, TENANT_A_USER, TENANT_B_USER]
}
