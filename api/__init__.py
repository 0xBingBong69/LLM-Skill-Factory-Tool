"""FastAPI service exposing the Skill Factory core over HTTP.

This package is a thin boundary layer: every endpoint delegates to the
unchanged ``skill_factory`` core. The web frontend in ``web/`` consumes it.
"""
