#!/usr/bin/env python3
"""Fetch bounded official RSS feeds into a static, last-good public snapshot."""
import argparse
import email.utils
import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

SOURCES = (
    {"id": "nasa", "label": "NASA", "feedUrl": "https://www.nasa.gov/news-release/feed/", "linkHosts": ("nasa.gov", "www.nasa.gov", "science.nasa.gov")},
    {"id": "github", "label": "GitHub Changelog", "feedUrl": "https://github.blog/changelog/feed/", "linkHosts": ("github.blog",)},
)
MAX_BYTES = 1_048_576
MAX_ITEMS_PER_SOURCE = 30
ROOT = Path(__file__).resolve().parents[1]


def iso(value):
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def safe_link(raw, source):
    parsed = urllib.parse.urlsplit(raw.strip())
    if parsed.scheme != "https" or parsed.hostname not in source["linkHosts"] or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("unsupported article URL")
    # Feed tracking fragments are not part of an article's identity.
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ""))


def parse_feed(raw, source, fetched_at):
    # Code examples inside CDATA may legitimately contain the string <!DOCTYPE>.
    # Only declarations in XML markup participate in XML parsing.
    markup = re.sub(br"<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->", b"", raw)
    if len(raw) > MAX_BYTES or re.search(br"<!\s*(?:DOCTYPE|ENTITY)\b", markup, re.I):
        raise ValueError("unsupported or oversized feed")
    tree = ET.fromstring(raw)
    if tree.tag != "rss" or tree.find("channel") is None:
        raise ValueError("expected RSS 2 channel")
    items = []
    for item in tree.findall("./channel/item"):
        title = " ".join(html.unescape("".join(item.findtext("title", ""))).split())
        if not title or len(title) > 500:
            continue
        try:
            url = safe_link(item.findtext("link", ""), source)
            published = email.utils.parsedate_to_datetime(item.findtext("pubDate", ""))
            if published.tzinfo is None:
                raise ValueError("publication timezone missing")
        except (TypeError, ValueError, OverflowError):
            continue
        items.append({
            "id": hashlib.sha256(url.encode("utf-8")).hexdigest()[:24],
            "sourceId": source["id"], "publisher": source["label"],
            "title": title, "titleLanguage": "en", "url": url,
            "sourcePublishedAt": iso(published), "fetchedAt": fetched_at,
            "firstFetchedAt": fetched_at,
        })
    if not items:
        raise ValueError("feed contains no valid dated articles")
    return items


class BoundRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if newurl not in {source["feedUrl"] for source in SOURCES}:
            raise ValueError("feed redirect outside exact allowlist")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(source):
    request = urllib.request.Request(source["feedUrl"], headers={"User-Agent": "HALVETH-News/1.0 (+https://juri-halveth.github.io/halveth-scarlet/news/)", "Accept": "application/rss+xml, application/xml, text/xml"})
    with urllib.request.build_opener(BoundRedirect()).open(request, timeout=20) as response:
        if response.geturl() not in {row["feedUrl"] for row in SOURCES}:
            raise ValueError("feed URL outside allowlist")
        mime = response.headers.get_content_type()
        if mime not in ("application/rss+xml", "application/xml", "text/xml"):
            raise ValueError("unsupported feed content type")
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("feed exceeds size limit")
        return raw


def refresh(previous, now, fetcher=fetch):
    fetched_at = iso(now)
    prior_sources = {row["id"]: row for row in previous.get("sources", [])}
    prior_items = {row["id"]: row for row in previous.get("items", [])}
    sources, collected = [], []
    for source in SOURCES:
        prior = prior_sources.get(source["id"], {})
        status = {key: source[key] for key in ("id", "label", "feedUrl")}
        status.update({"lastAttemptAt": fetched_at, "lastSuccessAt": prior.get("lastSuccessAt"), "status": "failed", "error": None})
        try:
            fresh = parse_feed(fetcher(source), source, fetched_at)
            by_id = {row["id"]: row for row in prior_items.values() if row["sourceId"] == source["id"]}
            for row in fresh:
                row["firstFetchedAt"] = prior_items.get(row["id"], {}).get("firstFetchedAt", fetched_at)
                by_id[row["id"]] = row
            collected.extend(sorted(by_id.values(), key=lambda row: (row["sourcePublishedAt"], row["id"]), reverse=True)[:MAX_ITEMS_PER_SOURCE])
            status.update({"lastSuccessAt": fetched_at, "status": "fresh"})
        except (urllib.error.URLError, TimeoutError, ValueError, ET.ParseError, OSError):
            # Public output never includes raw response bodies, local paths or exception internals.
            status["error"] = "FETCH_OR_VALIDATION_FAILED"
            collected.extend(row for row in prior_items.values() if row["sourceId"] == source["id"])
        sources.append(status)
    unique = {row["id"]: row for row in collected}
    return {"schemaVersion": 1, "generatedAt": fetched_at, "refreshPolicy": "hourly; last-good retained on failure", "staleAfterMinutes": 180, "sources": sources, "items": sorted(unique.values(), key=lambda row: (row["sourcePublishedAt"], row["id"]), reverse=True)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "assets" / "news-data.json")
    args = parser.parse_args()
    previous = json.loads(args.output.read_text(encoding="utf-8")) if args.output.exists() else {}
    result = refresh(previous, datetime.now(timezone.utc))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(args.output)
    failed = [source["id"] for source in result["sources"] if source["status"] != "fresh"]
    print(json.dumps({"articles": len(result["items"]), "failedSources": failed, "lastGoodRetained": bool(failed)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
