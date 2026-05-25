# Coffee Brew Inference Experiment — API Specification

> **Base URL:** `http://localhost:3000` (local dev)  
> **Authentication:** Open (no auth for experiment)  
> **Content-Type:** `application/json`

---

## Journey 1: "How?" — Query the Optimal Brew

### `GET /brewing-methods`
Returns all available brewing methods to populate the dropdown.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Pour Over",
    "description": "Hand-poured water over coffee grounds in a filter (V60, Chemex, etc.)",
    "default_ratio": 0.0625,
    "default_temp_c": 93,
    "default_brew_time_s": 210,
    "grind_size": "medium-fine"
  }
]
```

---

### `POST /recommend`
**User Question:** *"I have Colombian medium roast and want to use Pour Over — how should I brew it?"*

Returns AI-powered brew recommendation via DSPy inference.

**Request:**
```json
{
  "brewing_method_id": 1,
  "origin": "Colombia",
  "roast_level": "medium",
  "grind_size": "medium-fine",
  "water_temp_c": 93,
  "ratio": 0.0625,
  "brew_time_s": 210
}
```

**Response:**
```json
{
  "brewing_method": "Pour Over",
  "input": {
    "origin": "Colombia",
    "roast_level": "medium",
    "grind_size": "medium-fine",
    "water_temp_c": 93,
    "ratio": 0.0625,
    "brew_time_s": 210
  },
  "recommendation": "Good baseline. For brighter notes, try 90°C water and 1:17 ratio (0.0588). Slightly coarser grind can also help highlight floral notes.",
  "confidence": "high"
}
```

---

## Journey 2: "Real Experience" — Log & Validate

### `POST /brews`
**User Action:** *"I just brewed Colombian medium roast using Pour Over with these parameters — here's what I did and my rating."*

Logs a real-world brew experience.

**Request:**
```json
{
  "brewing_method_id": 1,
  "origin": "Colombia",
  "roast_level": "medium",
  "grind_size": "medium",
  "water_temp_c": 95,
  "ratio": 0.0625,
  "brew_time_s": 180,
  "rating": 4.0,
  "notes": "A bit bitter, extracted too fast"
}
```

**Response:**
```json
{
  "id": 1,
  "message": "Brew record added successfully"
}
```

---

### `GET /brews`
List all brew records (for browsing community experiences).

**Query Params:** `?limit=10&origin=Colombia&method=1`

**Response:**
```json
{
  "count": 42,
  "brews": [
    {
      "id": 1,
      "brewing_method": "Pour Over",
      "origin": "Colombia",
      "roast_level": "medium",
      "grind_size": "medium",
      "water_temp_c": 95,
      "ratio": 0.0625,
      "brew_time_s": 180,
      "rating": 4.0,
      "notes": "A bit bitter, extracted too fast",
      "created_at": "2026-05-25T10:30:00Z"
    }
  ]
}
```

---

### `GET /brews/:id/compare`
**User Question:** *"How did my brew compare to the AI recommendation?"*

Compares a logged brew against what the AI would have recommended.

**Response:**
```json
{
  "brew_id": 1,
  "user_brew": {
    "water_temp_c": 95,
    "ratio": 0.0625,
    "brew_time_s": 180,
    "grind_size": "medium",
    "rating": 4.0
  },
  "ai_recommendation": {
    "water_temp_c": 93,
    "ratio": 0.0588,
    "brew_time_s": 210,
    "grind_size": "medium-fine"
  },
  "analysis": "Your water was 2°C hotter and brew time 30s shorter than recommended. This likely caused the bitterness. Try lowering temp to 93°C and extending brew time to 210s.",
  "match_score": 0.75
}
```

---

## Summary of User Journeys

| Journey | Endpoint(s) | Purpose |
|---------|--------------|---------|
| **"How?"** | `GET /brewing-methods` → `POST /recommend` | Get AI brew recommendation |
| **"Real Experience"** | `POST /brews` → `GET /brews/:id/compare` | Log brew → validate against AI |

---

## Frontend Flow (Simple)

1. User selects brewing method → `GET /brewing-methods`
2. User fills in coffee details → clicks **"How should I brew this?"** → `POST /recommend`
3. User brews coffee in real life...
4. User logs what they did + rating → `POST /brews`
5. User clicks **"Compare to AI"** → `GET /brews/:id/compare`

---

*API spec created using Hermes Agent's `writing-plans` skill.*
