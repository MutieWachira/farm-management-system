from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_is_not_plaintext() -> None:
    password = "StrongPassword123!"

    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)


def test_wrong_password_fails() -> None:
    password = "StrongPassword123!"

    hashed = hash_password(password)

    assert not verify_password(
        "WrongPassword123!",
        hashed,
    )


def test_access_token_is_created() -> None:
    token = create_access_token(
        "00000000-0000-0000-0000-000000000001"
    )

    assert isinstance(token, str)
    assert len(token) > 0