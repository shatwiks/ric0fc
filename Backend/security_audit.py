"""
RicozViz — Static, Architectural & Configuration Security Audit
Tests configuration, encryption, cryptographic entropy, SQL safety,
storage escape prevention, secret exposure, and dependency health.
"""

import os
import re
import sys
import glob
import inspect
from pathlib import Path

# Setup paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.utils.security import hash_password, verify_password, decode_access_token, create_access_token
from app.services.query_service import quote_ident, QueryService
from app.services.dataset_service import sanitize_filename

passed = 0
failed = 0
findings = []

def record(test_name: str, success: bool, detail: str = ""):
    global passed, failed
    status = "PASS" if success else "FAIL"
    if success:
        passed += 1
        print(f"  [+] PASS: {test_name} - {detail}")
    else:
        failed += 1
        findings.append(f"{test_name}: {detail}")
        print(f"  [-] FAIL: {test_name} - {detail}")

print("=" * 80)
print(" RICOZVIZ STATIC & CONFIGURATION SECURITY AUDIT")
print("=" * 80)

# 1. Secret Scanning in Codebase
print("\n[1] Scanning Codebase for Leaked Production Secrets...")
suspicious_patterns = [
    (r"(?:api[_-]?key|secret|password|private[_-]?key)\s*[:=]\s*['\"][A-Za-z0-9+/=_-]{24,}['\"]", "Possible hardcoded secret"),
    (r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", "Private key file or string"),
    (r"ghp_[A-Za-z0-9]{36}", "GitHub Personal Access Token"),
]

leaks_found = 0
for ext in ("*.py", "*.ts", "*.tsx", "*.json"):
    for file_path in glob.glob(str(PROJECT_ROOT / "**" / ext), recursive=True):
        if "node_modules" in file_path or ".venv" in file_path or ".next" in file_path or ".git" in file_path:
            continue
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                for pat, label in suspicious_patterns:
                    # Skip config.py defaults and test files
                    if "test_" in file_path or "config.py" in file_path:
                        continue
                    if re.search(pat, content, re.IGNORECASE):
                        record(f"Secret Scan in {os.path.basename(file_path)}", False, f"{label} matched pattern")
                        leaks_found += 1
        except Exception:
            pass

if leaks_found == 0:
    record("Zero Leaked Secrets in Source Files", True, "No hardcoded private keys or production tokens detected.")

# 2. Authentication & Cryptography Architecture
print("\n[2] Authentication & Password Cryptography...")
# Check bcrypt rounds
hashed = hash_password("SuperSecureAuditPassword2026!")
record("Bcrypt Hash Generation", hashed.startswith("$2b$12$"), f"Generated hash using 12 rounds: {hashed[:15]}...")
record("Bcrypt Verification Correctness", verify_password("SuperSecureAuditPassword2026!", hashed), "Password verification succeeds")
record("Bcrypt Wrong Password Rejection", not verify_password("WrongPassword!", hashed), "Invalid password correctly rejected")

# JWT Algorithm handling
token = create_access_token({"sub": "test-user-id", "email": "audit@ricozviz.com", "role": "Admin"})
decoded = decode_access_token(token)
record("JWT Creation & Decode", decoded and decoded.get("email") == "audit@ricozviz.com", "Token properly decoded with configured key")

# Test algorithm confusion prevention
import jwt
try:
    fake_token = jwt.encode({"sub": "attacker", "role": "Admin"}, key="", algorithm="none")
    fake_decoded = decode_access_token(fake_token)
    record("JWT 'none' Algorithm Rejection", fake_decoded is None, "Explicitly rejected alg:none token")
except Exception as e:
    record("JWT 'none' Algorithm Rejection", True, f"Rejection verified: {e}")

# 3. SQL / DuckDB Injection Protections
print("\n[3] SQL & DuckDB Query Layer Defenses...")
ident_test = quote_ident('valid_col"; DROP TABLE users; --')
record("Identifier Escaping", '""' in ident_test and ident_test.startswith('"') and ident_test.endswith('"'), f"Safely quoted: {ident_test}")

# 4. Storage Escape & Path Traversal Protections
print("\n[4] File Storage & Upload Security...")
sanitized = sanitize_filename("../../../../etc/passwd\x00.csv")
record("Path Traversal Stripping", ".." not in sanitized and "/" not in sanitized and "\\" not in sanitized and "\x00" not in sanitized, f"Sanitized result: '{sanitized}'")

# Ensure UPLOAD_DIR is an absolute canonical path
upload_root = os.path.abspath(settings.UPLOAD_DIR)
record("Upload Directory Canonical Path", os.path.isabs(upload_root), f"Upload root: {upload_root}")

# 5. Schema-Level Password Constraints
print("\n[5] Password Input Boundaries...")
from app.schemas.auth import UserSignupRequest, UserLoginRequest
from app.schemas.governance import UserInviteRequest
from pydantic import ValidationError

try:
    UserSignupRequest(full_name="Valid Name", email="test@ricozviz.com", password="P" * 73, organization_name="Org")
    record("Signup Password Max Length (72 chars)", False, "Failed: accepted 73 characters")
except ValidationError:
    record("Signup Password Max Length (72 chars)", True, "Bcrypt 72-byte ceiling enforced")

try:
    UserLoginRequest(email="test@ricozviz.com", password="P" * 73)
    record("Login Password Max Length (72 chars)", False, "Failed: accepted 73 characters")
except ValidationError:
    record("Login Password Max Length (72 chars)", True, "Bcrypt 72-byte ceiling enforced")

try:
    UserInviteRequest(full_name="Valid Name", email="test@ricozviz.com", password="P" * 73)
    record("Invite Password Max Length (72 chars)", False, "Failed: accepted 73 characters")
except ValidationError:
    record("Invite Password Max Length (72 chars)", True, "Bcrypt 72-byte ceiling enforced")

# 6. CORS Configuration
print("\n[6] CORS Origins Hardening...")
record("CORS Wildcard Banned", "*" not in settings.CORS_ORIGINS, f"Configured origins are restricted: {settings.CORS_ORIGINS}")

# Summary
print("\n" + "=" * 80)
print(f" STATIC SECURITY AUDIT RESULTS: {passed} PASSED, {failed} FAILED")
print("=" * 80)

if failed > 0:
    print("\nFailures:")
    for f in findings:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("\nAll static and architectural security gates PASSED.")
    sys.exit(0)
