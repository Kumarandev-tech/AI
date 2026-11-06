/**
 * Service to interact with the Qoruz API for campaigns and creator discovery.
 */

const qoruzApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_QORUZ_API_URL) || 'https://api.qoruz.com/v1'
const qoruzApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_QORUZ_API_KEY) || ''

/**
 * Checks if the user's prompt is asking for their campaigns.
 */
export function isAskingForCampaigns(prompt) {
  if (!prompt || typeof prompt !== 'string') return false
  return /\b(my\s+campaigns?|our\s+campaigns?|active\s+campaigns?|show\s+campaigns?|list\s+campaigns?|fetch\s+campaigns?|view\s+campaigns?)\b/i.test(prompt)
}

/**
 * Fetches the user's campaigns from the Qoruz API.
 * Returns { success: boolean, campaigns?: Array, error?: string }
 */
export async function fetchUserCampaigns({ signal } = {}) {
  if (!qoruzApiKey.trim()) {
    return {
      success: false,
      error: 'Qoruz API key is not configured. Add VITE_QORUZ_API_KEY to your .env file to fetch your live campaigns.',
    }
  }

  try {
    const response = await fetch(`${qoruzApiUrl.replace(/\/+$/, '')}/campaigns`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qoruzApiKey.trim()}`,
        'x-api-key': qoruzApiKey.trim(),
      },
      signal,
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Qoruz API returned HTTP ${response.status} while fetching campaigns.`,
      }
    }

    const data = await response.json()
    const campaigns = Array.isArray(data) ? data : (data?.data || data?.campaigns || [])

    return {
      success: true,
      campaigns,
    }
  } catch (error) {
    if (signal?.aborted) throw error
    return {
      success: false,
      error: error.message || 'Could not connect to Qoruz API.',
    }
  }
}
