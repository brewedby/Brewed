import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DEFAULT_APPLIANCES,
  UK_PEAK_SUN_HOURS,
  UK_REGION_LABELS,
  B2B_MODELS,
  calcBatteryRequirements,
  calcSolarRequirements,
  calcAlternatorCharging,
  calcChargingBalance,
  calcAllCableSpecs,
  formatWh,
  type ApplianceItem,
  type BatteryType,
  type SystemVoltage,
  type UKRegion,
  type B2BModel,
  type CableRunInputs,
} from '@/lib/batteryCalculations';
import { ApplianceRow } from '@/components/battery/ApplianceRow';
import { ResultCard } from '@/components/battery/ResultCard';
import { CableRow } from '@/components/battery/CableRow';

// ── Helpers ───────────────────────────────────────────────────────────────────

let _nextId = 100;
function nextId() {
  return String(++_nextId);
}

const UK_REGIONS = Object.keys(UK_PEAK_SUN_HOURS) as UKRegion[];

const PANEL_SIZES = [200, 400, 450] as const;

const TABS = ['Load', 'Batteries', 'Solar', 'Cables', 'Summary'] as const;
type TabName = (typeof TABS)[number];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1 mb-1.5">
      {title}
    </Text>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-amber-50 border border-amber-100 rounded-xl p-3">
      <Text className="text-amber-800 text-xs leading-4">{children}</Text>
    </View>
  );
}

function SegmentControl<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[];
  labels?: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-2 flex-wrap">
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          className={`px-4 py-2 rounded-full border ${
            value === opt
              ? 'bg-stone-900 border-stone-900'
              : 'bg-white border-stone-200'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              value === opt ? 'text-white' : 'text-stone-600'
            }`}
          >
            {labels ? labels[opt] : opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  suffix?: string;
}) {
  return (
    <View>
      <Text className="text-stone-600 text-sm font-semibold mb-2">{label}</Text>
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center"
        >
          <Text className="text-stone-700 text-lg font-bold">−</Text>
        </TouchableOpacity>
        <Text className="text-stone-900 text-xl font-bold min-w-8 text-center">
          {value}{suffix}
        </Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center"
        >
          <Text className="text-stone-700 text-lg font-bold">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View className="flex-row justify-between items-center py-1.5 border-b border-stone-50">
      <Text className="text-stone-500 text-sm">{label}</Text>
      <View className="items-end">
        <Text className="text-stone-800 text-sm font-semibold">{value}</Text>
        {sub && <Text className="text-stone-400 text-xs">{sub}</Text>}
      </View>
    </View>
  );
}

// ── Cable run input row ───────────────────────────────────────────────────────

function CableRunInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-stone-600 text-sm flex-1 pr-3">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        <TextInput
          value={value > 0 ? String(value) : ''}
          onChangeText={(t) => onChange(parseFloat(t) || 0)}
          keyboardType="decimal-pad"
          className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-800 w-16 text-right"
          placeholder="0"
          placeholderTextColor="#a8a29e"
        />
        <Text className="text-stone-400 text-sm w-5">m</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BatteryCalculatorScreen() {
  const insets = useSafeAreaInsets();

  // ── Shared state ────────────────────────────────────────────────────────────
  const [appliances, setAppliances] = useState<ApplianceItem[]>(DEFAULT_APPLIANCES);
  const [batteryType, setBatteryType] = useState<BatteryType>('lifepo4');
  const [systemVoltage, setSystemVoltage] = useState<SystemVoltage>(48);
  const [daysAutonomy, setDaysAutonomy] = useState(1);
  const [region, setRegion] = useState<UKRegion>('south_east');
  const [panelWatts, setPanelWatts] = useState<number>(400);
  const [customPanelWatts, setCustomPanelWatts] = useState('');
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [b2bModel, setB2bModel] = useState<B2BModel>('12v_24v_30a');
  const [drivingHours, setDrivingHours] = useState(3);
  const [cableRuns, setCableRuns] = useState<CableRunInputs>({
    batteryToInverter: 2,
    batteryToMppt: 2,
    mpptToPanels: 5,
    batteryToB2b: 2,
    inverterToBoard: 1,
  });
  const [activeTab, setActiveTab] = useState<TabName>('Load');

  // ── Derived calculations ─────────────────────────────────────────────────
  const batteryResults = calcBatteryRequirements(appliances, batteryType, daysAutonomy);
  const solarResults = calcSolarRequirements(
    batteryResults.adjustedWh,
    region,
    panelWatts,
    systemVoltage,
  );
  const alternatorResults = calcAlternatorCharging(b2bModel, drivingHours);
  const chargingBalance = calcChargingBalance(
    batteryResults.adjustedWh,
    solarResults,
    alternatorResults,
  );
  const cableSpecs = calcAllCableSpecs(
    batteryResults,
    solarResults,
    systemVoltage,
    cableRuns,
    b2bModel,
  );
  const selectedBank = systemVoltage === 24 ? batteryResults.bank24V : batteryResults.bank48V;
  const multiplusModel = systemVoltage === 24 ? batteryResults.multiplusModel24V : batteryResults.multiplusModel48V;

  // ── Appliance helpers ────────────────────────────────────────────────────
  function updateAppliance(id: string, updated: ApplianceItem) {
    setAppliances((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }

  function deleteAppliance(id: string) {
    setAppliances((prev) => prev.filter((a) => a.id !== id));
  }

  function addAppliance() {
    setAppliances((prev) => [
      ...prev,
      { id: nextId(), name: '', watts: 0, hoursPerDay: 1, enabled: true },
    ]);
  }

  // ── Cable run helper ─────────────────────────────────────────────────────
  function updateRun(key: keyof CableRunInputs, value: number) {
    setCableRuns((prev) => ({ ...prev, [key]: value }));
  }

  // ── Tab content ──────────────────────────────────────────────────────────

  function renderLoadTab() {
    const totalWh = batteryResults.totalWhPerDay;
    const enabledCount = appliances.filter((a) => a.enabled).length;

    return (
      <View className="gap-3">
        <InfoBox>
          Enter all appliances that run from the inverter. Toggle off items you don't
          currently use — they stay saved but won't affect calculations.
        </InfoBox>

        {appliances.map((item) => (
          <ApplianceRow
            key={item.id}
            item={item}
            onChange={(updated) => updateAppliance(item.id, updated)}
            onDelete={() => deleteAppliance(item.id)}
          />
        ))}

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={addAppliance}
            className="flex-1 border-2 border-dashed border-stone-300 rounded-xl py-3 items-center"
          >
            <Text className="text-stone-500 text-sm font-medium">+ Add appliance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAppliances(DEFAULT_APPLIANCES)}
            className="border border-stone-200 bg-white rounded-xl py-3 px-4 items-center"
          >
            <Text className="text-stone-500 text-sm">Reset defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Total summary bar */}
        <View className="bg-stone-900 rounded-2xl p-4 flex-row justify-between items-center">
          <View>
            <Text className="text-stone-400 text-xs">{enabledCount} appliances active</Text>
            <Text className="text-white text-2xl font-bold">{formatWh(totalWh)}</Text>
            <Text className="text-stone-400 text-xs">per day</Text>
          </View>
          <View className="items-end">
            <Text className="text-stone-400 text-xs">Peak load</Text>
            <Text className="text-amber-400 text-lg font-bold">
              {batteryResults.peakLoadWatts.toLocaleString()} W
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function renderBatteryTab() {
    return (
      <View className="gap-4">
        {/* System voltage */}
        <View>
          <SectionHeader title="System Voltage" />
          <SegmentControl<SystemVoltage>
            options={[24, 48]}
            labels={{ 24: '24V', 48: '48V' }}
            value={systemVoltage}
            onChange={setSystemVoltage}
          />
          <Text className="text-stone-400 text-xs mt-1.5">
            48V is recommended for loads above 3kW — lower current, smaller cables.
          </Text>
        </View>

        {/* Battery type */}
        <View>
          <SectionHeader title="Battery Chemistry" />
          <SegmentControl<BatteryType>
            options={['lifepo4', 'agm']}
            labels={{ lifepo4: 'LiFePO4', agm: 'AGM' }}
            value={batteryType}
            onChange={setBatteryType}
          />
          <Text className="text-stone-400 text-xs mt-1.5">
            LiFePO4: 80% usable DoD, longer cycle life, lighter.
            AGM: 50% usable DoD, lower upfront cost.
          </Text>
        </View>

        {/* Days autonomy */}
        <View>
          <SectionHeader title="Days Autonomy" />
          <Stepper
            label="Run without charging for:"
            value={daysAutonomy}
            min={1}
            max={7}
            onChange={setDaysAutonomy}
            suffix={daysAutonomy === 1 ? ' day' : ' days'}
          />
        </View>

        {/* Adjusted Wh */}
        <View className="bg-stone-50 rounded-xl p-3 border border-stone-100 gap-1">
          <MetricRow
            label="Raw daily load"
            value={formatWh(batteryResults.totalWhPerDay)}
          />
          <MetricRow
            label="Autonomy factor"
            value={`× ${daysAutonomy}`}
          />
          <MetricRow
            label="Inverter efficiency"
            value="÷ 93% (Victron Multiplus 2)"
          />
          <View className="border-t border-stone-200 mt-1 pt-1">
            <MetricRow
              label="Bank must store"
              value={formatWh(batteryResults.adjustedWh)}
            />
          </View>
        </View>

        {/* Result cards */}
        <View>
          <SectionHeader title="Battery Bank Required" />
          <View className="flex-row gap-3">
            <ResultCard spec={batteryResults.bank24V} isSelected={systemVoltage === 24} />
            <ResultCard spec={batteryResults.bank48V} isSelected={systemVoltage === 48} />
          </View>
        </View>

        {/* Inverter recommendation */}
        <View>
          <SectionHeader title="Inverter / Charger" />
          <View className="bg-white rounded-xl border border-stone-100 p-4 gap-1">
            <Text className="text-stone-400 text-xs">Recommended Victron Multiplus-II</Text>
            <Text className="text-stone-800 text-sm font-semibold">{multiplusModel}</Text>
            <Text className="text-stone-400 text-xs mt-1">
              Based on {systemVoltage}V system and {batteryResults.peakLoadWatts.toLocaleString()}W peak load
            </Text>
          </View>
        </View>

        {/* LiFePO4 BMS note */}
        {batteryType === 'lifepo4' && (
          <View className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <Text className="text-blue-800 text-xs font-semibold mb-0.5">LiFePO4 — BMS Required</Text>
            <Text className="text-blue-700 text-xs">
              Ensure your Victron system is configured for lithium (VE.Bus). Use a
              compatible BMS with charge/discharge relay or Victron DVCC (Distributed
              Voltage and Current Control) enabled.
            </Text>
          </View>
        )}

        {batteryType === 'agm' && (
          <View className="bg-orange-50 border border-orange-100 rounded-xl p-3">
            <Text className="text-orange-800 text-xs font-semibold mb-0.5">AGM — Ventilation Required</Text>
            <Text className="text-orange-700 text-xs">
              AGM batteries emit hydrogen gas during charging. Install adequate ventilation
              in the battery compartment. Do not install in a sealed enclosure.
            </Text>
          </View>
        )}
      </View>
    );
  }

  function renderSolarTab() {
    return (
      <View className="gap-4">
        {/* UK Region */}
        <View>
          <SectionHeader title="UK Region" />
          <Text className="text-stone-400 text-xs mb-2">
            Affects peak sun hours (PSH) used for sizing.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {UK_REGIONS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRegion(r)}
                className={`px-3 py-1.5 rounded-full border ${
                  region === r ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200'
                }`}
              >
                <Text className={`text-sm font-medium ${region === r ? 'text-white' : 'text-stone-600'}`}>
                  {UK_REGION_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-stone-400 text-xs mt-1.5">
            {UK_PEAK_SUN_HOURS[region]} peak sun hours/day (annual average)
          </Text>
        </View>

        {/* Panel wattage */}
        <View>
          <SectionHeader title="Panel Size" />
          <View className="flex-row gap-2 flex-wrap">
            {PANEL_SIZES.map((pw) => (
              <TouchableOpacity
                key={pw}
                onPress={() => { setPanelWatts(pw); setShowCustomPanel(false); }}
                className={`px-4 py-2 rounded-full border ${
                  panelWatts === pw && !showCustomPanel
                    ? 'bg-stone-900 border-stone-900'
                    : 'bg-white border-stone-200'
                }`}
              >
                <Text className={`text-sm font-medium ${
                  panelWatts === pw && !showCustomPanel ? 'text-white' : 'text-stone-600'
                }`}>{pw}W</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowCustomPanel(true)}
              className={`px-4 py-2 rounded-full border ${
                showCustomPanel ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200'
              }`}
            >
              <Text className={`text-sm font-medium ${showCustomPanel ? 'text-white' : 'text-stone-600'}`}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          {showCustomPanel && (
            <View className="flex-row items-center gap-2 mt-2">
              <TextInput
                value={customPanelWatts}
                onChangeText={(t) => {
                  setCustomPanelWatts(t);
                  const v = parseInt(t, 10);
                  if (v > 0) setPanelWatts(v);
                }}
                keyboardType="numeric"
                placeholder="e.g. 370"
                placeholderTextColor="#a8a29e"
                className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800"
              />
              <Text className="text-stone-500 text-sm">W per panel</Text>
            </View>
          )}
        </View>

        {/* Solar results */}
        <View className="bg-stone-50 rounded-xl p-3 border border-stone-100 gap-1">
          <MetricRow label="Panel output/day" value={formatWh(solarResults.dailyOutputPerPanel)} sub="per panel" />
          <MetricRow label="Panels needed" value={`${solarResults.panelsNeeded} panels`} />
          <MetricRow label="Array size" value={`${solarResults.totalPanelWatts.toLocaleString()} W`} />
          <MetricRow label="MPPT charge current" value={`${solarResults.mpptChargeAmps}A @ ${systemVoltage}V`} />
        </View>

        <View>
          <SectionHeader title="Recommended MPPT Controller" />
          <View className="bg-white rounded-xl border border-stone-100 p-4">
            <Text className="text-stone-400 text-xs mb-0.5">Victron SmartSolar</Text>
            <Text className="text-stone-800 text-sm font-semibold">{solarResults.mpptModel}</Text>
          </View>
        </View>

        {/* B2B / Alternator charging */}
        <View>
          <SectionHeader title="Alternator Charging (B2B)" />
          <View className="bg-white rounded-xl border border-stone-100 p-4 gap-3">
            <Text className="text-stone-600 text-sm font-semibold mb-1">Victron Orion-Tr Smart</Text>
            <View className="gap-1.5">
              {(Object.keys(B2B_MODELS) as B2BModel[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setB2bModel(key)}
                  className={`flex-row items-center px-3 py-2.5 rounded-xl border ${
                    b2bModel === key ? 'bg-stone-900 border-stone-900' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    b2bModel === key ? 'bg-amber-400 border-amber-400' : 'border-stone-300'
                  }`} />
                  <Text className={`text-sm ${b2bModel === key ? 'text-white font-medium' : 'text-stone-600'}`}>
                    {B2B_MODELS[key].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Stepper
              label="Driving / charging hours per day"
              value={drivingHours}
              min={0}
              max={12}
              onChange={setDrivingHours}
              suffix="h"
            />
            <MetricRow
              label="Daily alternator contribution"
              value={formatWh(alternatorResults.dailyWhFromAlternator)}
            />
          </View>
        </View>

        {/* Charging balance */}
        <View>
          <SectionHeader title="Charging Balance" />
          <View className="bg-stone-900 rounded-2xl p-4 gap-2">
            <View className="flex-row justify-between">
              <View>
                <Text className="text-stone-400 text-xs">Solar</Text>
                <Text className="text-white text-lg font-bold">{formatWh(chargingBalance.solarWh)}</Text>
              </View>
              <View>
                <Text className="text-stone-400 text-xs">Alternator</Text>
                <Text className="text-white text-lg font-bold">{formatWh(chargingBalance.alternatorWh)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-stone-400 text-xs">Coverage</Text>
                <Text className={`text-lg font-bold ${chargingBalance.coveragePct >= 100 ? 'text-green-400' : 'text-amber-400'}`}>
                  {chargingBalance.coveragePct}%
                </Text>
              </View>
            </View>
            <View className="h-2 bg-stone-700 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${chargingBalance.coveragePct >= 100 ? 'bg-green-400' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(chargingBalance.coveragePct, 100)}%` }}
              />
            </View>
            {chargingBalance.coveragePct < 100 && (
              <Text className="text-stone-400 text-xs">
                Shortfall: {formatWh(batteryResults.adjustedWh - chargingBalance.totalChargeWh)} — shore power (Multiplus 2) will top up
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  function renderCablesTab() {
    return (
      <View className="gap-4">
        <InfoBox>
          Cable sizing per BS 7671:2018+A2:2022 (IET 18th Edition). Max 5% voltage drop
          for DC final circuits. Consult a qualified electrician for final sign-off.
        </InfoBox>

        <View>
          <SectionHeader title="Cable Run Lengths" />
          <View className="bg-white rounded-xl border border-stone-100 px-4 divide-y divide-stone-50">
            <CableRunInput
              label="Battery → Inverter (DC)"
              value={cableRuns.batteryToInverter}
              onChange={(v) => updateRun('batteryToInverter', v)}
            />
            <CableRunInput
              label="Battery → MPPT Controller (DC)"
              value={cableRuns.batteryToMppt}
              onChange={(v) => updateRun('batteryToMppt', v)}
            />
            <CableRunInput
              label="MPPT → Solar Array (PV)"
              value={cableRuns.mpptToPanels}
              onChange={(v) => updateRun('mpptToPanels', v)}
            />
            <CableRunInput
              label="Battery → B2B Charger"
              value={cableRuns.batteryToB2b}
              onChange={(v) => updateRun('batteryToB2b', v)}
            />
            <CableRunInput
              label="Inverter AC → Distribution Board"
              value={cableRuns.inverterToBoard}
              onChange={(v) => updateRun('inverterToBoard', v)}
            />
          </View>
        </View>

        <View>
          <SectionHeader title="Cable & Fuse Schedule" />
          <View className="gap-2">
            {cableSpecs.length === 0 ? (
              <Text className="text-stone-400 text-sm text-center py-4">
                Enter cable run lengths above to see sizing
              </Text>
            ) : (
              cableSpecs.map((spec, i) => <CableRow key={i} spec={spec} />)
            )}
          </View>
        </View>

        <View className="bg-stone-50 rounded-xl border border-stone-100 p-3 gap-1.5">
          <Text className="text-stone-600 text-xs font-semibold">Fuse type guide</Text>
          <Text className="text-stone-400 text-xs">≤ 30A — ATO/ATC blade fuse</Text>
          <Text className="text-stone-400 text-xs">30–100A — MIDI inline fuse</Text>
          <Text className="text-stone-400 text-xs">100–400A — ANL or MEGA inline fuse</Text>
          <Text className="text-stone-400 text-xs">AC circuits — MCB (BS EN 60898) or MCCB</Text>
        </View>

        {cableSpecs.length > 3 && (
          <View className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <Text className="text-blue-800 text-xs font-semibold mb-0.5">Busbar Recommended</Text>
            <Text className="text-blue-700 text-xs">
              With {cableSpecs.length} circuits, use a DC busbar (positive + negative) rated
              for your total load. Lynx Distributor (Victron) or equivalent.
            </Text>
          </View>
        )}
      </View>
    );
  }

  function renderSummaryTab() {
    return (
      <View className="gap-4">
        {/* System overview */}
        <View className="bg-stone-900 rounded-2xl p-4 gap-2">
          <Text className="text-amber-400 text-xs font-bold uppercase tracking-widest">System Summary</Text>
          <Text className="text-white text-2xl font-bold">{systemVoltage}V · {batteryType === 'lifepo4' ? 'LiFePO4' : 'AGM'}</Text>
          <Text className="text-stone-400 text-sm">{formatWh(batteryResults.totalWhPerDay)}/day · {daysAutonomy}d autonomy</Text>
        </View>

        {/* Battery bank */}
        <View className="bg-white rounded-xl border border-stone-100 p-4 gap-1">
          <Text className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Battery Bank</Text>
          <MetricRow label="Configuration" value={selectedBank.label} />
          <MetricRow label="Usable capacity" value={formatWh(selectedBank.recommendedAh * systemVoltage)} />
          <MetricRow label="Est. weight" value={`~${selectedBank.estimatedWeightKg} kg`} />
          <MetricRow label="Inverter / charger" value={multiplusModel} />
        </View>

        {/* Solar */}
        <View className="bg-white rounded-xl border border-stone-100 p-4 gap-1">
          <Text className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Solar Array</Text>
          <MetricRow label="Panels" value={`${solarResults.panelsNeeded}× ${panelWatts}W`} />
          <MetricRow label="Array total" value={`${solarResults.totalPanelWatts.toLocaleString()} W`} />
          <MetricRow label="Region" value={`${UK_REGION_LABELS[region]} (${UK_PEAK_SUN_HOURS[region]} PSH)`} />
          <MetricRow label="MPPT controller" value={solarResults.mpptModel} />
        </View>

        {/* Charging */}
        <View className="bg-white rounded-xl border border-stone-100 p-4 gap-1">
          <Text className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Charging Sources</Text>
          <MetricRow label="Solar" value={`${formatWh(chargingBalance.solarWh)}/day`} />
          <MetricRow label="Alternator (B2B)" value={`${formatWh(chargingBalance.alternatorWh)}/day`} sub={alternatorResults.b2bLabel} />
          <MetricRow label="Shore power" value={multiplusModel} sub="via Multiplus 2 charger" />
          <MetricRow label="Coverage (solar + B2B)" value={`${chargingBalance.coveragePct}%`} />
        </View>

        {/* Cable schedule */}
        {cableSpecs.length > 0 && (
          <View className="bg-white rounded-xl border border-stone-100 p-4 gap-2">
            <Text className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Cable Schedule</Text>
            {cableSpecs.map((spec, i) => (
              <View key={i} className="flex-row justify-between items-center py-0.5">
                <Text className="text-stone-600 text-xs flex-1 pr-2" numberOfLines={1}>{spec.circuitName}</Text>
                <Text className="text-stone-800 text-xs font-semibold">{spec.recommendedMm2}mm² · {spec.fuseRatingAmps}A</Text>
              </View>
            ))}
          </View>
        )}

        {/* Cost guide */}
        <View className="bg-stone-50 border border-stone-100 rounded-xl p-4 gap-1.5">
          <Text className="text-stone-600 text-xs font-bold uppercase tracking-wider mb-1">UK Trade Cost Guide</Text>
          <Text className="text-stone-500 text-xs">LiFePO4 batteries — £800–£1,200 per 100Ah (24V)</Text>
          <Text className="text-stone-500 text-xs">Victron SmartSolar MPPT — £150–£400</Text>
          <Text className="text-stone-500 text-xs">Victron Multiplus-II — £600–£1,800</Text>
          <Text className="text-stone-500 text-xs">ANL / MEGA fuse holder — £15–£30</Text>
          <Text className="text-stone-500 text-xs">Flexible copper cable — £4–£12/m</Text>
        </View>

        {/* Compliance note */}
        <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 gap-1">
          <Text className="text-amber-800 text-xs font-semibold">Compliance Note</Text>
          <Text className="text-amber-700 text-xs">
            Cable sizing is indicative only, per BS 7671:2018+A2:2022. Any permanent
            installation in a commercial vehicle must be signed off by a qualified
            electrician. DVSA regulations apply to HGV/LGV conversions.
          </Text>
        </View>

        <View style={{ height: 16 }} />
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-2 pb-1 border-b border-stone-100">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="w-8 h-8 bg-amber-700 rounded-lg items-center justify-center">
            <Text className="text-base">⚡</Text>
          </View>
          <View>
            <Text className="font-bold text-stone-900 text-base">Power System Calculator</Text>
            <Text className="text-stone-400 text-xs">Victron Multiplus 2 · UK BS 7671</Text>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8, gap: 4 }}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full ${
                activeTab === tab ? 'bg-stone-900' : 'bg-stone-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab ? 'text-white' : 'text-stone-600'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'Load'      && renderLoadTab()}
        {activeTab === 'Batteries' && renderBatteryTab()}
        {activeTab === 'Solar'     && renderSolarTab()}
        {activeTab === 'Cables'    && renderCablesTab()}
        {activeTab === 'Summary'   && renderSummaryTab()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
