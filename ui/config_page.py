"""Config page: OpenRouter key, model selection, and environment status."""

from __future__ import annotations

import streamlit as st

from skill_factory.openrouter import OpenRouterError, client_from_settings
from skill_factory.references import PDF_AVAILABLE

from . import overrides, settings, store


def render() -> None:
    st.header("⚙️ Configuration")
    s = settings()

    st.markdown(
        "Your OpenRouter key is kept in this session only and never written to disk. "
        "For persistence, copy `.env.example` to `.env` and set `OPENROUTER_API_KEY`."
    )

    col1, col2 = st.columns(2)
    with col1:
        st.text_input(
            "OpenRouter API key",
            type="password",
            key="api_key",
            placeholder="sk-or-..." if not s.has_key else "(loaded from environment)",
            help="Get one at https://openrouter.ai/keys",
        )
    with col2:
        st.text_input(
            "Default model",
            key="default_model",
            placeholder=s.default_model,
            help="Any OpenRouter model id, e.g. anthropic/claude-sonnet-4.6",
        )

    if st.button("🔄 Fetch available models", disabled=not s.has_key):
        try:
            with st.spinner("Querying OpenRouter…"):
                models = client_from_settings(overrides()).list_models()
            st.session_state["available_models"] = models
            st.success(f"Loaded {len(models)} models.")
        except OpenRouterError as exc:
            st.error(str(exc))

    with st.expander("Advanced settings"):
        st.text_input("App title (sent to OpenRouter)", key="app_title",
                      placeholder=s.app_title)
        st.text_input("App URL (sent to OpenRouter)", key="app_url",
                      placeholder=s.app_url)
        st.text_input("Skills directory", key="skills_dir", placeholder=str(s.skills_dir))

    st.divider()
    st.subheader("Status")
    s = settings()  # re-resolve after edits
    c1, c2, c3 = st.columns(3)
    c1.metric("API key", "set ✅" if s.has_key else "missing ❌")
    c2.metric("Skills in library", len(store().list_skills()))
    c3.metric("PDF extraction", "available" if PDF_AVAILABLE else "off")

    n_models = len(st.session_state.get("available_models") or [])
    st.caption(
        f"Default model: `{s.default_model}` · "
        f"{n_models} models cached · Skills dir: `{s.skills_dir}`"
    )
