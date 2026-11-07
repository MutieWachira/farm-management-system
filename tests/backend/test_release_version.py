import json

from scripts import release_version
from scripts.release_version import bump_version, classify_commit


def test_classifies_conventional_commits() -> None:
    assert classify_commit("feat(fields): add crop rotation") == "minor"
    assert classify_commit("fix: prevent duplicate harvest entries") == "patch"
    assert classify_commit("perf(reports): reduce query time") == "patch"
    assert classify_commit("feat!: redesign farm permissions") == "major"
    assert (
        classify_commit("fix(auth): rotate refresh tokens\n\nBREAKING CHANGE: old tokens expire")
        == "major"
    )
    assert classify_commit("docs: update setup instructions") is None
    assert classify_commit("chore(release): v1.0.1 [skip ci]") is None


def test_bumps_semantic_versions() -> None:
    assert bump_version((1, 2, 3), "patch") == (1, 2, 4)
    assert bump_version((1, 2, 3), "minor") == (1, 3, 0)
    assert bump_version((1, 2, 3), "major") == (2, 0, 0)


def test_synchronizes_only_project_version_fields(tmp_path, monkeypatch) -> None:
    version_file = tmp_path / "version.py"
    package_file = tmp_path / "package.json"
    lock_file = tmp_path / "package-lock.json"
    version_file.write_text('APP_VERSION = "1.0.0"\n', encoding="utf-8")
    package_file.write_text(
        '{"name":"frontend","version":"1.0.0"}\n', encoding="utf-8"
    )
    lock_file.write_text(
        '{"version":"1.0.0","packages":{"":{"version":"1.0.0"},'
        '"node_modules/dependency":{"version":"2.0.0"}}}\n',
        encoding="utf-8",
    )
    monkeypatch.setattr(release_version, "VERSION_FILE", version_file)
    monkeypatch.setattr(release_version, "PACKAGE_FILE", package_file)
    monkeypatch.setattr(release_version, "LOCK_FILE", lock_file)

    release_version.synchronize_version((1, 2, 0))

    assert version_file.read_text(encoding="utf-8") == 'APP_VERSION = "1.2.0"\n'
    assert json.loads(package_file.read_text(encoding="utf-8"))["version"] == "1.2.0"
    lock = json.loads(lock_file.read_text(encoding="utf-8"))
    assert lock["version"] == "1.2.0"
    assert lock["packages"][""]["version"] == "1.2.0"
    assert lock["packages"]["node_modules/dependency"]["version"] == "2.0.0"
