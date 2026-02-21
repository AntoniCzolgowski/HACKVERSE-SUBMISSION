"""
Campaign Storage Service
Handles storing and retrieving published campaign data
"""
import json
import os
from pathlib import Path
from datetime import datetime

STORAGE_DIR = Path(__file__).parent.parent / "data" / "campaigns"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def save_campaign(campaign_data: dict) -> str:
    """
    Save a campaign to storage.
    Returns the campaign ID.
    """
    # Generate campaign ID from product name and timestamp
    product_name = campaign_data.get("product", {}).get("name", "campaign")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    campaign_id = f"{product_name.lower().replace(' ', '_')}_{timestamp}"

    # Add metadata
    campaign_data["campaign_id"] = campaign_id
    campaign_data["created_at"] = datetime.now().isoformat()

    # Save to file
    file_path = STORAGE_DIR / f"{campaign_id}.json"
    with open(file_path, "w") as f:
        json.dump(campaign_data, f, indent=2)

    # Also save as "latest" for easy retrieval
    latest_path = STORAGE_DIR / "latest.json"
    with open(latest_path, "w") as f:
        json.dump(campaign_data, f, indent=2)

    return campaign_id

def get_latest_campaign() -> dict | None:
    """
    Get the most recently saved campaign.
    """
    latest_path = STORAGE_DIR / "latest.json"
    if not latest_path.exists():
        return None

    with open(latest_path, "r") as f:
        return json.load(f)

def get_campaign(campaign_id: str) -> dict | None:
    """
    Get a specific campaign by ID.
    """
    file_path = STORAGE_DIR / f"{campaign_id}.json"
    if not file_path.exists():
        return None

    with open(file_path, "r") as f:
        return json.load(f)

def list_campaigns() -> list[dict]:
    """
    List all campaigns (metadata only).
    """
    campaigns = []
    for file_path in STORAGE_DIR.glob("*.json"):
        if file_path.name == "latest.json":
            continue
        with open(file_path, "r") as f:
            data = json.load(f)
            campaigns.append({
                "campaign_id": data.get("campaign_id"),
                "product_name": data.get("product", {}).get("name"),
                "created_at": data.get("created_at"),
                "total_posts": len(data.get("published_posts", []))
            })
    return sorted(campaigns, key=lambda x: x["created_at"], reverse=True)
