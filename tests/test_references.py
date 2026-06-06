import pytest

from skill_factory.references import combine_references, extract_text_from_upload


def test_extract_text_file():
    assert extract_text_from_upload("notes.txt", b"hello world") == "hello world"
    assert extract_text_from_upload("doc.md", "# Title".encode()) == "# Title"


def test_unsupported_extension_raises():
    with pytest.raises(ValueError):
        extract_text_from_upload("image.png", b"\x89PNG")


def test_combine_references():
    out = combine_references("pasted facts", [("a.md", "from file a"), ("empty.md", "  ")])
    assert "pasted facts" in out
    assert "# Source: a.md" in out
    assert "from file a" in out
    # empty file is skipped
    assert "empty.md" not in out


def test_combine_references_empty():
    assert combine_references("", []) == ""
