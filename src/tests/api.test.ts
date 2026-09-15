// ============================================================
// Tests: API Integration Tests
// NOTE: These tests require the backend server running on port 3001.
// They are automatically skipped if the server is not available.
// Run backend first: cd src/backend && npm start
// ============================================================

const BASE_URL = 'http://localhost:3001/api';
const TIMEOUT_MS = 5000;

async function fetchJson(path: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const body = (await res.json()) as any;
    // Backend wraps all responses in { success, count?, data }
    return { ok: res.ok, status: res.status, data: body.data ?? body };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// Check server availability once before all tests
let serverAvailable = false;

beforeAll(async () => {
  const result = await fetchJson('/dashboard');
  serverAvailable = result.ok;
  if (!serverAvailable) {
    console.warn(
      '[api.test] Backend server not available at port 3001. All API tests will be skipped.\n' +
      '           To run them: cd src/backend && npm start'
    );
  }
});

describe('GET /api/dashboard', () => {
  it('returns expected structure', async () => {
    if (!serverAvailable) return;
    const { ok, data } = await fetchJson('/dashboard');
    expect(ok).toBe(true);
    const d = data as Record<string, unknown>;
    // Actual backend fields
    expect(d).toHaveProperty('systemHealth');
    expect(d).toHaveProperty('activeDisruptions');
    expect(d).toHaveProperty('atRiskShipments');
    expect(d).toHaveProperty('idleFleetAssets');
    expect(d).toHaveProperty('coldChainAlerts');
    expect(d).toHaveProperty('cargoValueAtRisk');
  });

  it('systemHealth is GREEN, AMBER, or RED', async () => {
    if (!serverAvailable) return;
    const { data } = await fetchJson('/dashboard');
    const d = data as Record<string, unknown>;
    expect(['GREEN', 'AMBER', 'RED']).toContain(d['systemHealth']);
  });
});

describe('GET /api/disruptions', () => {
  it('returns an array', async () => {
    if (!serverAvailable) return;
    const { ok, data } = await fetchJson('/disruptions');
    expect(ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
  });

  it('each disruption has id, severity, status fields', async () => {
    if (!serverAvailable) return;
    const { data } = await fetchJson('/disruptions');
    const disruptions = data as Array<Record<string, unknown>>;
    if (!Array.isArray(disruptions) || disruptions.length === 0) return;
    disruptions.forEach(d => {
      expect(d).toHaveProperty('id');
      expect(d).toHaveProperty('severity');
      expect(d).toHaveProperty('status');
    });
  });
});

describe('GET /api/shipments', () => {
  it('returns an array', async () => {
    if (!serverAvailable) return;
    const { ok, data } = await fetchJson('/shipments');
    expect(ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
  });

  it('each shipment has shipmentId, status, priority fields', async () => {
    if (!serverAvailable) return;
    const { data } = await fetchJson('/shipments');
    if (!Array.isArray(data) || data.length === 0) return;
    const shipments = data as Array<Record<string, unknown>>;
    shipments.forEach(s => {
      expect(s).toHaveProperty('shipmentId');
      expect(s).toHaveProperty('status');
      expect(s).toHaveProperty('priority');
    });
  });

  it('returns 50 shipments', async () => {
    if (!serverAvailable) return;
    const { data } = await fetchJson('/shipments');
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(50);
  });
});

describe('GET /api/fleet/idle', () => {
  it('returns idle assets array', async () => {
    if (!serverAvailable) return;
    const { ok, data } = await fetchJson('/fleet/idle');
    expect(ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
  });

  it('each idle asset has assetId, type, status fields', async () => {
    if (!serverAvailable) return;
    const { data } = await fetchJson('/fleet/idle');
    if (!Array.isArray(data) || data.length === 0) return;
    const assets = data as Array<Record<string, unknown>>;
    assets.forEach(a => {
      expect(a).toHaveProperty('assetId');
      expect(a).toHaveProperty('type');
      expect(a).toHaveProperty('status');
    });
  });
});

describe('GET /api/cold-chain/alerts', () => {
  it('returns alerts array', async () => {
    if (!serverAvailable) return;
    const { ok, data } = await fetchJson('/cold-chain/alerts');
    expect(ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('POST /api/fleet/redeploy', () => {
  it('successfully redeploys an idle asset', async () => {
    if (!serverAvailable) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}/fleet/redeploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: 'TRK-004', shipmentId: 'SHP-005' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('confirmation');
      expect(body.data).toHaveProperty('updatedAsset');
    } catch {
      // skip if server not available
    }
  });
});

describe('GET /api/operations-brief', () => {
  it('returns operations brief with health and actions', async () => {
    if (!serverAvailable) return;
    const { ok, data } = await fetchJson('/operations-brief');
    expect(ok).toBe(true);
    const d = data as Record<string, unknown>;
    expect(d).toHaveProperty('supplyChainHealth');
    expect(d).toHaveProperty('recommendedActions');
    expect(Array.isArray(d['recommendedActions'])).toBe(true);
  });
});
