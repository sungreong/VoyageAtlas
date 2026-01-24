import os
import exifread
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from geopy.geocoders import Nominatim
from hachoir.parser import createParser
from hachoir.metadata import extractMetadata
from hachoir.core import config as hachoir_config
from datetime import datetime
import logging

# Disable hachoir warnings
hachoir_config.quiet = True
logger = logging.getLogger(__name__)

def get_decimal_from_dms(dms, ref):
    """Helper to convert DMS (Degrees, Minutes, Seconds) to decimal degrees."""
    degrees = dms[0]
    minutes = dms[1]
    seconds = dms[2]
    
    # Handle both PIL (Rational) and ExifRead (Ratio) formats
    if hasattr(degrees, 'numerator'): degrees = float(degrees.numerator) / float(degrees.denominator)
    if hasattr(minutes, 'numerator'): minutes = float(minutes.numerator) / float(minutes.denominator)
    if hasattr(seconds, 'numerator'): seconds = float(seconds.numerator) / float(seconds.denominator)

    decimal = float(degrees) + (float(minutes) / 60.0) + (float(seconds) / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

def extract_image_metadata(file_path):
    """Extract GPS and DateTime from images using PIL and ExifRead."""
    metadata = {
        "captured_at": None,
        "lat": None,
        "lng": None,
        "city": None,
        "country": None
    }
    
    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)
            
            # 1. Capture Time
            if 'EXIF DateTimeOriginal' in tags:
                date_str = str(tags['EXIF DateTimeOriginal'])
                try:
                    metadata["captured_at"] = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
                except ValueError:
                    pass

            # 2. GPS Coordinates
            if 'GPS GPSLatitude' in tags and 'GPS GPSLongitude' in tags:
                lat_dms = tags['GPS GPSLatitude'].values
                lat_ref = tags['GPS GPSLatitudeRef'].values
                lng_dms = tags['GPS GPSLongitude'].values
                lng_ref = tags['GPS GPSLongitudeRef'].values
                
                metadata["lat"] = get_decimal_from_dms(lat_dms, lat_ref)
                metadata["lng"] = get_decimal_from_dms(lng_dms, lng_ref)
                
    except Exception as e:
        logger.error(f"Error extracting image metadata: {e}")
        
    return metadata

def extract_video_metadata(file_path):
    """Extract basic metadata from videos using hachoir."""
    metadata = {
        "captured_at": None,
        "lat": None,
        "lng": None,
        "city": None,
        "country": None
    }
    
    parser = createParser(file_path)
    if not parser:
        return metadata
        
    try:
        with parser:
            video_meta = extractMetadata(parser)
            if video_meta:
                if video_meta.has('creation_date'):
                    metadata["captured_at"] = video_meta.get('creation_date')
                # Hachoir GPS support is patchy, but let's check common fields
                if video_meta.has('latitude'):
                    metadata["lat"] = video_meta.get('latitude')
                if video_meta.has('longitude'):
                    metadata["lng"] = video_meta.get('longitude')
    except Exception as e:
        logger.error(f"Error extracting video metadata: {e}")
        
    return metadata

def reverse_geocode(lat, lng):
    """Convert coordinates to city/country using Nominatim (OpenStreetMap)."""
    if lat is None or lng is None:
        return None, None
        
    try:
        geolocator = Nominatim(user_agent="voyage_atlas_analyzer")
        location = geolocator.reverse((lat, lng), language='en', timeout=5)
        if location and 'address' in location.raw:
            address = location.raw['address']
            city = address.get('city') or address.get('town') or address.get('village') or address.get('suburb')
            country = address.get('country')
            return city, country
    except Exception as e:
        logger.error(f"Geocoding failed: {e}")
        
    return None, None

def analyze_media(file_path):
    """
    Main entry point: Flexible common function for any media type.
    Detects type and extracts metadata including reverse geocoding.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext in ['.jpg', '.jpeg', '.png', '.tiff']:
        metadata = extract_image_metadata(file_path)
    elif ext in ['.mp4', '.mov', '.avi', '.mkv']:
        metadata = extract_video_metadata(file_path)
    else:
        metadata = {"captured_at": None, "lat": None, "lng": None, "city": None, "country": None}
        
    # Attempt Geocoding if coordinates found
    if metadata["lat"] and metadata["lng"]:
        city, country = reverse_geocode(metadata["lat"], metadata["lng"])
        metadata["city"] = city
        metadata["country"] = country
        
    return metadata
