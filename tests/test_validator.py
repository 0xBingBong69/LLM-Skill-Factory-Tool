from skill_factory.validator import estimate_tokens, validate_skill_md

GOOD = """---
name: good-skill
description: Use when the user asks to do the thing. Trigger on requests like "do the thing".
---

# Overview
Always structure your response clearly.

## Framework
Check the inputs first.

## Example
Good vs poor shown here.
"""


def test_good_skill_passes():
    rep = validate_skill_md(GOOD, expected_name="good-skill")
    assert rep.ok
    assert not rep.warnings
    assert not rep.suggestions


def test_missing_frontmatter_errors():
    rep = validate_skill_md("# No frontmatter\nbody")
    assert not rep.ok
    assert any("frontmatter" in e.lower() for e in rep.errors)


def test_bad_name_errors():
    text = GOOD.replace("name: good-skill", "name: Bad Name")
    rep = validate_skill_md(text)
    assert not rep.ok
    assert any("kebab-case" in e for e in rep.errors)


def test_name_mismatch_warns():
    rep = validate_skill_md(GOOD, expected_name="different-folder")
    assert rep.ok  # mismatch is a warning, not an error
    assert any("does not match" in w for w in rep.warnings)


def test_short_description_warns():
    text = """---
name: short-desc
description: too short
---

# Body
Always do it.

## Example
ok
"""
    rep = validate_skill_md(text)
    assert any("short" in w.lower() for w in rep.warnings)


def test_missing_trigger_suggests():
    text = """---
name: no-trigger
description: This is a reasonably long description without any activation hints at all here.
---

# Body
Always do it.

## Example
ok
"""
    rep = validate_skill_md(text)
    assert any("trigger" in s.lower() for s in rep.suggestions)


def test_missing_example_suggests():
    text = """---
name: no-example
description: Use when the user asks for something specific and concrete to happen now.
---

# Body
Always do the work and structure it.

## More
Check things.
"""
    rep = validate_skill_md(text)
    assert any("example" in s.lower() for s in rep.suggestions)


def test_estimate_tokens():
    assert estimate_tokens("") == 0
    assert estimate_tokens("a" * 400) == 100
