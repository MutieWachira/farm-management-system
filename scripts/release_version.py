#!/usr/bin/env python3
"""Determine a release version from conventional commits and synchronize manifests."""

import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "backend/app/core/version.py"
PACKAGE_FILE = ROOT / "frontend/package.json"
LOCK_FILE = ROOT / "frontend/package-lock.json"
VERSION_PATTERN = re.compile(r'^APP_VERSION = "(\d+)\.(\d+)\.(\d+)"$', re.MULTILINE)
TAG_PATTERN = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
COMMIT_PATTERN = re.compile(r"^(?P<type>[a-z]+)(?:\([^)]+\))?(?P<breaking>!)?: .+$")
BREAKING_FOOTER_PATTERN = re.compile(r"^BREAKING[ -]CHANGE:", re.MULTILINE)
RELEASE_LEVELS = {"patch": 1, "minor": 2, "major": 3}


def classify_commit(message: str) -> str | None:
    lines = message.strip().splitlines()
    if not lines:
        return None

    match = COMMIT_PATTERN.fullmatch(lines[0])
    is_breaking = bool(match and match.group("breaking")) or bool(
        BREAKING_FOOTER_PATTERN.search(message)
    )
    if is_breaking:
        return "major"
    if not match:
        return None
    if match.group("type") == "feat":
        return "minor"
    if match.group("type") in {"fix", "perf"}:
        return "patch"
    return None


def bump_version(version: tuple[int, int, int], level: str) -> tuple[int, int, int]:
    major, minor, patch = version
    if level == "major":
        return major + 1, 0, 0
    if level == "minor":
        return major, minor + 1, 0
    if level == "patch":
        return major, minor, patch + 1
    raise ValueError(f"Unknown release level: {level}")


def read_current_version() -> tuple[int, int, int]:
    match = VERSION_PATTERN.search(VERSION_FILE.read_text(encoding="utf-8"))
    if not match:
        raise ValueError(f"Could not read APP_VERSION from {VERSION_FILE}")
    return tuple(map(int, match.groups()))


def latest_version_tag() -> tuple[str, tuple[int, int, int]] | None:
    result = subprocess.run(
        ["git", "tag", "--list", "v[0-9]*"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    tags = []
    for tag in result.stdout.splitlines():
        match = TAG_PATTERN.fullmatch(tag)
        if match:
            tags.append((tag, tuple(map(int, match.groups()))))
    return max(tags, key=lambda item: item[1]) if tags else None


def commit_messages(base_ref: str, head_ref: str) -> list[str]:
    result = subprocess.run(
        [
            "git",
            "log",
            "--no-merges",
            "--format=%B%x00",
            f"{base_ref}..{head_ref}",
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return [message.strip() for message in result.stdout.split("\0") if message.strip()]


def synchronize_version(version: tuple[int, int, int]) -> None:
    version_string = ".".join(map(str, version))
    source = VERSION_FILE.read_text(encoding="utf-8")
    if len(VERSION_PATTERN.findall(source)) != 1:
        raise ValueError(f"Expected one APP_VERSION assignment in {VERSION_FILE}")
    updated_source, count = VERSION_PATTERN.subn(
        f'APP_VERSION = "{version_string}"', source
    )
    if count != 1:
        raise ValueError(f"Expected one APP_VERSION assignment in {VERSION_FILE}")

    package = json.loads(PACKAGE_FILE.read_text(encoding="utf-8"))
    lock = json.loads(LOCK_FILE.read_text(encoding="utf-8"))
    root_package = lock.get("packages", {}).get("")
    if not isinstance(package.get("version"), str):
        raise ValueError(f"Missing package version in {PACKAGE_FILE}")
    if not isinstance(root_package, dict) or not isinstance(lock.get("version"), str):
        raise ValueError(f"Missing root package metadata in {LOCK_FILE}")

    package_text, count = re.subn(
        r'("version"\s*:\s*")[^"]+(")',
        rf"\g<1>{version_string}\g<2>",
        PACKAGE_FILE.read_text(encoding="utf-8"),
        count=1,
    )
    if count != 1:
        raise ValueError(f"Expected one root version field in {PACKAGE_FILE}")
    lock_text = LOCK_FILE.read_text(encoding="utf-8")
    updated_lock, count = re.subn(
        r'("version"\s*:\s*")[^"]+(")',
        rf"\g<1>{version_string}\g<2>",
        lock_text,
        count=2,
    )
    if count != 2:
        raise ValueError(f"Expected root version fields in {LOCK_FILE}")

    VERSION_FILE.write_text(updated_source, encoding="utf-8")
    PACKAGE_FILE.write_text(package_text, encoding="utf-8")
    LOCK_FILE.write_text(updated_lock, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-ref", required=True)
    args = parser.parse_args()

    current_version = read_current_version()
    latest_tag = latest_version_tag()
    if latest_tag and latest_tag[1] > current_version:
        raise ValueError(
            f"Latest release tag {latest_tag[0]} is newer than APP_VERSION "
            f"{'.'.join(map(str, current_version))}"
        )

    baseline = (
        latest_tag[0]
        if latest_tag and latest_tag[1] == current_version
        else args.baseline_ref
    )
    messages = commit_messages(baseline, "HEAD")
    levels = [classify_commit(message) for message in messages]
    level = max(
        (commit_level for commit_level in levels if commit_level),
        key=RELEASE_LEVELS.__getitem__,
        default=None,
    )
    if level is None:
        return

    next_version = bump_version(current_version, level)
    synchronize_version(next_version)
    print(".".join(map(str, next_version)))


if __name__ == "__main__":
    main()
