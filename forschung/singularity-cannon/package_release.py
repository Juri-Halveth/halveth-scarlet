"""Package only the public, reviewed Singularity demo files."""

from hashlib import sha256
from pathlib import Path
import json
import zipfile


ROOT = Path(__file__).resolve().parent
FILES = (
    "index.html",
    "singularity-core.mjs",
    "singularity-core.test.mjs",
    "singularity-runtime.test.mjs",
    "README.md",
    "SOURCE_RECEIPT.json",
    "LICENSE-HALVETH-PIRL-2.0.md",
    "package_release.py",
)
MANIFEST = "RELEASE_SHA256.json"
ARCHIVE = "HALVETH_SINGULARITY_CANNON_2026-10-18_v3.zip"


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def payload(name: str) -> bytes:
    # Match the published Git text blobs on both Windows and Linux checkouts.
    return (ROOT / name).read_bytes().replace(b"\r\n", b"\n")


def main() -> None:
    records = [
        {"path": name, "bytes": len(payload(name)), "sha256": sha256(payload(name)).hexdigest()}
        for name in sorted(FILES)
    ]
    manifest = {
        "schema": "halveth.singularity-release-sha256.v1",
        "date": "2026-10-18",
        "revision": 3,
        "textEncoding": "UTF-8 with LF line endings, matching published Git blobs",
        "files": records,
        "claimCeiling": "Checksums bind packaged bytes, not authorship, physical correctness, or external acceptance.",
    }
    with (ROOT / MANIFEST).open("w", encoding="utf-8", newline="\n") as output:
        output.write(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    with zipfile.ZipFile(ROOT / ARCHIVE, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted((*FILES, MANIFEST)):
            info = zipfile.ZipInfo(f"HALVETH_SINGULARITY_CANNON/{name}", date_time=(2026, 10, 18, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, payload(name), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    print(f"{ARCHIVE} {digest(ROOT / ARCHIVE)}")


if __name__ == "__main__":
    main()
