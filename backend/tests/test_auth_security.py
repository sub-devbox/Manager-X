import pytest
from app.core.security import (
    validate_password_strength,
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)

def test_password_strength_validator():
    # Weak: too short
    valid, msg = validate_password_strength("Short1!")
    assert not valid
    assert "8 characters" in msg

    # Weak: no uppercase
    valid, msg = validate_password_strength("nouppercase123!")
    assert not valid
    assert "uppercase" in msg

    # Weak: no lowercase
    valid, msg = validate_password_strength("NOLOWERCASE123!")
    assert not valid
    assert "lowercase" in msg

    # Weak: no digits
    valid, msg = validate_password_strength("NoDigitsHere!@#")
    assert not valid
    assert "digit" in msg

    # Weak: no special character
    valid, msg = validate_password_strength("NoSpecialChar123")
    assert not valid
    assert "special character" in msg

    # Strong: valid
    valid, msg = validate_password_strength("Str0ngP@ssw0rd!2026")
    assert valid
    assert msg == ""

def test_hashing_and_verification():
    raw = "SuperSecret#Pass123"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed)
    assert not verify_password("WrongPassword#123", hashed)

def test_jwt_issuance_and_decoding():
    token_str, jti, expire = create_access_token(
        subject="user-uuid-1234",
        extra_claims={"email": "admin@managerx.local"},
    )
    assert token_str
    assert jti

    payload = decode_access_token(token_str)
    assert payload is not None
    assert payload["sub"] == "user-uuid-1234"
    assert payload["email"] == "admin@managerx.local"
    assert payload["jti"] == jti
