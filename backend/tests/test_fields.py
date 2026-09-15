from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# ============================================================================
# TEST CONFIGURATION
# ============================================================================

TEST_PASSWORD = "TestPassword123!"


# ============================================================================
# AUTHENTICATION HELPERS
# ============================================================================

def unique_email(prefix: str) -> str:
    """
    Generate a unique email address for every test user.

    This prevents duplicate-email conflicts when tests are run repeatedly.
    """

    return f"{prefix}_{uuid4().hex[:8]}@example.com"


def register_user(
    *,
    email: str,
    password: str = TEST_PASSWORD,
    first_name: str = "Test",
    last_name: str = "User",
) -> dict:
    """
    Register a new AgriCore user.

    The current registration API expects:
        - email
        - password
        - first_name
        - last_name
    """

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
        },
    )

    assert response.status_code in (200, 201), response.text

    return response.json()


def login_user(
    email: str,
    password: str = TEST_PASSWORD,
) -> str:
    """
    Log in a user and return the access token.

    IMPORTANT:
    The current AgriCore login endpoint expects JSON,
    not OAuth2 form data.
    """

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert "access_token" in data, data

    return data["access_token"]


def auth_headers(access_token: str) -> dict:
    """
    Build the Authorization header used by protected endpoints.
    """

    return {
        "Authorization": f"Bearer {access_token}",
    }


def create_user(
    *,
    prefix: str,
) -> tuple[dict, str]:
    """
    Register and log in a test user.

    Returns:
        (user_data, access_token)
    """

    email = unique_email(prefix)

    user = register_user(
        email=email,
        first_name=prefix.replace("_", " ").title(),
        last_name="User",
    )

    # Make sure the email is available to membership tests even if
    # the registration response does not return it.
    user["email"] = email

    token = login_user(
        email=email,
    )

    return user, token


# ============================================================================
# USER HELPERS
# ============================================================================

def get_user_id(user: dict) -> str:
    """
    Extract the user ID from a user response.
    """

    user_id = user.get("id")

    assert user_id is not None, (
        f"Registration response does not contain 'id': {user}"
    )

    return user_id


# ============================================================================
# FARM HELPERS
# ============================================================================

def create_farm(
    *,
    access_token: str,
    name: str = "Test Farm",
    location: str = "Nairobi",
    area_hectares: float = 10.0,
) -> dict:
    """
    Create a farm using the authenticated user.
    """

    response = client.post(
        "/api/v1/farms",
        headers=auth_headers(access_token),
        json={
            "name": name,
            "location": location,
            "area_hectares": area_hectares,
        },
    )

    assert response.status_code in (200, 201), response.text

    return response.json()


def get_farm_id(farm: dict) -> str:
    """
    Extract the farm ID from a farm response.
    """

    farm_id = farm.get("id")

    assert farm_id is not None, (
        f"Farm response does not contain 'id': {farm}"
    )

    return farm_id


# ============================================================================
# FARM MEMBERSHIP HELPERS
# ============================================================================

def add_farm_member(
    *,
    owner_token: str,
    farm_id: str,
    email: str,
    role: str,
) -> dict:
    """
    Add a user to a farm.

    The current membership API identifies users using email.

    Only the farm owner should be able to add members.
    """

    response = client.post(
        f"/api/v1/farms/{farm_id}/members",
        headers=auth_headers(owner_token),
        json={
            "email": email,
            "role": role.upper(),
        },
    )

    assert response.status_code in (200, 201), response.text

    return response.json()


# ============================================================================
# FIELD HELPERS
# ============================================================================

def create_field(
    *,
    access_token: str,
    farm_id: str,
    name: str = "North Field",
    area_hectares: float = 2.5,
    soil_type: str = "Loam",
    irrigation_type: str = "Drip",
    status: str = "ACTIVE",
) -> dict:
    """
    Create a field through the Fields API.
    """

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(access_token),
        json={
            "name": name,
            "area_hectares": area_hectares,
            "soil_type": soil_type,
            "irrigation_type": irrigation_type,
            "status": status,
        },
    )

    assert response.status_code in (200, 201), response.text

    return response.json()


def get_field_id(field: dict) -> str:
    """
    Extract the field ID from a field response.
    """

    field_id = field.get("id")

    assert field_id is not None, (
        f"Field response does not contain 'id': {field}"
    )

    return field_id


# ============================================================================
# 1. FIELD CREATION
# ============================================================================

def test_authenticated_owner_can_create_field():
    """
    A farm owner must be able to create a field.
    """

    owner, owner_token = create_user(
        prefix="field_owner",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Owner Field Farm",
    )

    farm_id = get_farm_id(farm)

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(owner_token),
        json={
            "name": "Owner Field",
            "area_hectares": 5.0,
            "soil_type": "Loam",
            "irrigation_type": "Drip",
            "status": "ACTIVE",
        },
    )

    assert response.status_code in (200, 201), response.text

    data = response.json()

    assert data["name"] == "Owner Field"
    assert data["farm_id"] == farm_id
    assert data["area_hectares"] == 5.0


def test_manager_can_create_field():
    """
    A farm manager must be able to create a field.
    """

    owner, owner_token = create_user(
        prefix="manager_owner",
    )

    manager, manager_token = create_user(
        prefix="field_manager",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Manager Field Farm",
    )

    farm_id = get_farm_id(farm)

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=manager["email"],
        role="MANAGER",
    )

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(manager_token),
        json={
            "name": "Manager Field",
            "area_hectares": 4.0,
            "soil_type": "Clay",
            "irrigation_type": "Sprinkler",
            "status": "ACTIVE",
        },
    )

    assert response.status_code in (200, 201), response.text

    data = response.json()

    assert data["name"] == "Manager Field"
    assert data["farm_id"] == farm_id


def test_viewer_cannot_create_field():
    """
    A viewer must not be able to create fields.
    """

    owner, owner_token = create_user(
        prefix="viewer_owner",
    )

    viewer, viewer_token = create_user(
        prefix="field_viewer",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Viewer Field Farm",
    )

    farm_id = get_farm_id(farm)

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=viewer["email"],
        role="VIEWER",
    )

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(viewer_token),
        json={
            "name": "Viewer Field",
            "area_hectares": 2.0,
            "soil_type": "Loam",
            "irrigation_type": "Drip",
            "status": "ACTIVE",
        },
    )

    assert response.status_code == 403


def test_worker_cannot_create_field():
    """
    A worker must not be able to create fields.
    """

    owner, owner_token = create_user(
        prefix="worker_owner",
    )

    worker, worker_token = create_user(
        prefix="field_worker",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Worker Field Farm",
    )

    farm_id = get_farm_id(farm)

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=worker["email"],
        role="WORKER",
    )

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(worker_token),
        json={
            "name": "Worker Field",
            "area_hectares": 2.0,
            "soil_type": "Loam",
            "irrigation_type": "Drip",
            "status": "ACTIVE",
        },
    )

    assert response.status_code == 403


# ============================================================================
# 2. FIELD READING
# ============================================================================

def test_farm_member_can_list_fields():
    """
    Any member of a farm should be able to list its fields.
    """

    owner, owner_token = create_user(
        prefix="list_owner",
    )

    viewer, viewer_token = create_user(
        prefix="list_viewer",
    )

    farm = create_farm(
        access_token=owner_token,
        name="List Fields Farm",
    )

    farm_id = get_farm_id(farm)

    create_field(
        access_token=owner_token,
        farm_id=farm_id,
        name="Field One",
    )

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=viewer["email"],
        role="VIEWER",
    )

    response = client.get(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(viewer_token),
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert isinstance(data, list)
    assert len(data) >= 1

    assert any(
        field["name"] == "Field One"
        for field in data
    )


def test_farm_member_can_view_field():
    """
    Any farm member should be able to view an individual field.
    """

    owner, owner_token = create_user(
        prefix="view_owner",
    )

    viewer, viewer_token = create_user(
        prefix="view_member",
    )

    farm = create_farm(
        access_token=owner_token,
        name="View Field Farm",
    )

    farm_id = get_farm_id(farm)

    field = create_field(
        access_token=owner_token,
        farm_id=farm_id,
        name="Viewable Field",
    )

    field_id = get_field_id(field)

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=viewer["email"],
        role="VIEWER",
    )

    response = client.get(
        f"/api/v1/farms/{farm_id}/fields/{field_id}",
        headers=auth_headers(viewer_token),
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["id"] == field_id
    assert data["farm_id"] == farm_id
    assert data["name"] == "Viewable Field"


# ============================================================================
# 3. FIELD UPDATE
# ============================================================================

def test_manager_can_update_field():
    """
    A manager must be able to update a field.
    """

    owner, owner_token = create_user(
        prefix="update_owner",
    )

    manager, manager_token = create_user(
        prefix="update_manager",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Update Field Farm",
    )

    farm_id = get_farm_id(farm)

    field = create_field(
        access_token=owner_token,
        farm_id=farm_id,
        name="Original Field",
    )

    field_id = get_field_id(field)

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=manager["email"],
        role="MANAGER",
    )

    response = client.patch(
        f"/api/v1/farms/{farm_id}/fields/{field_id}",
        headers=auth_headers(manager_token),
        json={
            "name": "Updated Field",
            "area_hectares": 3.5,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["id"] == field_id
    assert data["name"] == "Updated Field"
    assert data["area_hectares"] == 3.5


def test_viewer_cannot_update_field():
    """
    A viewer must not be able to update fields.
    """

    owner, owner_token = create_user(
        prefix="viewer_update_owner",
    )

    viewer, viewer_token = create_user(
        prefix="viewer_update",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Viewer Update Farm",
    )

    farm_id = get_farm_id(farm)

    field = create_field(
        access_token=owner_token,
        farm_id=farm_id,
        name="Protected Field",
    )

    field_id = get_field_id(field)

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=viewer["email"],
        role="VIEWER",
    )

    response = client.patch(
        f"/api/v1/farms/{farm_id}/fields/{field_id}",
        headers=auth_headers(viewer_token),
        json={
            "name": "Unauthorized Update",
        },
    )

    assert response.status_code == 403


# ============================================================================
# 4. FIELD DELETE
# ============================================================================

def test_manager_can_delete_field():
    """
    A manager must be able to delete fields.
    """

    owner, owner_token = create_user(
        prefix="delete_owner",
    )

    manager, manager_token = create_user(
        prefix="delete_manager",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Delete Field Farm",
    )

    farm_id = get_farm_id(farm)

    field = create_field(
        access_token=owner_token,
        farm_id=farm_id,
        name="Delete Me",
    )

    field_id = get_field_id(field)

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=manager["email"],
        role="MANAGER",
    )

    response = client.delete(
        f"/api/v1/farms/{farm_id}/fields/{field_id}",
        headers=auth_headers(manager_token),
    )

    assert response.status_code in (200, 204), response.text

    get_response = client.get(
        f"/api/v1/farms/{farm_id}/fields/{field_id}",
        headers=auth_headers(owner_token),
    )

    assert get_response.status_code == 404


def test_viewer_cannot_delete_field():
    """
    A viewer must not be able to delete fields.
    """

    owner, owner_token = create_user(
        prefix="viewer_delete_owner",
    )

    viewer, viewer_token = create_user(
        prefix="viewer_delete",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Viewer Delete Farm",
    )

    farm_id = get_farm_id(farm)

    field = create_field(
        access_token=owner_token,
        farm_id=farm_id,
        name="Protected Delete Field",
    )

    field_id = get_field_id(field)

    add_farm_member(
        owner_token=owner_token,
        farm_id=farm_id,
        email=viewer["email"],
        role="VIEWER",
    )

    response = client.delete(
        f"/api/v1/farms/{farm_id}/fields/{field_id}",
        headers=auth_headers(viewer_token),
    )

    assert response.status_code == 403


# ============================================================================
# 5. CROSS-FARM SECURITY
# ============================================================================

def test_user_from_another_farm_cannot_access_field_or_list():
    """
    A user who is not a member of another farm must not be able
    to access that farm's fields.
    """

    owner_a, owner_a_token = create_user(
        prefix="farm_a_owner",
    )

    owner_b, owner_b_token = create_user(
        prefix="farm_b_owner",
    )

    farm_a = create_farm(
        access_token=owner_a_token,
        name="Farm A",
    )

    farm_b = create_farm(
        access_token=owner_b_token,
        name="Farm B",
    )

    farm_a_id = get_farm_id(farm_a)
    farm_b_id = get_farm_id(farm_b)

    field_a = create_field(
        access_token=owner_a_token,
        farm_id=farm_a_id,
        name="Farm A Field",
    )

    field_a_id = get_field_id(field_a)

    list_response = client.get(
        f"/api/v1/farms/{farm_a_id}/fields",
        headers=auth_headers(owner_b_token),
    )

    assert list_response.status_code in (403, 404)

    get_response = client.get(
        f"/api/v1/farms/{farm_a_id}/fields/{field_a_id}",
        headers=auth_headers(owner_b_token),
    )

    assert get_response.status_code in (403, 404)

    own_farm_response = client.get(
        f"/api/v1/farms/{farm_b_id}/fields",
        headers=auth_headers(owner_b_token),
    )

    assert own_farm_response.status_code == 200


def test_field_from_another_farm_cannot_be_accessed_through_another_farm_url():
    """
    Protect against IDOR.

    A field belonging to Farm A must not become accessible merely
    because its ID is supplied under Farm B's URL.
    """

    owner_a, owner_a_token = create_user(
        prefix="idor_owner_a",
    )

    owner_b, owner_b_token = create_user(
        prefix="idor_owner_b",
    )

    farm_a = create_farm(
        access_token=owner_a_token,
        name="IDOR Farm A",
    )

    farm_b = create_farm(
        access_token=owner_b_token,
        name="IDOR Farm B",
    )

    farm_a_id = get_farm_id(farm_a)
    farm_b_id = get_farm_id(farm_b)

    field_a = create_field(
        access_token=owner_a_token,
        farm_id=farm_a_id,
        name="Private Farm A Field",
    )

    field_a_id = get_field_id(field_a)

    response = client.get(
        f"/api/v1/farms/{farm_b_id}/fields/{field_a_id}",
        headers=auth_headers(owner_b_token),
    )

    assert response.status_code in (403, 404)


# ============================================================================
# 6. UNAUTHENTICATED ACCESS
# ============================================================================

def test_unauthenticated_user_cannot_access_list_fields():
    """
    Unauthenticated users must not be able to list fields.
    """

    farm_id = str(uuid4())

    response = client.get(
        f"/api/v1/farms/{farm_id}/fields",
    )

    assert response.status_code == 401


def test_unauthenticated_user_cannot_access_field():
    """
    Unauthenticated users must not be able to retrieve fields.
    """

    farm_id = str(uuid4())
    field_id = str(uuid4())

    response = client.get(
        f"/api/v1/farms/{farm_id}/fields/{field_id}",
    )

    assert response.status_code == 401


def test_unauthenticated_user_cannot_create_field():
    """
    Unauthenticated users must not be able to create fields.
    """

    farm_id = str(uuid4())

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        json={
            "name": "Unauthorized Field",
            "area_hectares": 2.0,
            "soil_type": "Loam",
            "irrigation_type": "Drip",
            "status": "ACTIVE",
        },
    )

    assert response.status_code == 401


# ============================================================================
# 7. FIELD VALIDATION
# ============================================================================

def test_field_area_zero_is_rejected():
    """
    A field area of zero must be rejected.
    """

    owner, owner_token = create_user(
        prefix="validation_zero",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Validation Zero Farm",
    )

    farm_id = get_farm_id(farm)

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(owner_token),
        json={
            "name": "Zero Area Field",
            "area_hectares": 0,
            "soil_type": "Loam",
            "irrigation_type": "Drip",
            "status": "ACTIVE",
        },
    )

    assert response.status_code == 422


def test_field_area_negative_is_rejected():
    """
    Negative field areas must be rejected.
    """

    owner, owner_token = create_user(
        prefix="validation_negative",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Validation Negative Farm",
    )

    farm_id = get_farm_id(farm)

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(owner_token),
        json={
            "name": "Negative Area Field",
            "area_hectares": -1,
            "soil_type": "Loam",
            "irrigation_type": "Drip",
            "status": "ACTIVE",
        },
    )

    assert response.status_code == 422


def test_field_area_large_negative_is_rejected():
    """
    Large negative field areas must also be rejected.
    """

    owner, owner_token = create_user(
        prefix="validation_large_negative",
    )

    farm = create_farm(
        access_token=owner_token,
        name="Validation Large Negative Farm",
    )

    farm_id = get_farm_id(farm)

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(owner_token),
        json={
            "name": "Large Negative Field",
            "area_hectares": -10.5,
            "soil_type": "Loam",
            "irrigation_type": "Drip",
            "status": "ACTIVE",
        },
    )

    assert response.status_code == 422