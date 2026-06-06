"""Smoke test: the Streamlit app must render every page without raising.

Uses Streamlit's AppTest harness, which executes app.py in a simulated runtime
(no real browser, no network). It runs with an empty store and no API key, so it
exercises the 'not configured' paths of each page.
"""

from streamlit.testing.v1 import AppTest

PAGES = ["Config", "New Skill", "Library", "Editor", "Playground", "Batch"]


def test_all_pages_render():
    at = AppTest.from_file("app.py", default_timeout=30)
    at.run()
    assert not at.exception, at.exception

    for page in PAGES[1:]:
        at.sidebar.radio[0].set_value(page).run()
        assert not at.exception, f"{page}: {at.exception}"
