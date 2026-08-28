from enum import StrEnum


class FarmRole(StrEnum):
    """Roles available to members of a farm."""

    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    WORKER = "worker"
    VIEWER = "viewer"