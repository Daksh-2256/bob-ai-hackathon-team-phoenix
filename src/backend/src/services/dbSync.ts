// ============================================================
// SupplyGuard AI — MongoDB Synchronization & Seeding Service
// ============================================================
import { state } from '../../../data/index';
import {
  shipments as defaultShipments,
  disruptions as defaultDisruptions,
  carriers as defaultCarriers,
  fleetAssets as defaultFleetAssets,
  routes as defaultRoutes,
  iotReadings as defaultIoTReadings,
  scenarios as defaultScenarios,
} from '../../../data/index';
import {
  ShipmentModel,
  DisruptionModel,
  CarrierModel,
  FleetAssetModel,
  RouteModel,
  IoTReadingModel,
  ScenarioModel,
} from '../models';
import { isDatabaseConnected } from '../config/db';

/**
 * Seeds the MongoDB collections with initial data if empty.
 */
export async function seedDatabase(force = false): Promise<void> {
  if (!isDatabaseConnected()) return;

  const shipmentCount = await ShipmentModel.countDocuments();
  if (shipmentCount > 0 && !force) {
    console.log(`[SupplyGuard AI] [MongoDB] Database already populated (${shipmentCount} shipments found).`);
    return;
  }

  if (force) {
    console.log('[SupplyGuard AI] [MongoDB] Force seeding: clearing existing collections...');
    await Promise.all([
      ShipmentModel.deleteMany({}),
      DisruptionModel.deleteMany({}),
      CarrierModel.deleteMany({}),
      FleetAssetModel.deleteMany({}),
      RouteModel.deleteMany({}),
      IoTReadingModel.deleteMany({}),
      ScenarioModel.deleteMany({}),
    ]);
  }

  console.log('[SupplyGuard AI] [MongoDB] Seeding database collections...');

  await Promise.all([
    ShipmentModel.insertMany(defaultShipments),
    DisruptionModel.insertMany(defaultDisruptions),
    CarrierModel.insertMany(defaultCarriers),
    FleetAssetModel.insertMany(defaultFleetAssets),
    RouteModel.insertMany(defaultRoutes),
    IoTReadingModel.insertMany(defaultIoTReadings),
    ScenarioModel.insertMany(defaultScenarios),
  ]);

  console.log(
    `[SupplyGuard AI] [MongoDB] Successfully seeded: ` +
      `${defaultShipments.length} shipments, ` +
      `${defaultDisruptions.length} disruptions, ` +
      `${defaultCarriers.length} carriers, ` +
      `${defaultFleetAssets.length} fleet assets, ` +
      `${defaultRoutes.length} routes, ` +
      `${defaultIoTReadings.length} IoT readings, ` +
      `${defaultScenarios.length} scenarios.`
  );
}

/**
 * Loads data from MongoDB into the mutable in-memory state object.
 */
export async function loadStateFromDB(): Promise<boolean> {
  if (!isDatabaseConnected()) return false;

  try {
    const [
      dbShipments,
      dbDisruptions,
      dbCarriers,
      dbFleetAssets,
      dbRoutes,
      dbIoTReadings,
      dbScenarios,
    ] = await Promise.all([
      ShipmentModel.find({}).lean(),
      DisruptionModel.find({}).lean(),
      CarrierModel.find({}).lean(),
      FleetAssetModel.find({}).lean(),
      RouteModel.find({}).lean(),
      IoTReadingModel.find({}).lean(),
      ScenarioModel.find({}).lean(),
    ]);

    if (dbShipments.length > 0) {
      state.shipments = dbShipments as any;
      state.disruptions = dbDisruptions as any;
      state.carriers = dbCarriers as any;
      state.fleetAssets = dbFleetAssets as any;
      state.routes = dbRoutes as any;
      state.iotReadings = dbIoTReadings as any;
      state.scenarios = dbScenarios as any;
      state.lastUpdated = new Date().toISOString();

      const active = (dbScenarios as any[]).find(s => s.isActive);
      state.activeScenarioId = active ? active.scenarioId : null;

      console.log(
        `[SupplyGuard AI] [MongoDB] In-memory state synchronized from MongoDB (${dbShipments.length} shipments).`
      );
      return true;
    }
    return false;
  } catch (err: any) {
    console.error('[SupplyGuard AI] [MongoDB] Error loading state from DB:', err.message);
    return false;
  }
}

/**
 * Persists a scenario activation or state change to MongoDB.
 */
export async function persistScenarioActivation(scenarioId: string): Promise<void> {
  if (!isDatabaseConnected()) return;

  try {
    // Update scenario active statuses
    await ScenarioModel.updateMany({}, { isActive: false });
    await ScenarioModel.updateOne({ scenarioId }, { isActive: true });

    // Sync updated disruptions
    for (const d of state.disruptions) {
      await DisruptionModel.updateOne({ id: d.id }, { status: d.status });
    }

    // Sync updated shipments
    for (const s of state.shipments) {
      await ShipmentModel.updateOne(
        { shipmentId: s.shipmentId },
        { status: s.status, delayHours: s.delayHours }
      );
    }
  } catch (err: any) {
    console.error('[SupplyGuard AI] [MongoDB] Error persisting scenario to DB:', err.message);
  }
}

/**
 * Persists a reset back to default in MongoDB.
 */
export async function persistReset(): Promise<void> {
  if (!isDatabaseConnected()) return;

  try {
    await seedDatabase(true);
  } catch (err: any) {
    console.error('[SupplyGuard AI] [MongoDB] Error resetting DB:', err.message);
  }
}
