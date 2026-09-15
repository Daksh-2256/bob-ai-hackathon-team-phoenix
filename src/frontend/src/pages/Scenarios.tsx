import { useState, useEffect, useCallback } from 'react';
import { Ship, CloudRain, Thermometer, Anchor, Zap, Play, RotateCcw, CheckCircle } from 'lucide-react';
import { getScenarios, activateScenario, resetScenario } from '../api/client';
import type { DemoScenario } from '../../../shared/types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import PageHeader from '../components/ui/PageHeader';

const SCENARIO_META: Record<string, { icon: React.ReactNode; color: string; borderColor: string; activeBg: string }> = {
  'PORT_STRIKE':        { icon: <Ship className="w-6 h-6" />,        color: 'text-blue-600',   borderColor: 'border-blue-200',  activeBg: 'bg-blue-50' },
  'SEVERE_WEATHER':     { icon: <CloudRain className="w-6 h-6" />,   color: 'text-indigo-600', borderColor: 'border-indigo-200',activeBg: 'bg-indigo-50' },
  'COLD_CHAIN_CRISIS':  { icon: <Thermometer className="w-6 h-6" />, color: 'text-cyan-600',   borderColor: 'border-cyan-200',  activeBg: 'bg-cyan-50' },
  'CARRIER_LOSS':       { icon: <Anchor className="w-6 h-6" />,      color: 'text-orange-600', borderColor: 'border-orange-200',activeBg: 'bg-orange-50' },
  'COMBINED_CRISIS':    { icon: <Zap className="w-6 h-6" />,         color: 'text-red-600',    borderColor: 'border-red-200',   activeBg: 'bg-red-50' },
};

function getScenarioMeta(id: string) {
  // Try matching by partial id
  const key = Object.keys(SCENARIO_META).find(k => id.toUpperCase().includes(k));
  return SCENARIO_META[key ?? ''] ?? {
    icon: <Play className="w-6 h-6" />,
    color: 'text-gray-600',
    borderColor: 'border-gray-200',
    activeBg: 'bg-gray-50',
  };
}

interface ActivationResult {
  scenarioId: string;
  message: string;
  changes: { disruptionsActivated: number; shipmentsAffected: number; assetsRedeployed: number };
}

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<ActivationResult | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await getScenarios();
      setScenarios(d);
    } catch {
      setError('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id: string) => {
    try {
      setActivating(id);
      setResult(null);
      const res = await activateScenario(id);
      setActiveScenarioId(id);
      setResult({ scenarioId: id, message: res.message, changes: res.changes });
    } catch {
      setError('Failed to activate scenario');
    } finally {
      setActivating(null);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      setResult(null);
      await resetScenario();
      setActiveScenarioId(null);
    } catch {
      setError('Failed to reset state');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading scenarios..." />;
  if (error && scenarios.length === 0) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Demo Scenarios"
        description="Activate pre-configured supply chain disruption scenarios to showcase SupplyGuard AI capabilities"
      >
        <button
          onClick={handleReset}
          disabled={resetting || !activeScenarioId}
          className="flex items-center gap-1.5 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          Reset to Default
        </button>
      </PageHeader>

      {/* Activation result banner */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">{result.message}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-green-800">
                <span>✓ {result.changes.disruptionsActivated} disruptions activated</span>
                <span>✓ {result.changes.shipmentsAffected} shipments affected</span>
                {result.changes.assetsRedeployed > 0 && (
                  <span>✓ {result.changes.assetsRedeployed} assets redeployed</span>
                )}
              </div>
              <p className="mt-2 text-xs text-green-700">
                Navigate to the Dashboard or Disruptions page to see the changes in effect.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scenario cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {scenarios.map(scenario => {
          const meta = getScenarioMeta(scenario.scenarioId);
          const isActive = activeScenarioId === scenario.scenarioId;
          const isActivating = activating === scenario.scenarioId;

          return (
            <div
              key={scenario.scenarioId}
              className={`bg-white rounded-xl border-2 shadow-sm transition-all ${
                isActive
                  ? `${meta.borderColor} ${meta.activeBg}`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-xl ${meta.activeBg || 'bg-gray-50'} ${meta.color}`}>
                    {meta.icon}
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-200 rounded-full px-2.5 py-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      ACTIVE
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1.5">{scenario.name}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{scenario.description}</p>

                {/* Impact summary */}
                <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200">
                    <span className="font-semibold text-orange-600">{scenario.activateDisruptions.length}</span>
                    <span>disruptions</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200">
                    <span className="font-semibold text-blue-600">{scenario.affectedShipments.length}</span>
                    <span>shipments</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200">
                    <span className="font-semibold text-gray-700">{scenario.durationMinutes}min</span>
                    <span>duration</span>
                  </div>
                </div>

                {/* Expected actions */}
                {scenario.expectedActions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Expected Actions</p>
                    <ul className="space-y-1">
                      {scenario.expectedActions.slice(0, 3).map((action, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-gray-400 flex-shrink-0 mt-0.5">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                      {scenario.expectedActions.length > 3 && (
                        <li className="text-xs text-gray-400">
                          +{scenario.expectedActions.length - 3} more actions
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {scenario.triggerColdChainEvents && (
                  <p className="text-xs text-blue-600 mb-4 flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    Triggers cold chain temperature events
                  </p>
                )}

                <button
                  onClick={() => handleActivate(scenario.scenarioId)}
                  disabled={isActivating || !!activating}
                  className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isActive ? (
                    <><CheckCircle className="w-4 h-4" /> Activated</>
                  ) : isActivating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <><Play className="w-3.5 h-3.5" /> Activate Scenario</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {scenarios.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">No scenarios available</div>
      )}
    </div>
  );
}
