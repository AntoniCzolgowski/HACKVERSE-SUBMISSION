/**
 * Campaign Storage Layer
 *
 * Currently uses localStorage (per-browser, per-session).
 * To switch to server-side persistence later, replace the
 * implementations below with API calls — no other code changes needed.
 */

const CAMPAIGNS_KEY = "campaign_history";
const CURRENT_KEY = "campaign_data";

export interface StoredCampaign {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
}

/** Save a campaign and set it as current. */
export function saveCampaign(data: Record<string, unknown>): StoredCampaign {
  const entry: StoredCampaign = {
    id: `campaign_${Date.now()}`,
    data,
    created_at: new Date().toISOString(),
  };

  // Save as current
  localStorage.setItem(CURRENT_KEY, JSON.stringify(data));

  // Append to history
  const history = getCampaignHistory();
  history.unshift(entry);
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(history.slice(0, 50)));

  return entry;
}

/** Get the current (most recent) campaign, or null. */
export function getCurrentCampaign(): Record<string, unknown> | null {
  const raw = localStorage.getItem(CURRENT_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Get all saved campaigns (newest first). */
export function getCampaignHistory(): StoredCampaign[] {
  const raw = localStorage.getItem(CAMPAIGNS_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Clear current campaign (new session feel). */
export function clearCurrentCampaign(): void {
  localStorage.removeItem(CURRENT_KEY);
}
