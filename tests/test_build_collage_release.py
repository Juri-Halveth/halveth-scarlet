from __future__ import annotations

import hashlib
import json
import os
import stat
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import build_collage_release as builder  # noqa: E402


def bdecode(data: bytes) -> object:
    def parse(offset: int) -> tuple[object, int]:
        marker = data[offset : offset + 1]
        if marker == b"i":
            end = data.index(b"e", offset)
            return int(data[offset + 1 : end]), end + 1
        if marker == b"l":
            result = []
            offset += 1
            while data[offset : offset + 1] != b"e":
                item, offset = parse(offset)
                result.append(item)
            return result, offset + 1
        if marker == b"d":
            result = {}
            offset += 1
            while data[offset : offset + 1] != b"e":
                key, offset = parse(offset)
                value, offset = parse(offset)
                result[key] = value
            return result, offset + 1
        colon = data.index(b":", offset)
        length = int(data[offset:colon])
        start = colon + 1
        end = start + length
        return data[start:end], end

    value, final_offset = parse(0)
    if final_offset != len(data):
        raise ValueError("trailing bencode data")
    return value


class DeterministicReleaseTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.payload = self.base / "payload"
        (self.payload / "assets").mkdir(parents=True)
        (self.payload / "index.html").write_text(
            "<!doctype html>\n<title>Choice Atelier</title>\n", encoding="utf-8"
        )
        (self.payload / "assets" / "kleid.txt").write_text(
            "Eigene Wahl.\n", encoding="utf-8"
        )
        (self.payload / "assets" / "pixel.bin").write_bytes(bytes(range(256)) * 20)
        self.name = "choice-atelier-v1.0.0"
        self.web_seed = (
            "https://juri-halveth.github.io/halveth-scarlet/releases/"
            "choice-atelier-v1.0.0/choice-atelier-v1.0.0.zip"
        )

    def build(self, output: Path) -> builder.ReleaseArtifacts:
        return builder.build_release(
            payload_dir=self.payload,
            output_dir=output,
            release_name=self.name,
            web_seed=self.web_seed,
        )

    def test_two_runs_are_byte_identical_and_self_consistent(self) -> None:
        first = self.build(self.base / "out-a")
        second = self.build(self.base / "out-b")

        for first_path, second_path in (
            (first.zip_path, second.zip_path),
            (first.torrent_path, second.torrent_path),
            (first.magnet_path, second.magnet_path),
            (first.receipt_path, second.receipt_path),
        ):
            self.assertEqual(first_path.read_bytes(), second_path.read_bytes())

        with zipfile.ZipFile(first.zip_path) as archive:
            names = archive.namelist()
            self.assertEqual(names, sorted(names, key=lambda name: name.encode("utf-8")))
            for info in archive.infolist():
                self.assertEqual(info.date_time, builder.ZIP_TIMESTAMP)
                self.assertEqual(info.compress_type, zipfile.ZIP_STORED)
                self.assertFalse(info.filename.startswith(("/", "\\")))
                self.assertNotIn("..", Path(info.filename).parts)

            expected_manifest = "".join(
                f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {relative}\n"
                for relative, path in sorted(
                    (
                        ("assets/kleid.txt", self.payload / "assets" / "kleid.txt"),
                        ("assets/pixel.bin", self.payload / "assets" / "pixel.bin"),
                        ("index.html", self.payload / "index.html"),
                    ),
                    key=lambda item: item[0].encode("utf-8"),
                )
            ).encode("utf-8")
            self.assertEqual(
                archive.read(f"{self.name}/SHA256SUMS.txt"), expected_manifest
            )

        torrent_bytes = first.torrent_path.read_bytes()
        torrent = bdecode(torrent_bytes)
        self.assertIsInstance(torrent, dict)
        self.assertEqual(torrent_bytes, builder.bencode(torrent))
        info = torrent[b"info"]
        zip_bytes = first.zip_path.read_bytes()
        expected_pieces = b"".join(
            hashlib.sha1(
                zip_bytes[offset : offset + builder.PIECE_LENGTH],
                usedforsecurity=False,
            ).digest()
            for offset in range(0, len(zip_bytes), builder.PIECE_LENGTH)
        )
        self.assertEqual(info[b"piece length"], builder.PIECE_LENGTH)
        self.assertEqual(info[b"length"], len(zip_bytes))
        self.assertEqual(info[b"pieces"], expected_pieces)
        self.assertEqual(torrent[b"url-list"].decode(), self.web_seed)
        expected_infohash = hashlib.sha1(
            builder.bencode(info), usedforsecurity=False
        ).hexdigest()
        self.assertEqual(first.infohash_sha1, expected_infohash)

        magnet = first.magnet_path.read_text(encoding="utf-8").strip()
        query = parse_qs(urlsplit(magnet).query)
        self.assertEqual(query["xt"], [f"urn:btih:{expected_infohash}"])
        self.assertEqual(query["dn"], [f"{self.name}.zip"])
        self.assertEqual(query["xl"], [str(len(zip_bytes))])
        self.assertEqual(query["ws"], [self.web_seed])

        receipt = json.loads(first.receipt_path.read_text(encoding="utf-8"))
        self.assertEqual(receipt["artifacts"]["zip"]["sha256"], hashlib.sha256(zip_bytes).hexdigest())
        self.assertEqual(receipt["artifacts"]["torrent"]["infohash_sha1"], expected_infohash)
        self.assertEqual(receipt["payload"]["file_count"], 3)
        self.assertEqual(receipt["web_seed"], self.web_seed)

    def test_missing_payload_creates_no_output_directory(self) -> None:
        output = self.base / "must-not-exist"
        with self.assertRaises(builder.BuildError):
            builder.build_release(
                payload_dir=self.base / "missing",
                output_dir=output,
                release_name=self.name,
                web_seed=self.web_seed,
            )
        self.assertFalse(output.exists())

    def test_output_inside_payload_is_rejected(self) -> None:
        output = self.payload / "release"
        with self.assertRaisesRegex(builder.BuildError, "inside the payload"):
            self.build(output)
        self.assertFalse(output.exists())

    def test_portability_guards_reject_reserved_names(self) -> None:
        with self.assertRaisesRegex(builder.BuildError, "reserved Windows device"):
            builder._validate_portable_component("CON.txt")
        with self.assertRaisesRegex(builder.BuildError, "space or dot"):
            builder._validate_portable_component("trailing.")

    def test_reparse_and_symlink_stat_flags_are_detected(self) -> None:
        reparse = SimpleNamespace(st_mode=stat.S_IFDIR, st_file_attributes=0x400)
        symlink = SimpleNamespace(st_mode=stat.S_IFLNK, st_file_attributes=0)
        regular = SimpleNamespace(st_mode=stat.S_IFREG, st_file_attributes=0)
        self.assertTrue(builder._is_reparse_or_symlink(reparse))
        self.assertTrue(builder._is_reparse_or_symlink(symlink))
        self.assertFalse(builder._is_reparse_or_symlink(regular))

    def test_symlink_payload_entry_is_rejected_when_supported(self) -> None:
        link = self.payload / "linked.txt"
        try:
            os.symlink(self.payload / "index.html", link)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"symlinks unavailable in this test environment: {exc}")
        with self.assertRaisesRegex(builder.BuildError, "symlink or reparse"):
            self.build(self.base / "out-link")


if __name__ == "__main__":
    unittest.main()
