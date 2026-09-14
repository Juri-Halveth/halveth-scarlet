#!/usr/bin/env python3
"""Build a deterministic, dependency-free Choice Atelier release package.

The builder performs no network access. It packages one local payload directory
as a deterministic ZIP, creates a BitTorrent v1 descriptor for that ZIP, emits
a web-seeded magnet URI, and writes a machine-readable receipt.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import sys
import tempfile
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import BinaryIO, Iterable, Mapping, Sequence
from urllib.parse import quote, urlsplit


PIECE_LENGTH = 1024 * 1024
ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
BUFFER_SIZE = 1024 * 1024
DEFAULT_RELEASE_NAME = "choice-atelier-v1.0.0"
WINDOWS_FORBIDDEN_CHARS = frozenset('<>:"/\\|?*')
WINDOWS_DEVICE_NAME = re.compile(
    r"^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$", re.IGNORECASE
)


class BuildError(ValueError):
    """Raised when the requested package cannot be built safely."""


@dataclass(frozen=True)
class PayloadFile:
    source: Path
    relative: PurePosixPath
    size: int
    sha256: str


@dataclass(frozen=True)
class ReleaseArtifacts:
    zip_path: Path
    torrent_path: Path
    magnet_path: Path
    receipt_path: Path
    infohash_sha1: str
    magnet_uri: str


def _to_bytes(value: str | bytes) -> bytes:
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        return value.encode("utf-8")
    raise TypeError(f"bencode string values must be str or bytes, got {type(value)!r}")


def bencode(value: object) -> bytes:
    """Encode a BitTorrent value with dictionary keys sorted by raw bytes."""

    if isinstance(value, bool):
        raise TypeError("booleans are not valid bencode integers")
    if isinstance(value, int):
        return b"i" + str(value).encode("ascii") + b"e"
    if isinstance(value, (str, bytes)):
        raw = _to_bytes(value)
        return str(len(raw)).encode("ascii") + b":" + raw
    if isinstance(value, (list, tuple)):
        return b"l" + b"".join(bencode(item) for item in value) + b"e"
    if isinstance(value, Mapping):
        encoded_items: list[tuple[bytes, object]] = []
        seen: set[bytes] = set()
        for key, item in value.items():
            raw_key = _to_bytes(key)  # type: ignore[arg-type]
            if raw_key in seen:
                raise TypeError("dictionary contains duplicate UTF-8 bencode keys")
            seen.add(raw_key)
            encoded_items.append((raw_key, item))
        encoded_items.sort(key=lambda pair: pair[0])
        body = b"".join(bencode(key) + bencode(item) for key, item in encoded_items)
        return b"d" + body + b"e"
    raise TypeError(f"unsupported bencode value: {type(value)!r}")


def _absolute(path: os.PathLike[str] | str) -> Path:
    return Path(os.path.abspath(os.fspath(path)))


def _is_reparse_or_symlink(st: os.stat_result) -> bool:
    if stat.S_ISLNK(st.st_mode):
        return True
    reparse_flag = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    attributes = getattr(st, "st_file_attributes", 0)
    return bool(attributes & reparse_flag)


def _validate_portable_component(component: str) -> None:
    if component in {"", ".", ".."}:
        raise BuildError(f"non-portable path component: {component!r}")
    if component[-1:] in {" ", "."}:
        raise BuildError(f"path component ends in a space or dot: {component!r}")
    if any(ord(char) < 32 or ord(char) == 127 for char in component):
        raise BuildError(f"path component contains a control character: {component!r}")
    forbidden = WINDOWS_FORBIDDEN_CHARS.intersection(component)
    if forbidden:
        chars = "".join(sorted(forbidden))
        raise BuildError(f"path component contains non-portable character(s) {chars!r}")
    if WINDOWS_DEVICE_NAME.fullmatch(component):
        raise BuildError(f"reserved Windows device name: {component!r}")
    try:
        component.encode("utf-8", errors="strict")
    except UnicodeEncodeError as exc:
        raise BuildError(f"path component is not valid UTF-8 text: {component!r}") from exc


def _validate_release_name(name: str) -> None:
    _validate_portable_component(name)
    if name != unicodedata.normalize("NFC", name):
        raise BuildError("release name must use Unicode NFC normalization")


def _sha256_stream(stream: BinaryIO) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    while chunk := stream.read(BUFFER_SIZE):
        digest.update(chunk)
        size += len(chunk)
    return digest.hexdigest(), size


def _sha256_file(path: Path) -> tuple[str, int]:
    with path.open("rb") as stream:
        return _sha256_stream(stream)


def _assert_regular_unchanged(path: Path, expected_size: int | None = None) -> os.stat_result:
    st = path.lstat()
    if _is_reparse_or_symlink(st):
        raise BuildError(f"symlink or reparse point rejected: {path}")
    if not stat.S_ISREG(st.st_mode):
        raise BuildError(f"payload entry is not a regular file: {path}")
    if expected_size is not None and st.st_size != expected_size:
        raise BuildError(f"payload file changed during build: {path}")
    return st


def _inventory_payload(payload: Path) -> list[PayloadFile]:
    if not payload.exists():
        raise BuildError(f"payload directory does not exist: {payload}")
    root_stat = payload.lstat()
    if _is_reparse_or_symlink(root_stat):
        raise BuildError(f"payload root is a symlink or reparse point: {payload}")
    if not stat.S_ISDIR(root_stat.st_mode):
        raise BuildError(f"payload path is not a directory: {payload}")

    candidates: list[tuple[Path, PurePosixPath, os.stat_result]] = []
    collision_keys: dict[str, str] = {}

    def walk(directory: Path, relative_parts: tuple[str, ...]) -> None:
        current_stat = directory.lstat()
        if _is_reparse_or_symlink(current_stat):
            raise BuildError(f"symlink or reparse point rejected: {directory}")
        if not stat.S_ISDIR(current_stat.st_mode):
            raise BuildError(f"expected a directory while walking payload: {directory}")

        with os.scandir(directory) as entries:
            for entry in entries:
                _validate_portable_component(entry.name)
                entry_path = directory / entry.name
                entry_stat = entry.stat(follow_symlinks=False)
                if entry.is_symlink() or _is_reparse_or_symlink(entry_stat):
                    raise BuildError(f"symlink or reparse point rejected: {entry_path}")

                parts = relative_parts + (entry.name,)
                if stat.S_ISDIR(entry_stat.st_mode):
                    walk(entry_path, parts)
                    continue
                if not stat.S_ISREG(entry_stat.st_mode):
                    raise BuildError(f"special filesystem entry rejected: {entry_path}")

                relative = PurePosixPath(*parts)
                normalized_parts = tuple(
                    unicodedata.normalize("NFC", part).casefold() for part in relative.parts
                )
                collision_key = "/".join(normalized_parts)
                previous = collision_keys.get(collision_key)
                if previous is not None:
                    raise BuildError(
                        "payload paths collide on a portable case-insensitive filesystem: "
                        f"{previous!r} and {relative.as_posix()!r}"
                    )
                collision_keys[collision_key] = relative.as_posix()
                candidates.append((entry_path, relative, entry_stat))

    walk(payload, ())
    if not candidates:
        raise BuildError(f"payload directory contains no regular files: {payload}")

    if "sha256sums.txt" in collision_keys:
        raise BuildError("payload root already contains the builder-owned SHA256SUMS.txt")

    candidates.sort(key=lambda item: item[1].as_posix().encode("utf-8"))
    files: list[PayloadFile] = []
    for source, relative, scanned_stat in candidates:
        _assert_regular_unchanged(source, scanned_stat.st_size)
        sha256, size = _sha256_file(source)
        _assert_regular_unchanged(source, size)
        files.append(PayloadFile(source, relative, size, sha256))
    return files


def _manifest_bytes(files: Sequence[PayloadFile]) -> bytes:
    lines = [f"{item.sha256}  {item.relative.as_posix()}\n" for item in files]
    return "".join(lines).encode("utf-8")


def _zip_info(archive_name: str) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(filename=archive_name, date_time=ZIP_TIMESTAMP)
    info.compress_type = zipfile.ZIP_STORED
    info.create_system = 3
    info.create_version = 20
    info.extract_version = 20
    info.flag_bits = 0x800
    info.internal_attr = 0
    info.external_attr = (stat.S_IFREG | 0o644) << 16
    info.extra = b""
    info.comment = b""
    return info


def _write_zip(
    target: Path,
    release_name: str,
    files: Sequence[PayloadFile],
    manifest: bytes,
) -> None:
    entries: list[tuple[str, PayloadFile | bytes]] = [
        (f"{release_name}/{item.relative.as_posix()}", item) for item in files
    ]
    entries.append((f"{release_name}/SHA256SUMS.txt", manifest))
    entries.sort(key=lambda item: item[0].encode("utf-8"))

    with zipfile.ZipFile(
        target,
        mode="w",
        compression=zipfile.ZIP_STORED,
        allowZip64=True,
        strict_timestamps=True,
    ) as archive:
        archive.comment = b""
        for archive_name, source in entries:
            info = _zip_info(archive_name)
            if isinstance(source, bytes):
                archive.writestr(info, source)
                continue
            _assert_regular_unchanged(source.source, source.size)
            copied_size = 0
            copied_digest = hashlib.sha256()
            with source.source.open("rb") as input_stream, archive.open(
                info, mode="w", force_zip64=True
            ) as output_stream:
                while chunk := input_stream.read(BUFFER_SIZE):
                    output_stream.write(chunk)
                    copied_digest.update(chunk)
                    copied_size += len(chunk)
            _assert_regular_unchanged(source.source, source.size)
            if copied_size != source.size or copied_digest.hexdigest() != source.sha256:
                raise BuildError(f"payload file changed during build: {source.source}")


def _torrent_pieces(path: Path, piece_length: int) -> tuple[bytes, int]:
    if piece_length <= 0:
        raise BuildError("piece length must be positive")
    pieces: list[bytes] = []
    with path.open("rb") as stream:
        while chunk := stream.read(piece_length):
            pieces.append(hashlib.sha1(chunk, usedforsecurity=False).digest())
    return b"".join(pieces), len(pieces)


def _validate_web_seed(web_seed: str) -> None:
    if any(ord(char) < 32 or ord(char) == 127 for char in web_seed):
        raise BuildError("web seed contains a control character")
    parsed = urlsplit(web_seed)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise BuildError("web seed must be an absolute HTTP or HTTPS URL")
    if parsed.username is not None or parsed.password is not None:
        raise BuildError("web seed must not contain embedded credentials")
    if parsed.fragment:
        raise BuildError("web seed must not contain a URL fragment")


def _magnet_uri(infohash: str, display_name: str, length: int, web_seed: str) -> str:
    pairs = (
        ("xt", f"urn:btih:{infohash}"),
        ("dn", display_name),
        ("xl", str(length)),
        ("ws", web_seed),
    )
    encoded = "&".join(
        f"{quote(key, safe='')}={quote(value, safe=':')}" for key, value in pairs
    )
    return f"magnet:?{encoded}"


def _json_bytes(value: object) -> bytes:
    text = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)
    return (text + "\n").encode("utf-8")


def _write_bytes(path: Path, data: bytes) -> None:
    with path.open("wb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())


def _same_or_within(candidate: Path, parent: Path) -> bool:
    candidate_text = os.path.normcase(os.path.abspath(os.fspath(candidate)))
    parent_text = os.path.normcase(os.path.abspath(os.fspath(parent)))
    try:
        return os.path.commonpath((candidate_text, parent_text)) == parent_text
    except ValueError:
        return False


def build_release(
    payload_dir: os.PathLike[str] | str,
    output_dir: os.PathLike[str] | str,
    release_name: str = DEFAULT_RELEASE_NAME,
    web_seed: str = "",
) -> ReleaseArtifacts:
    """Build all release artifacts without performing network operations.

    The output directory is created only after payload validation and complete
    artifact generation in a temporary directory.
    """

    _validate_release_name(release_name)
    _validate_web_seed(web_seed)
    payload = _absolute(payload_dir)
    output = _absolute(output_dir)
    files = _inventory_payload(payload)

    if _same_or_within(output, payload):
        raise BuildError("output directory must not be inside the payload directory")
    if output.exists():
        output_stat = output.lstat()
        if _is_reparse_or_symlink(output_stat):
            raise BuildError(f"output directory is a symlink or reparse point: {output}")
        if not stat.S_ISDIR(output_stat.st_mode):
            raise BuildError(f"output path is not a directory: {output}")

    zip_name = f"{release_name}.zip"
    torrent_name = f"{release_name}.torrent"
    magnet_name = f"{release_name}.magnet.txt"
    receipt_name = f"{release_name}.receipt.json"
    manifest = _manifest_bytes(files)
    manifest_sha256 = hashlib.sha256(manifest).hexdigest()

    with tempfile.TemporaryDirectory(prefix="choice-atelier-release-") as temp_text:
        temp = Path(temp_text)
        temp_zip = temp / zip_name
        temp_torrent = temp / torrent_name
        temp_magnet = temp / magnet_name
        temp_receipt = temp / receipt_name

        _write_zip(temp_zip, release_name, files, manifest)
        zip_sha256, zip_size = _sha256_file(temp_zip)
        pieces, piece_count = _torrent_pieces(temp_zip, PIECE_LENGTH)

        info = {
            b"length": zip_size,
            b"name": zip_name.encode("utf-8"),
            b"piece length": PIECE_LENGTH,
            b"pieces": pieces,
        }
        encoded_info = bencode(info)
        infohash_sha1 = hashlib.sha1(encoded_info, usedforsecurity=False).hexdigest()
        torrent = bencode({b"info": info, b"url-list": web_seed.encode("utf-8")})
        _write_bytes(temp_torrent, torrent)
        torrent_sha256 = hashlib.sha256(torrent).hexdigest()

        magnet_uri = _magnet_uri(infohash_sha1, zip_name, zip_size, web_seed)
        magnet_bytes = (magnet_uri + "\n").encode("utf-8")
        _write_bytes(temp_magnet, magnet_bytes)
        magnet_sha256 = hashlib.sha256(magnet_bytes).hexdigest()

        receipt = {
            "artifacts": {
                "magnet": {
                    "filename": magnet_name,
                    "sha256": magnet_sha256,
                    "uri": magnet_uri,
                },
                "torrent": {
                    "filename": torrent_name,
                    "infohash_sha1": infohash_sha1,
                    "piece_count": piece_count,
                    "piece_length": PIECE_LENGTH,
                    "pieces_sha256": hashlib.sha256(pieces).hexdigest(),
                    "sha256": torrent_sha256,
                    "size": len(torrent),
                },
                "zip": {
                    "filename": zip_name,
                    "sha256": zip_sha256,
                    "size": zip_size,
                },
            },
            "determinism": {
                "bencode_dictionary_order": "raw UTF-8 bytes ascending",
                "json": "UTF-8, sorted keys, two-space indent, LF newline",
                "path_order": "UTF-8 bytes ascending over POSIX relative paths",
                "zip_compression": "stored",
                "zip_entry_mode": "0100644",
                "zip_timestamp": "1980-01-01T00:00:00Z",
            },
            "payload": {
                "file_count": len(files),
                "files": [
                    {
                        "path": item.relative.as_posix(),
                        "sha256": item.sha256,
                        "size": item.size,
                    }
                    for item in files
                ],
                "sha256sums_filename": "SHA256SUMS.txt",
                "sha256sums_sha256": manifest_sha256,
                "total_size": sum(item.size for item in files),
            },
            "release_name": release_name,
            "schema": "halveth.choice-atelier.release-receipt",
            "schema_version": 1,
            "web_seed": web_seed,
        }
        receipt_bytes = _json_bytes(receipt)
        _write_bytes(temp_receipt, receipt_bytes)

        output.mkdir(parents=True, exist_ok=True)
        targets = {
            temp_zip: output / zip_name,
            temp_torrent: output / torrent_name,
            temp_magnet: output / magnet_name,
            temp_receipt: output / receipt_name,
        }
        for source, target in targets.items():
            os.replace(source, target)

    return ReleaseArtifacts(
        zip_path=output / zip_name,
        torrent_path=output / torrent_name,
        magnet_path=output / magnet_name,
        receipt_path=output / receipt_name,
        infohash_sha1=infohash_sha1,
        magnet_uri=magnet_uri,
    )


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Build a deterministic Choice Atelier ZIP, BitTorrent v1 descriptor, "
            "magnet URI, and JSON receipt without network access."
        )
    )
    parser.add_argument("--payload", required=True, type=Path, help="payload directory")
    parser.add_argument("--output-dir", required=True, type=Path, help="artifact directory")
    parser.add_argument(
        "--name",
        default=DEFAULT_RELEASE_NAME,
        help=f"portable release name (default: {DEFAULT_RELEASE_NAME})",
    )
    parser.add_argument(
        "--web-seed",
        required=True,
        help="absolute HTTP(S) URL from which the generated ZIP will be served",
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        artifacts = build_release(
            payload_dir=args.payload,
            output_dir=args.output_dir,
            release_name=args.name,
            web_seed=args.web_seed,
        )
    except (BuildError, OSError, zipfile.BadZipFile) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print(f"ZIP: {artifacts.zip_path}")
    print(f"Torrent: {artifacts.torrent_path}")
    print(f"Magnet file: {artifacts.magnet_path}")
    print(f"Receipt: {artifacts.receipt_path}")
    print(f"Infohash (SHA-1): {artifacts.infohash_sha1}")
    print(f"Magnet: {artifacts.magnet_uri}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
