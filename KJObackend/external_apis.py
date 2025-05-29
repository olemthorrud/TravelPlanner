#external_apis.py
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timezone, date
import openai
import json
load_dotenv(override=True)

TM_API_KEY = os.getenv('TICKETMASTER_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OWM_API_KEY = os.getenv('WEATHER_API_KEY')
BASE_URL_TM = 'https://app.ticketmaster.com/discovery/v2/events.json'
GEOCODE_URL = "https://api.openweathermap.org/geo/1.0/direct"
ONECALL_URL = "https://api.openweathermap.org/data/2.5/weather"


def get_coordinates(city_name, country_code, limit=1):
    params = {
        "q": f"{city_name},{country_code}",
        "limit": limit,
        "appid": OWM_API_KEY,
    }
    res = requests.get(GEOCODE_URL, params=params, timeout=8)
    if res.status_code != 200:
        return None, None

    data = res.json()
    if not data:
        return None, None

    first = data[0]
    return first.get("lat"), first.get("lon")

def get_weather_forecast(lat, lon):
    if lat is None or lon is None:
        return ["Location not found"]

    params = {
        "lat": lat,
        "lon": lon,
        "units": "metric",
        "appid": OWM_API_KEY,
    }
    res = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params, timeout=8)

    if res.status_code != 200:
        return [f"Weather API error {res.status_code}"]

    data = res.json()
    d_date = datetime.fromtimestamp(data["dt"], tz=timezone.utc).date()

    return [{
        "date": str(d_date),
        "location": data.get("name"),
        "country": data["sys"].get("country"),
        "weather_main": data["weather"][0].get("main"),
        "weather_description": data["weather"][0].get("description").title(),
        "temperature": data["main"].get("temp"),
        "feels_like": data["main"].get("feels_like"),
        "temp_min": data["main"].get("temp_min"),
        "temp_max": data["main"].get("temp_max"),
        "pressure": data["main"].get("pressure"),
        "humidity": data["main"].get("humidity"),
        "wind_speed": data["wind"].get("speed"),
        "wind_deg": data["wind"].get("deg"),
        "cloudiness": data["clouds"].get("all"),
        "visibility": data.get("visibility"),
        "sunrise": datetime.fromtimestamp(data["sys"]["sunrise"], tz=timezone.utc).strftime('%H:%M:%S'),
        "sunset": datetime.fromtimestamp(data["sys"]["sunset"], tz=timezone.utc).strftime('%H:%M:%S'),
    }]

def unix_to_date(ts):
    return datetime.fromtimestamp(ts, tz=timezone.utc).date()

def get_country_code(city_name, max_attempts=3):
    prompt = (
        f"Act as a location expert. Given a city name, respond ONLY with a JSON object containing the 2-letter country code of the most likely country for that city, "
        f"using the field 'country_code'. If you cannot determine the country confidently, respond with a string 'false'. If the city name is empty, respond with a string 'false'. "
        f"Do not return any explanation, only the JSON object or false. City: {city_name}"
    )
    client = openai.OpenAI(api_key=OPENAI_API_KEY)

    for attempt in range(max_attempts):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content.strip()
        code = json.loads(content).get("country_code", "")
        if isinstance(code, str) and len(code) == 2:
            return code.upper()
        else: 
            continue
    return False

def interpret_weather_forecast(weather_data):
    wd = weather_data[0]
    prompt = (
        f"Write a natural-sounding weather summary for location = {wd['location']}, country = {wd['country']}, with a high of temp_max = {wd['temp_max']}°C, "
        f"low of temp_min = {wd['temp_min']}°C, sunrise = {wd['sunrise']}, and sunset = {wd['sunset']}. "
        f"Keep it under 70 words, no bullet points, no repetition. Just one short paragraph."
    )

    client = openai.OpenAI(api_key=OPENAI_API_KEY)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    summary = response.choices[0].message.content.strip()
    
    return {
        'Summary': summary
    }

def get_ticketmaster_events(city_name, country_code, start_date, end_date):
    start_date = start_date.strftime('%Y-%m-%dT00:00:00Z')
    end_date = end_date.strftime('%Y-%m-%dT23:59:59Z')
    params = {
        'apikey': TM_API_KEY,
        'keyword': city_name,
        'countryCode': country_code,
        'startDateTime': start_date,
        'endDateTime': end_date,
        'size': 10
    }
    response = requests.get(BASE_URL_TM, params=params)
    data = response.json()

    events = data.get('_embedded', {}).get('events', [])
    if not events:
        print("No events found")
        return ["No events found"]

    return [
        {
            'name': event['name'],
            'date': event['dates']['start']['localDate'],
            'url': event.get('url', None)
        }
        for event in events
    ]