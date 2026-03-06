def get_media_type(filename: str) -> str:
    """Determine media type from filename."""
    lower = filename.lower()
    if "pano" in lower:
        return "pano_image"
    if any(lower.endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.mkv']):
        return "video"
    return "image"
