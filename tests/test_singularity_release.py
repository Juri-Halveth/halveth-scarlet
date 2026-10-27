"""Check the current offline bundle and challenge its byte-binding contract."""

from hashlib import sha256
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[1] / "forschung" / "singularity-cannon"
FILES = {"index.html", "singularity-core.mjs", "README.md", "SOURCE_RECEIPT.json", "LICENSE-HALVETH-PIRL-2.0.md"}
PREFIX = "HALVETH_SINGULARITY_CANNON/"


def verify_bundle(root):
    manifest_bytes = (root / "RELEASE_SHA256.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    records = {record["path"]: record for record in manifest["files"]}
    assert len(manifest["files"]) == len(FILES) and set(records) == FILES, "exact manifest membership"
    with zipfile.ZipFile(root / "HALVETH_SINGULARITY_CANNON.zip") as archive:
        names = {PREFIX + name for name in FILES | {"RELEASE_SHA256.json"}}
        assert len(archive.infolist()) == len(names) and set(archive.namelist()) == names, "exact ZIP membership"
        assert archive.testzip() is None, "ZIP CRC"
        assert archive.read(PREFIX + "RELEASE_SHA256.json") == manifest_bytes, "ZIP manifest matches source"
        for name, record in records.items():
            source = (root / name).read_bytes()
            assert len(source) == record["bytes"], name + ": source length"
            assert sha256(source).hexdigest() == record["sha256"], name + ": source hash"
            assert archive.read(PREFIX + name) == source, name + ": ZIP equals source"
    return manifest


class ReleaseTests(unittest.TestCase):
    def fixture(self):
        temporary = tempfile.TemporaryDirectory(prefix="scarlet-release-")
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        for name in FILES | {"package_release.py"}:
            shutil.copyfile(ROOT / name, root / name)
        self.rebuild(root)
        return root

    @staticmethod
    def rebuild(root):
        subprocess.run([sys.executable, "-B", str(root / "package_release.py")], check=True, stdout=subprocess.DEVNULL)

    def test_shipped_source_manifest_and_archive_agree(self):
        verify_bundle(ROOT)

    def test_generator_is_deterministic_despite_filesystem_timestamps(self):
        root = self.fixture()
        before = (root / "HALVETH_SINGULARITY_CANNON.zip").read_bytes()
        manifest = (root / "RELEASE_SHA256.json").read_bytes()
        os.utime(root / "README.md", (946684800, 946684800))
        self.rebuild(root)
        self.assertEqual((root / "HALVETH_SINGULARITY_CANNON.zip").read_bytes(), before)
        self.assertEqual((root / "RELEASE_SHA256.json").read_bytes(), manifest)
        verify_bundle(root)

    def test_verifier_rejects_a_changed_source_payload(self):
        root = self.fixture()
        with (root / "README.md").open("ab") as stream:
            stream.write(b"\nSynthetic regression fixture only.\n")
        with self.assertRaisesRegex(AssertionError, "source length|source hash"):
            verify_bundle(root)

    def test_verifier_rejects_a_plausible_but_false_digest(self):
        root = self.fixture()
        manifest = json.loads((root / "RELEASE_SHA256.json").read_bytes())
        manifest["files"][0]["sha256"] = "0" * 64
        false_bytes = json.dumps(manifest).encode("utf-8")
        with zipfile.ZipFile(root / "HALVETH_SINGULARITY_CANNON.zip") as archive:
            members = {name: archive.read(name) for name in archive.namelist()}
        members[PREFIX + "RELEASE_SHA256.json"] = false_bytes
        (root / "RELEASE_SHA256.json").write_bytes(false_bytes)
        with zipfile.ZipFile(root / "HALVETH_SINGULARITY_CANNON.zip", "w") as archive:
            for name, payload in members.items():
                archive.writestr(name, payload)
        with self.assertRaisesRegex(AssertionError, "source hash"):
            verify_bundle(root)

    def test_verifier_rejects_crc_valid_but_different_zip_payload(self):
        root = self.fixture()
        with zipfile.ZipFile(root / "HALVETH_SINGULARITY_CANNON.zip") as archive:
            members = {name: archive.read(name) for name in archive.namelist()}
        members[PREFIX + "README.md"] += b"\nSynthetic ZIP-only change.\n"
        with zipfile.ZipFile(root / "HALVETH_SINGULARITY_CANNON.zip", "w") as archive:
            for name, payload in members.items():
                archive.writestr(name, payload)
        with self.assertRaisesRegex(AssertionError, "ZIP equals source"):
            verify_bundle(root)


if __name__ == "__main__":
    unittest.main(verbosity=2)
