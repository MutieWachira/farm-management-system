
"""
Farm membership API tests.

These tests verify both:

1. Positive behaviour:
   - owners can manage memberships
   - farm members can view memberships

2. Negative/security behaviour:
   - non-owners cannot modify memberships
   - duplicate memberships are rejected
   - owners cannot remove themselves
   - unknown users cannot be added
   - unauthenticated users cannot access membership endpoints

The tests intentionally exercise the HTTP API rather than calling
repositories/services directly. This ensures authentication,
authorization, validation, and persistence are tested together.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "/api/v1"

REGISTER_URL = f"{BASE_URL}/auth/register"
LOGIN_URL = f"{BASE_URL}/auth/login"

FARMS_URL = f"{BASE_URL}/farms"


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def register_user(
    client: TestClient,
    email: str,
    password: str = "StrongPassword123!",
) -> dict[str, Any]:
    """
    Register a new test user.

    The exact registration response may contain additional fields.
    We only depend on the response being successful.
    """

    response = client.post(
        REGISTER_URL,
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code in (200, 201), response.text

    return response.json()


def login_user(
    client: TestClient,
    email: str,
    password: str = "StrongPassword123!",
) -> dict[str, str]:
    """
    Authenticate a user and return access/refresh tokens.

    This helper intentionally supports the existing AgriCore
    access-token based authentication flow.
    """

    response = client.post(
        LOGIN_URL,
        data={
            "username": email,
            "password": password,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert "access_token" in data
    assert "refresh_token" in data

    return data


def auth_headers(access_token: str) -> dict[str, str]:
    """Build the Authorization header used by protected endpoints."""

    return {
        "Authorization": f"Bearer {access_token}",
    }


def create_farm(
    client: TestClient,
    access_token: str,
    name: str = "Test Farm",
) -> dict[str, Any]:
    """
    Create a farm using the supplied authenticated user.

    The owner should automatically receive an OWNER membership.
    """

    response = client.post(
        FARMS_URL,
        headers=auth_headers(access_token),
        json={
            "name": name,
            "location": "Nairobi",
            "area_hectares": 10,
        },
    )

    assert response.status_code in (200, 201), response.text

    return response.json()


def get_farm_id(farm: dict[str, Any]) -> int:
    """Extract the farm ID while supporting the project's response shape."""

    farm_id = farm.get("id")

    assert farm_id is not None, f"Farm response does not contain id: {farm}"

    return int(farm_id)


def get_user_id(user: dict[str, Any]) -> int:
    """Extract a user ID from a registration response."""

    user_id = user.get("id")

    assert user_id is not None, f"User response does not contain id: {user}"

    return int(user_id)


def add_member(
    client: TestClient,
    access_token: str,
    farm_id: int,
    user_id: int,
    role: str = "MEMBER",
):
    """Add a user to a farm."""

    return client.post(
        f"{FARMS_URL}/{farm_id}/members",
        headers=auth_headers(access_token),
        json={
            "user_id": user_id,
            "role": role,
        },
    )


def update_member_role(
    client: TestClient,
    access_token: str,
    farm_id: int,
    user_id: int,
    role: str,
):
    """Change a farm member's role."""

    return client.patch(
        f"{FARMS_URL}/{farm_id}/members/{user_id}",
        headers=auth_headers(access_token),
        json={
            "role": role,
        },
    )


def remove_member(
    client: TestClient,
    access_token: str,
    farm_id: int,
    user_id: int,
):
    """Remove a user from a farm."""

    return client.delete(
        f"{FARMS_URL}/{farm_id}/members/{user_id}",
        headers=auth_headers(access_token),
    )


def list_members(
    client: TestClient,
    access_token: str,
    farm_id: int,
):
    """List members belonging to a farm."""

    return client.get(
        f"{FARMS_URL}/{farm_id}/members",
        headers=auth_headers(access_token),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client() -> TestClient:
    """
    FastAPI test client.

    This assumes the existing AgriCore test environment already
    configures its test database/application state appropriately.
    """

    return TestClient(app)


@pytest.fixture
def owner_setup(client: TestClient):
    """
    Create:

        owner
          ↓
        farm
          ↓
        OWNER membership

    Returns all information needed by the membership tests.
    """

    owner_email = "owner-membership@example.com"

    # Register owner.
    owner = register_user(
        client,
        owner_email,
    )

    owner_id = get_user_id(owner)

    # Login owner.
    owner_tokens = login_user(
        client,
        owner_email,
    )

    owner_access_token = owner_tokens["access_token"]

    # Create farm.
    farm = create_farm(
        client,
        owner_access_token,
        name="Membership Test Farm",
    )

    farm_id = get_farm_id(farm)

    return {
        "owner": owner,
        "owner_id": owner_id,
        "owner_access_token": owner_access_token,
        "farm": farm,
        "farm_id": farm_id,
    }


def create_user(
    client: TestClient,
    prefix: str,
):
    """
    Create and authenticate a fresh test user.

    A unique email is used so the tests can safely be executed
    repeatedly against a clean test database.
    """

    email = f"{prefix}@example.com"

    user = register_user(
        client,
        email,
    )

    tokens = login_user(
        client,
        email,
    )

    return {
        "user": user,
        "user_id": get_user_id(user),
        "email": email,
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
    }


# ---------------------------------------------------------------------------
# OWNER CREATION
# ---------------------------------------------------------------------------

def test_owner_automatically_becomes_owner(
    client: TestClient,
    owner_setup,
):
    """
    When a user creates a farm, the user must automatically
    become an OWNER member.
    """

    farm_id = owner_setup["farm_id"]
    owner_access_token = owner_setup["owner_access_token"]
    owner_id = owner_setup["owner_id"]

    response = list_members(
        client,
        owner_access_token,
        farm_id,
    )

    assert response.status_code == 200, response.text

    members = response.json()

    assert isinstance(members, list)

    owner_memberships = [
        member
        for member in members
        if member.get("user_id") == owner_id
    ]

    assert len(owner_memberships) == 1

    assert owner_memberships[0]["role"] == "OWNER"


# ---------------------------------------------------------------------------
# VIEW MEMBERS
# ---------------------------------------------------------------------------

def test_owner_can_view_members(
    client: TestClient,
    owner_setup,
):
    """The farm owner can view farm members."""

    response = list_members(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
    )

    assert response.status_code == 200, response.text


def test_manager_can_view_members(
    client: TestClient,
    owner_setup,
):
    """A MANAGER can view farm members."""

    manager = create_user(
        client,
        "manager-view",
    )

    response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        manager["user_id"],
        "MANAGER",
    )

    assert response.status_code in (200, 201), response.text

    response = list_members(
        client,
        manager["access_token"],
        owner_setup["farm_id"],
    )

    assert response.status_code == 200, response.text


def test_worker_can_view_members(
    client: TestClient,
    owner_setup,
):
    """A WORKER can view farm members."""

    worker = create_user(
        client,
        "worker-view",
    )

    response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert response.status_code in (200, 201), response.text

    response = list_members(
        client,
        worker["access_token"],
        owner_setup["farm_id"],
    )

    assert response.status_code == 200, response.text


def test_viewer_can_view_members(
    client: TestClient,
    owner_setup,
):
    """A VIEWER can view farm members."""

    viewer = create_user(
        client,
        "viewer-view",
    )

    response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        viewer["user_id"],
        "VIEWER",
    )

    assert response.status_code in (200, 201), response.text

    response = list_members(
        client,
        viewer["access_token"],
        owner_setup["farm_id"],
    )

    assert response.status_code == 200, response.text


# ---------------------------------------------------------------------------
# OWNER MANAGEMENT
# ---------------------------------------------------------------------------

def test_owner_can_add_member(
    client: TestClient,
    owner_setup,
):
    """OWNER can add a new member."""

    worker = create_user(
        client,
        "owner-add-member",
    )

    response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert response.status_code in (200, 201), response.text

    members_response = list_members(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
    )

    assert members_response.status_code == 200

    members = members_response.json()

    matching = [
        member
        for member in members
        if member.get("user_id") == worker["user_id"]
    ]

    assert len(matching) == 1
    assert matching[0]["role"] == "WORKER"


def test_owner_can_change_member_role(
    client: TestClient,
    owner_setup,
):
    """OWNER can change a member's role."""

    worker = create_user(
        client,
        "owner-change-role",
    )

    add_response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert add_response.status_code in (200, 201), add_response.text

    response = update_member_role(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
        "MANAGER",
    )

    assert response.status_code == 200, response.text

    members_response = list_members(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
    )

    assert members_response.status_code == 200

    members = members_response.json()

    member = next(
        member
        for member in members
        if member.get("user_id") == worker["user_id"]
    )

    assert member["role"] == "MANAGER"


def test_owner_can_remove_member(
    client: TestClient,
    owner_setup,
):
    """OWNER can remove a non-owner member."""

    worker = create_user(
        client,
        "owner-remove-member",
    )

    add_response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert add_response.status_code in (200, 201), add_response.text

    response = remove_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
    )

    assert response.status_code in (200, 204), response.text

    members_response = list_members(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
    )

    assert members_response.status_code == 200

    members = members_response.json()

    assert not any(
        member.get("user_id") == worker["user_id"]
        for member in members
    )


# ---------------------------------------------------------------------------
# MANAGER SECURITY TESTS
# ---------------------------------------------------------------------------

@pytest.fixture
def manager_setup(client: TestClient, owner_setup):
    """Create a MANAGER membership for the test farm."""

    manager = create_user(
        client,
        "manager-security",
    )

    response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        manager["user_id"],
        "MANAGER",
    )

    assert response.status_code in (200, 201), response.text

    return {
        **owner_setup,
        "manager": manager,
    }


def test_manager_cannot_add_member(
    client: TestClient,
    manager_setup,
):
    """MANAGER must receive 403 when attempting to add a member."""

    worker = create_user(
        client,
        "manager-cannot-add",
    )

    response = add_member(
        client,
        manager_setup["manager"]["access_token"],
        manager_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert response.status_code == 403


def test_manager_cannot_change_roles(
    client: TestClient,
    manager_setup,
):
    """MANAGER must receive 403 when changing a member's role."""

    worker = create_user(
        client,
        "manager-cannot-change",
    )

    add_response = add_member(
        client,
        manager_setup["owner_access_token"],
        manager_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert add_response.status_code in (200, 201)

    response = update_member_role(
        client,
        manager_setup["manager"]["access_token"],
        manager_setup["farm_id"],
        worker["user_id"],
        "MANAGER",
    )

    assert response.status_code == 403


def test_manager_cannot_remove_member(
    client: TestClient,
    manager_setup,
):
    """MANAGER must receive 403 when removing a member."""

    worker = create_user(
        client,
        "manager-cannot-remove",
    )

    add_response = add_member(
        client,
        manager_setup["owner_access_token"],
        manager_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert add_response.status_code in (200, 201)

    response = remove_member(
        client,
        manager_setup["manager"]["access_token"],
        manager_setup["farm_id"],
        worker["user_id"],
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# WORKER SECURITY TESTS
# ---------------------------------------------------------------------------

@pytest.fixture
def worker_setup(client: TestClient, owner_setup):
    """Create a WORKER membership for the test farm."""

    worker = create_user(
        client,
        "worker-security",
    )

    response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert response.status_code in (200, 201), response.text

    return {
        **owner_setup,
        "worker": worker,
    }


def test_worker_cannot_add_member(
    client: TestClient,
    worker_setup,
):
    """WORKER must receive 403 when adding a member."""

    new_user = create_user(
        client,
        "worker-cannot-add",
    )

    response = add_member(
        client,
        worker_setup["worker"]["access_token"],
        worker_setup["farm_id"],
        new_user["user_id"],
        "VIEWER",
    )

    assert response.status_code == 403


def test_worker_cannot_change_roles(
    client: TestClient,
    worker_setup,
):
    """WORKER must receive 403 when changing a member's role."""

    new_user = create_user(
        client,
        "worker-cannot-change",
    )

    add_response = add_member(
        client,
        worker_setup["owner_access_token"],
        worker_setup["farm_id"],
        new_user["user_id"],
        "VIEWER",
    )

    assert add_response.status_code in (200, 201)

    response = update_member_role(
        client,
        worker_setup["worker"]["access_token"],
        worker_setup["farm_id"],
        new_user["user_id"],
        "MANAGER",
    )

    assert response.status_code == 403


def test_worker_cannot_remove_member(
    client: TestClient,
    worker_setup,
):
    """WORKER must receive 403 when removing a member."""

    new_user = create_user(
        client,
        "worker-cannot-remove",
    )

    add_response = add_member(
        client,
        worker_setup["owner_access_token"],
        worker_setup["farm_id"],
        new_user["user_id"],
        "VIEWER",
    )

    assert add_response.status_code in (200, 201)

    response = remove_member(
        client,
        worker_setup["worker"]["access_token"],
        worker_setup["farm_id"],
        new_user["user_id"],
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# VIEWER SECURITY TESTS
# ---------------------------------------------------------------------------

@pytest.fixture
def viewer_setup(client: TestClient, owner_setup):
    """Create a VIEWER membership for the test farm."""

    viewer = create_user(
        client,
        "viewer-security",
    )

    response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        viewer["user_id"],
        "VIEWER",
    )

    assert response.status_code in (200, 201), response.text

    return {
        **owner_setup,
        "viewer": viewer,
    }


def test_viewer_cannot_add_member(
    client: TestClient,
    viewer_setup,
):
    """VIEWER must receive 403 when adding a member."""

    new_user = create_user(
        client,
        "viewer-cannot-add",
    )

    response = add_member(
        client,
        viewer_setup["viewer"]["access_token"],
        viewer_setup["farm_id"],
        new_user["user_id"],
        "WORKER",
    )

    assert response.status_code == 403


def test_viewer_cannot_change_roles(
    client: TestClient,
    viewer_setup,
):
    """VIEWER must receive 403 when changing a member's role."""

    new_user = create_user(
        client,
        "viewer-cannot-change",
    )

    add_response = add_member(
        client,
        viewer_setup["owner_access_token"],
        viewer_setup["farm_id"],
        new_user["user_id"],
        "WORKER",
    )

    assert add_response.status_code in (200, 201)

    response = update_member_role(
        client,
        viewer_setup["viewer"]["access_token"],
        viewer_setup["farm_id"],
        new_user["user_id"],
        "MANAGER",
    )

    assert response.status_code == 403


def test_viewer_cannot_remove_member(
    client: TestClient,
    viewer_setup,
):
    """VIEWER must receive 403 when removing a member."""

    new_user = create_user(
        client,
        "viewer-cannot-remove",
    )

    add_response = add_member(
        client,
        viewer_setup["owner_access_token"],
        viewer_setup["farm_id"],
        new_user["user_id"],
        "WORKER",
    )

    assert add_response.status_code in (200, 201)

    response = remove_member(
        client,
        viewer_setup["viewer"]["access_token"],
        viewer_setup["farm_id"],
        new_user["user_id"],
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# DUPLICATE MEMBERSHIP
# ---------------------------------------------------------------------------

def test_duplicate_membership_rejected(
    client: TestClient,
    owner_setup,
):
    """
    The same user cannot be added to the same farm twice.
    """

    worker = create_user(
        client,
        "duplicate-membership",
    )

    first_response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert first_response.status_code in (200, 201), first_response.text

    second_response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        worker["user_id"],
        "WORKER",
    )

    assert second_response.status_code in (400, 409)


# ---------------------------------------------------------------------------
# OWNER PROTECTION
# ---------------------------------------------------------------------------

def test_owner_cannot_be_removed(
    client: TestClient,
    owner_setup,
):
    """
    The OWNER cannot remove themselves from their own farm.

    This protects the farm from being left without an owner.
    """

    response = remove_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        owner_setup["owner_id"],
    )

    assert response.status_code in (400, 403, 409)


# ---------------------------------------------------------------------------
# UNKNOWN USER
# ---------------------------------------------------------------------------

def test_unknown_user_cannot_be_added(
    client: TestClient,
    owner_setup,
):
    """
    A membership cannot reference a user that does not exist.
    """

    unknown_user_id = 999999999

    response = add_member(
        client,
        owner_setup["owner_access_token"],
        owner_setup["farm_id"],
        unknown_user_id,
        "WORKER",
    )

    assert response.status_code in (400, 404, 422)


# ---------------------------------------------------------------------------
# UNAUTHENTICATED ACCESS
# ---------------------------------------------------------------------------

def test_unauthenticated_user_cannot_access_members(
    client: TestClient,
    owner_setup,
):
    """
    Requests without an access token must be rejected.
    """

    response = client.get(
        f"{FARMS_URL}/{owner_setup['farm_id']}/members",
    )

    assert response.status_code in (401, 403)


def test_unauthenticated_user_cannot_add_member(
    client: TestClient,
    owner_setup,
):
    """Unauthenticated users cannot add members."""

    response = client.post(
        f"{FARMS_URL}/{owner_setup['farm_id']}/members",
        json={
            "user_id": 999999999,
            "role": "WORKER",
        },
    )

    assert response.status_code in (401, 403)


def test_unauthenticated_user_cannot_change_role(
    client: TestClient,
    owner_setup,
):
    """Unauthenticated users cannot change member roles."""

    response = client.patch(
        f"{FARMS_URL}/{owner_setup['farm_id']}/members/999999999",
        json={
            "role": "MANAGER",
        },
    )

    assert response.status_code in (401, 403)


def test_unauthenticated_user_cannot_remove_member(
    client: TestClient,
    owner_setup,
):
    """Unauthenticated users cannot remove members."""

    response = client.delete(
        f"{FARMS_URL}/{owner_setup['farm_id']}/members/999999999",
    )

    assert response.status_code in (401, 403)

