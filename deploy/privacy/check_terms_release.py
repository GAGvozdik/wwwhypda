"""Проверка редакции договора, словарей и отпечатка выпущенного документа."""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
RELEASES = {"2026-10-16.1": "94c8b6f94ac6a87e15177859d74fb136e7799420f140e3eeebd6c49364206e0b", "2026-10-14.2": "c492f028dc6429017911607d83883edf69b5ac83ce6bcc2f613dbf88f1d804d7", "2026-10-14.1": "8df5d111e6d2bd35ee62f2b7b18371e493f5acfaae4a9dc238a4783b7235566d"}


def check():
    backend = (ROOT / "wwwhypda-backend/auth/terms.py").read_text(encoding="utf-8")
    frontend = (ROOT / "wwwhypda-frontendV2/src/common/userAgreementVersion.ts").read_text(encoding="utf-8")
    version = re.search(r'CURRENT_TERMS_VERSION = "([^"]+)"', backend).group(1)
    assert re.search(r"USER_AGREEMENT_VERSION = '([^']+)'", frontend).group(1) == version, "Редакции backend/frontend расходятся"
    document = ROOT / "wwwhypda-frontendV2/src/components/pages/userAgreement.tsx"
    digest = hashlib.sha256(document.read_text(encoding="utf-8").replace("\r\n", "\n").encode()).hexdigest()
    assert RELEASES.get(version) == digest, "Документ изменён: выпустите новую редакцию и обновите обе константы и отпечаток"
    for name in ("terms_version_error", "terms_client_time_forbidden"):
        server = json.loads((ROOT / "common/error_messages.json").read_text(encoding="utf-8"))
        client = json.loads((ROOT / "wwwhypda-frontendV2/src/common/error_messages.json").read_text(encoding="utf-8"))
        assert server[name] == client[name], "Сообщения backend/frontend расходятся"
    registration = (ROOT / "wwwhypda-frontendV2/src/components/users/auth/registration.tsx").read_text(encoding="utf-8")
    assert "terms_version: USER_AGREEMENT_VERSION" in registration
    assert "terms_accepted_at:" not in registration
    assert "{USER_AGREEMENT_VERSION}" in document.read_text(encoding="utf-8")
    manifest = json.loads((ROOT / "wwwhypda-frontendV2/public/legal/manifest.json").read_text(encoding="utf-8"))
    assert manifest["version"] == version, "Редакция PDF расходится с backend/frontend"
    assert {item["slug"] for item in manifest["documents"]} == {"user-agreement", "privacy-policy", "cookie-policy"}
    for name, expected in manifest["sources"].items():
        actual = hashlib.sha256((ROOT/name).read_text(encoding="utf-8").replace("\r\n","\n").encode()).hexdigest()
        assert actual == expected, "PDF устарел относительно источника: "+name
    print("Редакции, документ, payload, словари и источники PDF согласованы.")


if __name__ == "__main__":
    check()
