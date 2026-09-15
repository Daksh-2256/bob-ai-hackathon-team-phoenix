// ============================================================
// Tests: Copilot Engine
// ============================================================
import { resetState } from '../data/index';
import { processQuery, detectIntent } from '../intelligence/copilotEngine';

beforeEach(() => {
  resetState();
});

describe('detectIntent', () => {
  it('detects SPECIFIC_SHIPMENT intent for queries containing SHP-xxx', () => {
    expect(detectIntent('What is the status of SHP-001?')).toBe('SPECIFIC_SHIPMENT');
    expect(detectIntent('Tell me about SHP-042')).toBe('SPECIFIC_SHIPMENT');
  });

  it('detects COLD_CHAIN intent for temperature-related queries', () => {
    expect(detectIntent('What are the temperature excursions?')).toBe('COLD_CHAIN');
    expect(detectIntent('Show me cold chain status')).toBe('COLD_CHAIN');
  });

  it('detects FLEET intent for fleet-related queries', () => {
    expect(detectIntent('Show me idle trucks')).toBe('FLEET');
    expect(detectIntent('Which vessels can be redeployed?')).toBe('FLEET');
  });

  it('detects CARRIERS intent for carrier-related queries', () => {
    expect(detectIntent('Which carrier should replace the current one?')).toBe('CARRIERS');
    expect(detectIntent('Find an alternative carrier')).toBe('CARRIERS');
  });
});

describe('processQuery', () => {
  it('returns a response with a naturalLanguageAnswer string', () => {
    const response = processQuery('What disruptions are active?');
    expect(typeof response.naturalLanguageAnswer).toBe('string');
    expect(response.naturalLanguageAnswer.length).toBeGreaterThan(0);
  });

  it('returns a response with suggestedFollowUps array', () => {
    const response = processQuery('What disruptions are active?');
    expect(Array.isArray(response.suggestedFollowUps)).toBe(true);
  });

  it('returns a response with generatedAt timestamp', () => {
    const response = processQuery('What disruptions are active?');
    expect(response.generatedAt).toBeDefined();
    expect(new Date(response.generatedAt).toISOString()).toBe(response.generatedAt);
  });

  it('returns a response for "Which shipment has the highest risk?" with shipment data', () => {
    const response = processQuery('Which shipment has the highest risk?');
    expect(response.naturalLanguageAnswer.length).toBeGreaterThan(0);
    expect(response.data).toBeDefined();
  });

  it('returns a response for "Show me idle trucks" with fleet assets', () => {
    const response = processQuery('Show me idle trucks that can be redeployed');
    expect(response.intent).toBe('FLEET');
    expect(response.naturalLanguageAnswer.length).toBeGreaterThan(0);
    expect(response.data).toBeDefined();
  });

  it('returns a response for "Summarize today\'s situation" with operations brief data', () => {
    const response = processQuery("Summarize today's supply-chain situation");
    expect(response.intent).toBe('BRIEF');
    expect(response.data).toBeDefined();
    expect(response.naturalLanguageAnswer.length).toBeGreaterThan(0);
  });

  it('queries specific shipment SHP-001', () => {
    const response = processQuery('Why is SHP-001 at risk?');
    expect(response.intent).toBe('SPECIFIC_SHIPMENT');
    expect(response.data).toBeDefined();
  });

  it('returns an UNKNOWN intent response gracefully', () => {
    const response = processQuery('What is the weather like in Paris today?');
    expect(response.naturalLanguageAnswer.length).toBeGreaterThan(0);
    // Should still return a response, not throw
  });

  it('includes a query string in the response', () => {
    // The engine may normalize the query; we just check it's a non-empty string
    const response = processQuery('Which shipments are most at risk?');
    expect(typeof response.query).toBe('string');
    expect(response.query.length).toBeGreaterThan(0);
  });
});
