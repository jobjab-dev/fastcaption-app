import requests
import json

url = "http://localhost:3000/api/v1/transcribe"
api_key = "fc-test-key-123"
audio_file = r"d:\tiktok\scene_gen\mp3\test_5s.mp3"

print("Sending request to:", url)
with open(audio_file, "rb") as f:
    files = {"audio": ("test_5s.mp3", f, "audio/mpeg")}
    data = {
        "mode": "transcribe",
        "language": "th",
        "timestampMode": "chunk"
    }
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    response = requests.post(url, headers=headers, files=files, data=data)

print(f"Status: {response.status_code}")
try:
    resp_json = response.json()
    print(json.dumps(resp_json, indent=2, ensure_ascii=False))
except Exception as e:
    print("Response text:", response.text)
