#!/usr/bin/env python3
"""Verifies the CSP script hash in vercel.json still matches the pages.

The Content-Security-Policy allows exactly one inline script by hash. Editing
that script without updating the header would get it blocked in production —
silently, because the site is built to work without it. Run this after touching
the inline script in the page head:

    python3 tools/check-csp-hash.py
"""
import base64
import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
pages = sorted(ROOT.glob("*.html"))

hashes = {}
for page in pages:
    for script in re.findall(r"<script>(.*?)</script>", page.read_text(), re.S):
        digest = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
        hashes.setdefault(f"sha256-{digest}", []).append(page.name)

policy = ""
for rule in json.loads((ROOT / "vercel.json").read_text())["headers"]:
    for header in rule["headers"]:
        if header["key"] == "Content-Security-Policy":
            policy = header["value"]

missing = {h: files for h, files in hashes.items() if h not in policy}
if missing:
    print("CSP is missing a hash for inline scripts:", file=sys.stderr)
    for h, files in missing.items():
        print(f"  {h}  ({', '.join(files)})", file=sys.stderr)
    print("\nAdd it to script-src in vercel.json.", file=sys.stderr)
    sys.exit(1)

print(f"OK — {len(hashes)} inline script hash(es) across {len(pages)} pages are allowed by the CSP.")
