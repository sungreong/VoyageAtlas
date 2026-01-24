from datetime import timedelta
from geopy.distance import geodesic
import logging

logger = logging.getLogger(__name__)

def cluster_media_to_suggestions(analyzed_files, time_threshold_hours=6, distance_threshold_km=50):
    """
    Groups analyzed files into suggested 'Travel Events'.
    
    analyzed_files: List of dicts like {"filename": str, "intelligence": dict}
    time_threshold_hours: Max time gap between photos in the same event.
    distance_threshold_km: Max distance between photos in the same event.
    """
    # 1. Filter and Sort by capture time
    valid_files = [f for f in analyzed_files if f["intelligence"]["captured_at"]]
    if not valid_files:
        return []
        
    # Python's datetime sorted
    valid_files.sort(key=lambda x: x["intelligence"]["captured_at"])
    
    suggestions = []
    if not valid_files:
        return suggestions
        
    current_group = {
        "title": "New Event",
        "start_date": valid_files[0]["intelligence"]["captured_at"],
        "end_date": valid_files[0]["intelligence"]["captured_at"],
        "city": valid_files[0]["intelligence"]["city"],
        "country": valid_files[0]["intelligence"]["country"],
        "lat": valid_files[0]["intelligence"]["lat"],
        "lng": valid_files[0]["intelligence"]["lng"],
        "files": [valid_files[0]["filename"]]
    }
    
    for i in range(1, len(valid_files)):
        prev = valid_files[i-1]["intelligence"]
        curr = valid_files[i]["intelligence"]
        
        # Calculate Gaps
        time_gap = curr["captured_at"] - prev["captured_at"]
        dist_gap = 0
        if prev["lat"] is not None and curr["lat"] is not None:
            dist_gap = geodesic((prev["lat"], prev["lng"]), (curr["lat"], curr["lng"])).km
            
        # Decision: Start new group?
        if time_gap > timedelta(hours=time_threshold_hours) or dist_gap > distance_threshold_km:
            # Save current group
            current_group["title"] = f"Visit to {current_group['city'] or 'Unknown Region'}"
            suggestions.append(current_group)
            
            # Start new group
            current_group = {
                "title": "New Event",
                "start_date": curr["captured_at"],
                "end_date": curr["captured_at"],
                "city": curr["city"],
                "country": curr["country"],
                "lat": curr["lat"],
                "lng": curr["lng"],
                "files": [valid_files[i]["filename"]]
            }
        else:
            # Update current group
            current_group["end_date"] = curr["captured_at"]
            current_group["files"].append(valid_files[i]["filename"])
            # Update city if it was unknown but now we have it
            if not current_group["city"] and curr["city"]:
                 current_group["city"] = curr["city"]
                 current_group["country"] = curr["country"]
                 current_group["lat"] = curr["lat"]
                 current_group["lng"] = curr["lng"]
                 
    # Add final group
    current_group["title"] = f"Visit to {current_group['city'] or 'Unknown Region'}"
    suggestions.append(current_group)
    
    # Format dates to string for JSON serialization
    for s in suggestions:
        s["start_date"] = s["start_date"].isoformat()
        s["end_date"] = s["end_date"].isoformat()
        
    return suggestions
