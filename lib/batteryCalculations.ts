// ─────────────────────────────────────────────────────────────────────────────
// Battery / Power System Calculator — Pure calculation logic
// UK commercial vehicle (coffee truck) focus — Victron Multiplus 2 systems
// Cable sizing per BS 7671:2018+A2:2022 (IET 18th Edition Wiring Regulations)
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApplianceItem {
  id: string;
  name: string;
  watts: number;
  hoursPerDay: number;
  enabled: boolean;
}

export type BatteryType = 'lifepo4' | 'agm';
export type SystemVoltage = 24 | 48;
export type UKRegion =
  | 'south_east'
  | 'south_west'
  | 'midlands'
  | 'north_england'
  | 'scotland'
  | 'wales'
  | 'northern_ireland';

export interface BatteryBankSpec {
  voltage: SystemVoltage;
  requiredAh: number;
  recommendedAh: number;
  batteryCount: number;
  label: string;
  estimatedWeightKg: number;
}

export interface BatteryResults {
  totalWhPerDay: number;
  peakLoadWatts: number;
  adjustedWh: number;
  bank24V: BatteryBankSpec;
  bank48V: BatteryBankSpec;
  multiplusModel24V: string;
  multiplusModel48V: string;
}

export interface SolarResults {
  peakSunHours: number;
  dailyOutputPerPanel: number;
  panelsNeeded: number;
  totalPanelWatts: number;
  mpptModel: string;
  mpptChargeAmps: number;
}

export interface AlternatorResults {
  dailyWhFromAlternator: number;
  b2bLabel: string;
}

export interface ChargingBalance {
  solarWh: number;
  alternatorWh: number;
  totalChargeWh: number;
  coveragePct: number;
}

export interface CableSpec {
  circuitName: string;
  loadAmps: number;
  cableRunMetres: number;
  minCableMm2: number;
  recommendedMm2: number;
  voltageDrop: number;
  voltageDropPct: number;
  fuseRatingAmps: number;
  fuseType: string;
  withinSpec: boolean;
}

export interface CableRunInputs {
  batteryToInverter: number;
  batteryToMppt: number;
  mpptToPanels: number;
  batteryToB2b: number;
  inverterToBoard: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOD: Record<BatteryType, number> = { lifepo4: 0.80, agm: 0.50 };
const INVERTER_EFFICIENCY = 0.93; // Victron Multiplus 2

// Standard LiFePO4 battery sizes (Ah) — common UK market sizes
const LIFEPO4_STANDARD_AH = [50, 100, 150, 200, 280, 300, 400];
// Standard AGM battery sizes (Ah)
const AGM_STANDARD_AH = [50, 75, 100, 110, 130, 200, 220];

// Weight estimates (kg per Ah, approximate)
const WEIGHT_KG_PER_AH: Record<BatteryType, Record<SystemVoltage, number>> = {
  lifepo4: { 24: 0.13, 48: 0.26 },  // ~13kg per 100Ah 12V cell pair
  agm:     { 24: 0.30, 48: 0.60 },  // ~30kg per 100Ah AGM
};

// UK BS 7671 copper cable data — resistance (mΩ/m) and free-air ampacity (A)
// Source: BS 7671:2018 Table 4D1A (thermoplastic insulated, clipped direct)
const CABLE_DATA = [
  { mm2: 6,  resistanceMohmPerM: 3.08,  ampacity: 50 },
  { mm2: 10, resistanceMohmPerM: 1.83,  ampacity: 70 },
  { mm2: 16, resistanceMohmPerM: 1.15,  ampacity: 95 },
  { mm2: 25, resistanceMohmPerM: 0.727, ampacity: 125 },
  { mm2: 35, resistanceMohmPerM: 0.524, ampacity: 150 },
  { mm2: 50, resistanceMohmPerM: 0.387, ampacity: 185 },
  { mm2: 70, resistanceMohmPerM: 0.268, ampacity: 230 },
];

// UK annual average peak sun hours by region (conservative, for sizing)
export const UK_PEAK_SUN_HOURS: Record<UKRegion, number> = {
  south_east:       3.7,
  south_west:       3.6,
  midlands:         3.2,
  north_england:    3.0,
  scotland:         2.7,
  wales:            3.0,
  northern_ireland: 2.9,
};

export const UK_REGION_LABELS: Record<UKRegion, string> = {
  south_east:       'South East',
  south_west:       'South West',
  midlands:         'Midlands',
  north_england:    'North England',
  scotland:         'Scotland',
  wales:            'Wales',
  northern_ireland: 'N. Ireland',
};

// Victron SmartSolar MPPT models: max PV voltage / max charge current (A)
const VICTRON_MPPT_MODELS = [
  { model: 'SmartSolar MPPT 75/15',   maxPVv: 75,  maxA: 15 },
  { model: 'SmartSolar MPPT 100/20',  maxPVv: 100, maxA: 20 },
  { model: 'SmartSolar MPPT 100/50',  maxPVv: 100, maxA: 50 },
  { model: 'SmartSolar MPPT 150/35',  maxPVv: 150, maxA: 35 },
  { model: 'SmartSolar MPPT 150/45',  maxPVv: 150, maxA: 45 },
  { model: 'SmartSolar MPPT 150/70',  maxPVv: 150, maxA: 70 },
  { model: 'SmartSolar MPPT 250/70',  maxPVv: 250, maxA: 70 },
  { model: 'SmartSolar MPPT 250/100', maxPVv: 250, maxA: 100 },
];

// Victron Multiplus-II model recommendations by peak load and voltage
// Format: [minWatts, label]
const MULTIPLUS_MODELS_24V: Array<[number, string]> = [
  [0,    'Multiplus-II 24/3000/70-32 (3kVA)'],
  [3001, 'Multiplus-II 24/5000/120-50 (5kVA)'],
];
const MULTIPLUS_MODELS_48V: Array<[number, string]> = [
  [0,    'Multiplus-II 48/3000/35-32 (3kVA)'],
  [3001, 'Multiplus-II 48/5000/70-50 (5kVA)'],
  [5001, 'Multiplus-II 48/8000/110-100 (8kVA)'],
  [8001, 'Multiplus-II 48/10000/140-100 (10kVA)'],
];

// Standard fuse ratings (A) — nearest standard size up
const STANDARD_FUSE_RATINGS = [15, 20, 25, 30, 40, 50, 60, 63, 80, 100, 125, 150, 160, 200, 250, 300, 400, 500];

// Victron Orion-Tr Smart B2B charger options
export type B2BModel = '12v_24v_30a' | '12v_24v_50a' | '24v_48v_16a' | '24v_24v_30a';
export const B2B_MODELS: Record<B2BModel, { label: string; outputAmps: number; outputVolts: SystemVoltage }> = {
  '12v_24v_30a': { label: 'Orion-Tr Smart 12→24V / 30A', outputAmps: 30, outputVolts: 24 },
  '12v_24v_50a': { label: 'Orion-Tr Smart 12→24V / 50A', outputAmps: 50, outputVolts: 24 },
  '24v_48v_16a': { label: 'Orion-Tr Smart 24→48V / 16A', outputAmps: 16, outputVolts: 48 },
  '24v_24v_30a': { label: 'Orion-Tr Smart 24→24V / 30A', outputAmps: 30, outputVolts: 24 },
};

// Default coffee truck appliances
export const DEFAULT_APPLIANCES: ApplianceItem[] = [
  { id: '1', name: 'Espresso Machine',      watts: 3500, hoursPerDay: 2.0, enabled: true },
  { id: '2', name: 'Coffee Grinder',        watts: 600,  hoursPerDay: 1.0, enabled: true },
  { id: '3', name: 'Commercial Fridge',     watts: 250,  hoursPerDay: 8.0, enabled: true },
  { id: '4', name: 'Milk Fridge',           watts: 150,  hoursPerDay: 8.0, enabled: true },
  { id: '5', name: 'Water Boiler',          watts: 2400, hoursPerDay: 0.5, enabled: true },
  { id: '6', name: 'EPOS / Card Terminal',  watts: 80,   hoursPerDay: 8.0, enabled: true },
  { id: '7', name: 'LED Lighting',          watts: 150,  hoursPerDay: 8.0, enabled: true },
  { id: '8', name: 'Extraction Fan',        watts: 120,  hoursPerDay: 6.0, enabled: true },
  { id: '9', name: 'Phone / Tablet Charge', watts: 60,   hoursPerDay: 8.0, enabled: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundUpToStandardAh(requiredAh: number, sizes: number[]): number {
  for (const size of sizes) {
    if (size >= requiredAh) return size;
  }
  // Larger than biggest standard — round up to nearest 100Ah
  return Math.ceil(requiredAh / 100) * 100;
}

function roundUpToStandardFuse(amps: number): number {
  for (const rating of STANDARD_FUSE_RATINGS) {
    if (rating >= amps) return rating;
  }
  return Math.ceil(amps / 100) * 100;
}

function fuseType(amps: number): string {
  if (amps <= 30)  return 'ATO/ATC blade';
  if (amps <= 100) return 'MIDI inline';
  return 'ANL / MEGA inline';
}

// ── Exported Calculation Functions ────────────────────────────────────────────

/**
 * Calculate battery bank requirements.
 * Returns specs for both 24V and 48V so the UI can show both simultaneously.
 */
export function calcBatteryRequirements(
  appliances: ApplianceItem[],
  batteryType: BatteryType,
  daysAutonomy: number,
): BatteryResults {
  const enabledAppliances = appliances.filter((a) => a.enabled);
  const totalWhPerDay = enabledAppliances.reduce((sum, a) => sum + a.watts * a.hoursPerDay, 0);
  const peakLoadWatts = enabledAppliances.reduce((sum, a) => sum + a.watts, 0);

  // Account for inverter losses and autonomy
  const adjustedWh = (totalWhPerDay * daysAutonomy) / INVERTER_EFFICIENCY;

  const dod = DOD[batteryType];
  const standardSizes = batteryType === 'lifepo4' ? LIFEPO4_STANDARD_AH : AGM_STANDARD_AH;

  function buildBankSpec(voltage: SystemVoltage): BatteryBankSpec {
    const requiredAh = adjustedWh / voltage / dod;
    const recommendedAh = roundUpToStandardAh(requiredAh, standardSizes);
    const batteryCount = Math.ceil(requiredAh / recommendedAh) || 1;

    // How many standard-size batteries needed
    const singleBatteryAh = recommendedAh;
    const numBatteries = Math.ceil(requiredAh / singleBatteryAh);
    const totalAh = numBatteries * singleBatteryAh;

    const typeLabel = batteryType === 'lifepo4' ? 'LiFePO4' : 'AGM';
    const label = `${numBatteries}× ${singleBatteryAh}Ah ${typeLabel} @ ${voltage}V`;
    const estimatedWeightKg = Math.round(totalAh * WEIGHT_KG_PER_AH[batteryType][voltage]);

    return {
      voltage,
      requiredAh: Math.round(requiredAh),
      recommendedAh: totalAh,
      batteryCount: numBatteries,
      label,
      estimatedWeightKg,
    };
  }

  return {
    totalWhPerDay,
    peakLoadWatts,
    adjustedWh: Math.round(adjustedWh),
    bank24V: buildBankSpec(24),
    bank48V: buildBankSpec(48),
    multiplusModel24V: recommendMultiplus2(peakLoadWatts, 24),
    multiplusModel48V: recommendMultiplus2(peakLoadWatts, 48),
  };
}

/**
 * Recommend a Victron Multiplus-II model based on peak AC load and system voltage.
 */
export function recommendMultiplus2(peakLoadWatts: number, voltage: SystemVoltage): string {
  const models = voltage === 24 ? MULTIPLUS_MODELS_24V : MULTIPLUS_MODELS_48V;
  let selected = models[0][1];
  for (const [minW, model] of models) {
    if (peakLoadWatts >= minW) selected = model;
  }
  return selected;
}

/**
 * Calculate solar panel requirements.
 * Uses UK regional peak sun hours and 85% system efficiency factor.
 */
export function calcSolarRequirements(
  adjustedWhPerDay: number,
  region: UKRegion,
  panelWatts: number,
  systemVoltage: SystemVoltage,
): SolarResults {
  const peakSunHours = UK_PEAK_SUN_HOURS[region];
  const solarEfficiency = 0.85; // MPPT + wiring + temperature losses
  const dailyOutputPerPanel = panelWatts * peakSunHours * solarEfficiency;
  const panelsNeeded = Math.ceil(adjustedWhPerDay / dailyOutputPerPanel);
  const totalPanelWatts = panelsNeeded * panelWatts;
  const mpptChargeAmps = totalPanelWatts / systemVoltage;

  // Select smallest MPPT that can handle the charge current
  const mppt = VICTRON_MPPT_MODELS.find((m) => m.maxA >= mpptChargeAmps)
    ?? VICTRON_MPPT_MODELS[VICTRON_MPPT_MODELS.length - 1];

  return {
    peakSunHours,
    dailyOutputPerPanel: Math.round(dailyOutputPerPanel),
    panelsNeeded,
    totalPanelWatts,
    mpptModel: mppt.model,
    mpptChargeAmps: Math.round(mpptChargeAmps),
  };
}

/**
 * Calculate daily energy contribution from alternator via B2B charger.
 */
export function calcAlternatorCharging(
  b2bModel: B2BModel,
  chargingHoursPerDay: number,
): AlternatorResults {
  const b2b = B2B_MODELS[b2bModel];
  // Output power = output amps × output voltage
  const outputWatts = b2b.outputAmps * b2b.outputVolts;
  const dailyWhFromAlternator = outputWatts * chargingHoursPerDay * 0.95; // 95% efficiency
  return {
    dailyWhFromAlternator: Math.round(dailyWhFromAlternator),
    b2bLabel: b2b.label,
  };
}

/**
 * Calculate charging balance — what percentage of daily load is covered by solar + alternator.
 */
export function calcChargingBalance(
  adjustedWhPerDay: number,
  solarResults: SolarResults,
  alternatorResults: AlternatorResults,
): ChargingBalance {
  const solarWh = solarResults.dailyOutputPerPanel * solarResults.panelsNeeded;
  const alternatorWh = alternatorResults.dailyWhFromAlternator;
  const totalChargeWh = solarWh + alternatorWh;
  const coveragePct = adjustedWhPerDay > 0 ? Math.min((totalChargeWh / adjustedWhPerDay) * 100, 999) : 0;
  return {
    solarWh: Math.round(solarWh),
    alternatorWh: Math.round(alternatorWh),
    totalChargeWh: Math.round(totalChargeWh),
    coveragePct: Math.round(coveragePct),
  };
}

/**
 * Calculate cable and fuse specification for a DC circuit.
 * Follows BS 7671:2018+A2:2022 — max 5% voltage drop for final circuits.
 *
 * @param circuitName   Human-readable circuit name
 * @param loadWatts     Maximum continuous load in watts
 * @param systemVoltage DC bus voltage (24V or 48V)
 * @param cableRunMetres One-way cable run length in metres
 */
export function calcCableSpec(
  circuitName: string,
  loadWatts: number,
  systemVoltage: SystemVoltage,
  cableRunMetres: number,
): CableSpec {
  const loadAmps = loadWatts / systemVoltage;
  const maxVDropVolts = systemVoltage * 0.05; // 5% BS 7671 limit

  // Find minimum cable that satisfies BOTH ampacity AND voltage drop constraints
  let selected = CABLE_DATA[CABLE_DATA.length - 1]; // default to largest
  let minSelected = CABLE_DATA[CABLE_DATA.length - 1];
  let minSet = false;

  for (const cable of CABLE_DATA) {
    // Voltage drop: VD = I × R × 2L / 1000  (factor 2 for return conductor, R in mΩ/m)
    const vDrop = (loadAmps * cable.resistanceMohmPerM * 2 * cableRunMetres) / 1000;

    if (cable.ampacity >= loadAmps && !minSet) {
      minSelected = cable;
      minSet = true;
    }

    if (cable.ampacity >= loadAmps && vDrop <= maxVDropVolts) {
      selected = cable;
      break; // first cable that satisfies both constraints
    }
  }

  const vDrop = (loadAmps * selected.resistanceMohmPerM * 2 * cableRunMetres) / 1000;
  const vDropPct = systemVoltage > 0 ? (vDrop / systemVoltage) * 100 : 0;

  const fuseAmps = roundUpToStandardFuse(loadAmps * 1.05); // 5% headroom
  const fType = fuseType(fuseAmps);

  return {
    circuitName,
    loadAmps: Math.round(loadAmps * 10) / 10,
    cableRunMetres,
    minCableMm2: minSelected.mm2,
    recommendedMm2: selected.mm2,
    voltageDrop: Math.round(vDrop * 100) / 100,
    voltageDropPct: Math.round(vDropPct * 10) / 10,
    fuseRatingAmps: fuseAmps,
    fuseType: fType,
    withinSpec: vDropPct <= 5,
  };
}

/**
 * Build all cable specs for standard circuits given cable run inputs.
 */
export function calcAllCableSpecs(
  batteryResults: BatteryResults,
  solarResults: SolarResults,
  systemVoltage: SystemVoltage,
  runs: CableRunInputs,
  b2bModel: B2BModel,
): CableSpec[] {
  const bank = systemVoltage === 24 ? batteryResults.bank24V : batteryResults.bank48V;
  const b2b = B2B_MODELS[b2bModel];
  const b2bWatts = b2b.outputAmps * b2b.outputVolts;

  // Inverter continuous draw at battery voltage (peak load ÷ inverter efficiency)
  const inverterBatteryAmps = batteryResults.peakLoadWatts / INVERTER_EFFICIENCY;
  const inverterWatts = inverterBatteryAmps * systemVoltage;

  const specs: CableSpec[] = [];

  if (runs.batteryToInverter > 0) {
    specs.push(calcCableSpec('Battery → Inverter (DC)', inverterWatts, systemVoltage, runs.batteryToInverter));
  }
  if (runs.batteryToMppt > 0) {
    const mpptWatts = solarResults.totalPanelWatts;
    specs.push(calcCableSpec('Battery → MPPT (DC out)', mpptWatts, systemVoltage, runs.batteryToMppt));
  }
  if (runs.mpptToPanels > 0) {
    // PV cable — use system voltage as proxy (actual Voc higher, but sizing conservatively)
    specs.push(calcCableSpec('MPPT → Solar Array (PV)', solarResults.totalPanelWatts, systemVoltage, runs.mpptToPanels));
  }
  if (runs.batteryToB2b > 0) {
    specs.push(calcCableSpec('Battery → B2B Charger', b2bWatts, systemVoltage, runs.batteryToB2b));
  }
  if (runs.inverterToBoard > 0) {
    // AC side — 230V, treat amps differently
    const acAmps = batteryResults.peakLoadWatts / 230;
    // For AC cable at 230V we'd use a different table, so flag this as AC
    specs.push({
      circuitName: 'Inverter AC → Distribution Board',
      loadAmps: Math.round(acAmps * 10) / 10,
      cableRunMetres: runs.inverterToBoard,
      minCableMm2: acAmps <= 20 ? 2.5 : acAmps <= 32 ? 4 : 6,
      recommendedMm2: acAmps <= 20 ? 2.5 : acAmps <= 32 ? 4 : 6,
      voltageDrop: 0,
      voltageDropPct: 0,
      fuseRatingAmps: roundUpToStandardFuse(acAmps),
      fuseType: acAmps <= 32 ? 'MCB (BS EN 60898)' : 'MCCB',
      withinSpec: true,
    });
  }

  return specs;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatWh(wh: number): string {
  if (wh >= 1000) return `${(wh / 1000).toFixed(1)} kWh`;
  return `${Math.round(wh)} Wh`;
}

export function formatAmps(a: number): string {
  return `${a.toFixed(1)}A`;
}
