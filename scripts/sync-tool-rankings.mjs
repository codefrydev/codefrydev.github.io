/**
 * Pull tool_click counts from GA4 and write data/tool-rankings.json for Hugo.
 * Without GA4_PROPERTY_ID + GA4_SERVICE_ACCOUNT_JSON, writes disabled rankings (no homepage block).
 *
 * Run: npm run sync:rankings
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { parse as parseYaml } from 'yaml';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');
const OUT_PATH = resolve(root, 'data/tool-rankings.json');
const WINDOW_DAYS = parseInt(process.env.RANKINGS_WINDOW_DAYS || '30', 10);
const LOCALES = ['', 'ja', 'fr', 'hi'];
const HUB_FILES = ['games', 'ai', 'designlab', 'store'];

function writeDisabled(reason) {
  const payload = {
    enabled: false,
    source: 'disabled',
    reason: reason || 'not_configured',
    rankings: {},
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`[sync:rankings] disabled (${payload.reason}) → ${OUT_PATH}`);
}

function writeEnabled(rankings) {
  const keys = Object.keys(rankings);
  const payload = {
    enabled: keys.length > 0,
    generatedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    source: keys.length > 0 ? 'ga4' : 'disabled',
    reason: keys.length > 0 ? undefined : 'no_clicks',
    rankings,
  };
  if (payload.reason === undefined) delete payload.reason;
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  if (payload.enabled) {
    const top = keys
      .sort((a, b) => rankings[b] - rankings[a])
      .slice(0, 5)
      .map((url) => `${url} (${rankings[url]})`);
    console.log(`[sync:rankings] enabled: ${keys.length} tools, top 5: ${top.join(', ')}`);
  } else {
    console.log('[sync:rankings] no click data after join; section will be hidden');
  }
}

export function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const path = u.pathname.replace(/\/+$/, '') || '';
      return `${u.protocol}//${u.hostname.toLowerCase()}${path}`.toLowerCase();
    } catch {
      return trimmed.toLowerCase().replace(/\/+$/, '');
    }
  }

  const path = trimmed.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  return path ? `/${path}` : '/';
}

function loadYaml(relPath) {
  try {
    return parseYaml(readFileSync(resolve(root, relPath), 'utf8'));
  } catch {
    return null;
  }
}

export function buildNameToUrlMap() {
  const nameToUrl = new Map();

  function addItem(item) {
    if (!item || item.hidden) return;
    const url = normalizeUrl(item.url);
    if (!url || !item.name) return;
    nameToUrl.set(item.name, url);
  }

  for (const loc of LOCALES) {
    const prefix = loc ? `data/${loc}/` : 'data/';
    const home = loadYaml(`${prefix}home.yaml`);
    if (home?.categories) {
      for (const cat of home.categories) {
        for (const item of cat.items || []) addItem(item);
      }
    }
    for (const hub of HUB_FILES) {
      const hubData = loadYaml(`${prefix}${hub}.yaml`);
      for (const item of hubData?.data || []) addItem(item);
    }
  }

  return nameToUrl;
}

async function fetchGa4Rankings(nameToUrl) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credentialsJson = process.env.GA4_SERVICE_ACCOUNT_JSON;

  const credentials = JSON.parse(credentialsJson);
  const client = new BetaAnalyticsDataClient({ credentials });

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${WINDOW_DAYS}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'customEvent:tool_name' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'tool_click' },
      },
    },
    limit: 10000,
  });

  const rankings = {};
  for (const row of response.rows || []) {
    const toolName = row.dimensionValues?.[0]?.value;
    const count = parseInt(row.metricValues?.[0]?.value || '0', 10);
    if (!toolName || toolName === '(not set)' || count <= 0) continue;

    const url = nameToUrl.get(toolName);
    if (!url) continue;

    rankings[url] = (rankings[url] || 0) + count;
  }

  return rankings;
}

async function main() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credentialsJson = process.env.GA4_SERVICE_ACCOUNT_JSON;

  if (!propertyId || !credentialsJson) {
    writeDisabled('not_configured');
    return;
  }

  try {
    const nameToUrl = buildNameToUrlMap();
    const rankings = await fetchGa4Rankings(nameToUrl);
    writeEnabled(rankings);
  } catch (err) {
    console.warn('[sync:rankings] GA4 fetch failed:', err.message || err);
    writeDisabled('api_error');
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
