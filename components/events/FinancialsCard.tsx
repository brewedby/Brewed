import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { EventFinancials, EventCalculations } from '@/types';

interface Props {
  financials: EventFinancials;
  calculations: EventCalculations;
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <Text className={`${bold ? 'font-semibold text-stone-900' : 'text-stone-600'} text-sm`}>{label}</Text>
      <Text className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${color ?? (bold ? 'text-stone-900' : 'text-stone-700')}`}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="border-t border-stone-100 my-1" />;
}

export function FinancialsCard({ financials: f, calculations: c }: Props) {
  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-3">Financials</Text>

      <Row label="Gross Sales" value={formatCurrency(f.gross_sales)} bold />
      <Divider />

      <Text className="text-xs font-semibold text-stone-400 uppercase tracking-wide mt-2 mb-1">
        Costs
      </Text>
      <Row label="Cost of Goods" value={formatCurrency(f.cost_of_goods)} />
      <Row label="Pitch Fee" value={formatCurrency(f.pitch_fee)} />
      <Row label="Staffing" value={formatCurrency(f.staffing_costs)} />
      <Row label="Travel" value={formatCurrency(f.travel_costs)} />
      <Row label="Equipment" value={formatCurrency(f.equipment_costs)} />
      {f.other_costs > 0 && <Row label="Other" value={formatCurrency(f.other_costs)} />}
      <Divider />

      <Row label="Total Costs" value={formatCurrency(c.totalCosts)} bold />
      <Divider />

      <Row
        label="Net Profit"
        value={formatCurrency(c.netProfit)}
        bold
        color={c.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}
      />
      <Row
        label="Profit Margin"
        value={formatPercent(c.profitMargin)}
        bold
        color={c.profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}
      />
      <Row label="Gross Profit" value={formatCurrency(c.grossProfit)} />
    </View>
  );
}
