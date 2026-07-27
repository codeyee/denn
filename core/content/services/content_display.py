def format_season_title(
    *,
    tv_show_name: str,
    season_number: int | None,
    season_title: str = "",
) -> str:
    show = (tv_show_name or "").strip()
    season_label = (
        f"Season {season_number}"
        if season_number is not None
        else ""
    )
    title = (season_title or "").strip()

    if show and title.lower().startswith(show.lower()):
        title = _strip_prefix(title, show)
    if season_label and title.lower().startswith(season_label.lower()):
        title = _strip_prefix(title, season_label)

    local_title = title or season_label or "Untitled"
    return f"{show}: {local_title}" if show else local_title


def _strip_prefix(value: str, prefix: str) -> str:
    return value[len(prefix):].lstrip(" -–—:").strip()
