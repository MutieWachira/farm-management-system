from datetime import date

from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def register_user(
    client: TestClient,
    email: str,
    password: str = "Password123!",
    first_name: str = "Test",
    last_name: str = "User",
) -> dict:
    """Register a user and return the API response JSON."""

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def login_user(
    client: TestClient,
    email: str,
    password: str = "Password123!",
) -> str:
    """Log in a user and return the access token."""

    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": email,
            "password": password,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    return data["access_token"]


def auth_headers(access_token: str) -> dict[str, str]:
    """Build Authorization headers."""

    return {
        "Authorization": f"Bearer {access_token}",
    }


def create_user_and_login(
    client: TestClient,
    email: str,
) -> tuple[dict, str]:
    """Register a user and immediately log them in."""

    user = register_user(
        client=client,
        email=email,
    )

    token = login_user(
        client=client,
        email=email,
    )

    return user, token


def create_farm(
    client: TestClient,
    access_token: str,
    name: str = "Test Farm",
) -> dict:
    """Create a farm and return it."""

    response = client.post(
        "/api/v1/farms",
        headers=auth_headers(access_token),
        json={
            "name": name,
            "location": "Nairobi",
            "area_hectares": 10.0,
            "description": "Test farm",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_field(
    client: TestClient,
    access_token: str,
    farm_id: str,
    name: str = "North Field",
) -> dict:
    """Create a field inside a farm."""

    response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers=auth_headers(access_token),
        json={
            "name": name,
            "area_hectares": 5.0,
            "soil_type": "Loamy",
            "status": "ACTIVE",
            "description": "Test field",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_crop(
    client: TestClient,
    access_token: str,
    field_id: str,
    name: str = "Maize",
) -> dict:
    """Create a crop inside a field."""

    response = client.post(
        f"/api/v1/fields/{field_id}/crops",
        headers=auth_headers(access_token),
        json={
            "name": name,
            "variety": "H614",
            "planting_date": "2026-09-15",
            "expected_harvest_date": "2027-01-15",
            "status": "PLANTED",
            "area_hectares": 5.0,
            "expected_yield": 4.5,
            "notes": "Main maize crop",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def add_member(
    client: TestClient,
    access_token: str,
    farm_id: str,
    email: str,
    role: str,
) -> dict:
    """Add a user to a farm with a specific role."""

    response = client.post(
        f"/api/v1/farms/{farm_id}/members",
        headers=auth_headers(access_token),
        json={
            "email": email,
            "role": role,
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


# ---------------------------------------------------------------------------
# Creation tests
# ---------------------------------------------------------------------------


def test_owner_can_create_crop(client: TestClient):
    """
    The farm owner should be able to create a crop.
    """

    _, owner_token = create_user_and_login(
        client,
        "owner-create-crop@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Owner Crop Farm",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    response = client.post(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(owner_token),
        json={
            "name": "Maize",
            "variety": "H614",
            "planting_date": "2026-09-15",
            "expected_harvest_date": "2027-01-15",
            "status": "PLANTED",
            "area_hectares": 5.0,
            "expected_yield": 4.5,
            "notes": "Main maize crop",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["field_id"] == field["id"]
    assert data["name"] == "Maize"
    assert data["variety"] == "H614"
    assert data["status"] == "PLANTED"
    assert data["area_hectares"] == 5.0
    assert data["expected_yield"] == 4.5


def test_manager_can_create_crop(client: TestClient):
    """
    A farm manager should be able to create crops.
    """

    _, owner_token = create_user_and_login(
        client,
        "owner-manager-create@example.com",
    )

    _, manager_token = create_user_and_login(
        client,
        "manager-create@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Manager Crop Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "manager-create@example.com",
        "MANAGER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    response = client.post(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(manager_token),
        json={
            "name": "Beans",
            "variety": "Rosecoco",
            "status": "PLANNED",
            "area_hectares": 3.0,
            "expected_yield": 2.5,
        },
    )

    assert response.status_code == 201, response.text

    data = response.json()

    assert data["field_id"] == field["id"]
    assert data["name"] == "Beans"


def test_worker_cannot_create_crop(client: TestClient):
    """
    Workers can view crops but cannot create them.
    """

    _, owner_token = create_user_and_login(
        client,
        "owner-worker-create@example.com",
    )

    _, worker_token = create_user_and_login(
        client,
        "worker-create@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Worker Crop Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "worker-create@example.com",
        "WORKER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    response = client.post(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(worker_token),
        json={
            "name": "Maize",
            "area_hectares": 5.0,
        },
    )

    assert response.status_code == 403


def test_viewer_cannot_create_crop(client: TestClient):
    """
    Viewers can view crops but cannot create them.
    """

    _, owner_token = create_user_and_login(
        client,
        "owner-viewer-create@example.com",
    )

    _, viewer_token = create_user_and_login(
        client,
        "viewer-create@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Viewer Crop Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "viewer-create@example.com",
        "VIEWER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    response = client.post(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(viewer_token),
        json={
            "name": "Maize",
            "area_hectares": 5.0,
        },
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Reading tests
# ---------------------------------------------------------------------------


def test_owner_can_list_crops(client: TestClient):
    """Farm owners can list crops."""

    _, owner_token = create_user_and_login(
        client,
        "owner-list-crops@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Owner List Farm",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.get(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(owner_token),
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["name"] == "Maize"


def test_manager_can_list_crops(client: TestClient):
    """Farm managers can list crops."""

    _, owner_token = create_user_and_login(
        client,
        "owner-manager-list@example.com",
    )

    _, manager_token = create_user_and_login(
        client,
        "manager-list@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Manager List Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "manager-list@example.com",
        "MANAGER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.get(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(manager_token),
    )

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_worker_can_list_crops(client: TestClient):
    """Farm workers can list crops."""

    _, owner_token = create_user_and_login(
        client,
        "owner-worker-list@example.com",
    )

    _, worker_token = create_user_and_login(
        client,
        "worker-list@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Worker List Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "worker-list@example.com",
        "WORKER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.get(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(worker_token),
    )

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_viewer_can_list_crops(client: TestClient):
    """Farm viewers can list crops."""

    _, owner_token = create_user_and_login(
        client,
        "owner-viewer-list@example.com",
    )

    _, viewer_token = create_user_and_login(
        client,
        "viewer-list@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Viewer List Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "viewer-list@example.com",
        "VIEWER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.get(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(viewer_token),
    )

    assert response.status_code == 200
    assert len(response.json()) == 1


# ---------------------------------------------------------------------------
# Get single crop
# ---------------------------------------------------------------------------


def test_owner_can_get_crop(client: TestClient):
    """Owner can retrieve a single crop."""

    _, token = create_user_and_login(
        client,
        "owner-get-crop@example.com",
    )

    farm = create_farm(
        client,
        token,
        "Get Crop Farm",
    )

    field = create_field(
        client,
        token,
        farm["id"],
    )

    crop = create_crop(
        client,
        token,
        field["id"],
    )

    response = client.get(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(token),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == crop["id"]
    assert data["name"] == "Maize"


# ---------------------------------------------------------------------------
# Update tests
# ---------------------------------------------------------------------------


def test_owner_can_update_crop(client: TestClient):
    """Owner can update a crop."""

    _, token = create_user_and_login(
        client,
        "owner-update-crop@example.com",
    )

    farm = create_farm(
        client,
        token,
        "Owner Update Farm",
    )

    field = create_field(
        client,
        token,
        farm["id"],
    )

    crop = create_crop(
        client,
        token,
        field["id"],
    )

    response = client.patch(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(token),
        json={
            "name": "Updated Maize",
            "status": "GROWING",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["name"] == "Updated Maize"
    assert data["status"] == "GROWING"


def test_manager_can_update_crop(client: TestClient):
    """Manager can update a crop."""

    _, owner_token = create_user_and_login(
        client,
        "owner-manager-update@example.com",
    )

    _, manager_token = create_user_and_login(
        client,
        "manager-update@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Manager Update Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "manager-update@example.com",
        "MANAGER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    crop = create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.patch(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(manager_token),
        json={
            "status": "GROWING",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "GROWING"


def test_worker_cannot_update_crop(client: TestClient):
    """Worker cannot update a crop."""

    _, owner_token = create_user_and_login(
        client,
        "owner-worker-update@example.com",
    )

    _, worker_token = create_user_and_login(
        client,
        "worker-update@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Worker Update Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "worker-update@example.com",
        "WORKER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    crop = create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.patch(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(worker_token),
        json={
            "name": "Unauthorized Update",
        },
    )

    assert response.status_code == 403


def test_viewer_cannot_update_crop(client: TestClient):
    """Viewer cannot update a crop."""

    _, owner_token = create_user_and_login(
        client,
        "owner-viewer-update@example.com",
    )

    _, viewer_token = create_user_and_login(
        client,
        "viewer-update@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Viewer Update Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "viewer-update@example.com",
        "VIEWER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    crop = create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.patch(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(viewer_token),
        json={
            "name": "Unauthorized Update",
        },
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Delete tests
# ---------------------------------------------------------------------------


def test_owner_can_delete_crop(client: TestClient):
    """Owner can delete a crop."""

    _, token = create_user_and_login(
        client,
        "owner-delete-crop@example.com",
    )

    farm = create_farm(
        client,
        token,
        "Owner Delete Farm",
    )

    field = create_field(
        client,
        token,
        farm["id"],
    )

    crop = create_crop(
        client,
        token,
        field["id"],
    )

    response = client.delete(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(token),
    )

    assert response.status_code == 204

    get_response = client.get(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(token),
    )

    assert get_response.status_code == 404


def test_manager_can_delete_crop(client: TestClient):
    """Manager can delete a crop."""

    _, owner_token = create_user_and_login(
        client,
        "owner-manager-delete@example.com",
    )

    _, manager_token = create_user_and_login(
        client,
        "manager-delete@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Manager Delete Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "manager-delete@example.com",
        "MANAGER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    crop = create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.delete(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(manager_token),
    )

    assert response.status_code == 204


def test_worker_cannot_delete_crop(client: TestClient):
    """Worker cannot delete a crop."""

    _, owner_token = create_user_and_login(
        client,
        "owner-worker-delete@example.com",
    )

    _, worker_token = create_user_and_login(
        client,
        "worker-delete@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Worker Delete Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "worker-delete@example.com",
        "WORKER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    crop = create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.delete(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(worker_token),
    )

    assert response.status_code == 403


def test_viewer_cannot_delete_crop(client: TestClient):
    """Viewer cannot delete a crop."""

    _, owner_token = create_user_and_login(
        client,
        "owner-viewer-delete@example.com",
    )

    _, viewer_token = create_user_and_login(
        client,
        "viewer-delete@example.com",
    )

    farm = create_farm(
        client,
        owner_token,
        "Viewer Delete Farm",
    )

    add_member(
        client,
        owner_token,
        farm["id"],
        "viewer-delete@example.com",
        "VIEWER",
    )

    field = create_field(
        client,
        owner_token,
        farm["id"],
    )

    crop = create_crop(
        client,
        owner_token,
        field["id"],
    )

    response = client.delete(
        f"/api/v1/fields/{field['id']}/crops/{crop['id']}",
        headers=auth_headers(viewer_token),
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Cross-farm security tests
# ---------------------------------------------------------------------------


def test_user_from_another_farm_cannot_list_crops(client: TestClient):
    """A user from another farm cannot list crops."""

    _, farm_a_token = create_user_and_login(
        client,
        "farm-a-list@example.com",
    )

    _, farm_b_token = create_user_and_login(
        client,
        "farm-b-list@example.com",
    )

    farm_a = create_farm(
        client,
        farm_a_token,
        "Farm A",
    )

    field_a = create_field(
        client,
        farm_a_token,
        farm_a["id"],
    )

    create_crop(
        client,
        farm_a_token,
        field_a["id"],
    )

    response = client.get(
        f"/api/v1/fields/{field_a['id']}/crops",
        headers=auth_headers(farm_b_token),
    )

    assert response.status_code == 404


def test_user_from_another_farm_cannot_get_crop(client: TestClient):
    """A user from another farm cannot retrieve a crop."""

    _, farm_a_token = create_user_and_login(
        client,
        "farm-a-get@example.com",
    )

    _, farm_b_token = create_user_and_login(
        client,
        "farm-b-get@example.com",
    )

    farm_a = create_farm(
        client,
        farm_a_token,
        "Farm A",
    )

    field_a = create_field(
        client,
        farm_a_token,
        farm_a["id"],
    )

    crop = create_crop(
        client,
        farm_a_token,
        field_a["id"],
    )

    response = client.get(
        f"/api/v1/fields/{field_a['id']}/crops/{crop['id']}",
        headers=auth_headers(farm_b_token),
    )

    assert response.status_code == 404


def test_user_from_another_farm_cannot_update_crop(
    client: TestClient,
):
    """A user from another farm cannot update a crop."""

    _, farm_a_token = create_user_and_login(
        client,
        "farm-a-update@example.com",
    )

    _, farm_b_token = create_user_and_login(
        client,
        "farm-b-update@example.com",
    )

    farm_a = create_farm(
        client,
        farm_a_token,
        "Farm A",
    )

    field_a = create_field(
        client,
        farm_a_token,
        farm_a["id"],
    )

    crop = create_crop(
        client,
        farm_a_token,
        field_a["id"],
    )

    response = client.patch(
        f"/api/v1/fields/{field_a['id']}/crops/{crop['id']}",
        headers=auth_headers(farm_b_token),
        json={
            "name": "Unauthorized",
        },
    )

    assert response.status_code == 404


def test_user_from_another_farm_cannot_delete_crop(
    client: TestClient,
):
    """A user from another farm cannot delete a crop."""

    _, farm_a_token = create_user_and_login(
        client,
        "farm-a-delete@example.com",
    )

    _, farm_b_token = create_user_and_login(
        client,
        "farm-b-delete@example.com",
    )

    farm_a = create_farm(
        client,
        farm_a_token,
        "Farm A",
    )

    field_a = create_field(
        client,
        farm_a_token,
        farm_a["id"],
    )

    crop = create_crop(
        client,
        farm_a_token,
        field_a["id"],
    )

    response = client.delete(
        f"/api/v1/fields/{field_a['id']}/crops/{crop['id']}",
        headers=auth_headers(farm_b_token),
    )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------


def test_crop_rejects_negative_area(client: TestClient):
    """Crop area must be greater than zero."""

    _, token = create_user_and_login(
        client,
        "negative-area@example.com",
    )

    farm = create_farm(
        client,
        token,
        "Negative Area Farm",
    )

    field = create_field(
        client,
        token,
        farm["id"],
    )

    response = client.post(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(token),
        json={
            "name": "Maize",
            "area_hectares": -5,
        },
    )

    assert response.status_code == 422


def test_crop_rejects_zero_area(client: TestClient):
    """Crop area cannot be zero."""

    _, token = create_user_and_login(
        client,
        "zero-area@example.com",
    )

    farm = create_farm(
        client,
        token,
        "Zero Area Farm",
    )

    field = create_field(
        client,
        token,
        farm["id"],
    )

    response = client.post(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(token),
        json={
            "name": "Maize",
            "area_hectares": 0,
        },
    )

    assert response.status_code == 422


def test_crop_rejects_negative_expected_yield(
    client: TestClient,
):
    """Expected yield cannot be negative."""

    _, token = create_user_and_login(
        client,
        "negative-yield@example.com",
    )

    farm = create_farm(
        client,
        token,
        "Negative Yield Farm",
    )

    field = create_field(
        client,
        token,
        farm["id"],
    )

    response = client.post(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(token),
        json={
            "name": "Maize",
            "area_hectares": 5,
            "expected_yield": -10,
        },
    )

    assert response.status_code == 422


def test_crop_rejects_invalid_harvest_date(
    client: TestClient,
):
    """
    Expected harvest date cannot be before planting date.
    """

    _, token = create_user_and_login(
        client,
        "invalid-date@example.com",
    )

    farm = create_farm(
        client,
        token,
        "Invalid Date Farm",
    )

    field = create_field(
        client,
        token,
        farm["id"],
    )

    response = client.post(
        f"/api/v1/fields/{field['id']}/crops",
        headers=auth_headers(token),
        json={
            "name": "Maize",
            "planting_date": "2027-01-15",
            "expected_harvest_date": "2026-01-15",
            "area_hectares": 5,
        },
    )

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Authentication tests
# ---------------------------------------------------------------------------


def test_unauthenticated_user_cannot_list_crops(
    client: TestClient,
):
    """Unauthenticated users cannot list crops."""

    response = client.get(
        "/api/v1/fields/00000000-0000-0000-0000-000000000000/crops"
    )

    assert response.status_code == 401


def test_unauthenticated_user_cannot_create_crop(
    client: TestClient,
):
    """Unauthenticated users cannot create crops."""

    response = client.post(
        "/api/v1/fields/00000000-0000-0000-0000-000000000000/crops",
        json={
            "name": "Maize",
            "area_hectares": 5,
        },
    )

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Field boundary test
# ---------------------------------------------------------------------------


def test_crop_cannot_be_accessed_through_wrong_field(
    client: TestClient,
):
    """
    A crop belonging to Field A cannot be accessed using Field B.
    """

    _, token = create_user_and_login(
        client,
        "wrong-field@example.com",
    )

    farm = create_farm(
        client,
        token,
        "Wrong Field Farm",
    )

    field_a = create_field(
        client,
        token,
        farm["id"],
        "Field A",
    )

    field_b = create_field(
        client,
        token,
        farm["id"],
        "Field B",
    )

    crop = create_crop(
        client,
        token,
        field_a["id"],
    )

    response = client.get(
        f"/api/v1/fields/{field_b['id']}/crops/{crop['id']}",
        headers=auth_headers(token),
    )

    assert response.status_code == 404