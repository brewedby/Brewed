import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { EventFinancials, EventCalculations } from '@/types';

interface Props {
  financials: EventFinancials;
  calculations: EventCalculations;
}

function Row({
  label,
  value,
  bold,
  color,
  indent,
  large,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
  indent?: boolean;
  large?: boolean;
}) {
  const textSize = large ? 'text-base' : 'text-sm';
  return (
    <View className="flex-row justify-between items-center py-1.5">
      <Text
        className={`${textSize} ${
          indent
            ? 'pl-3 text-stone-500'
            : bold
            ? 'font-semibold text-stone-900'
            : 'text-stone-600'
        }`}
      >
        {label}
      </Text>
      <Text
        className={`${textSize} ${bold ? 'font-bold' : 'font-medium'} ${
          color ?? (bold ? 'text-stone-900' : 'text-stone-600')
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="border-t border-stone-100 my-1.5" />;
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-xs font-bold text-stone-400 uppercase tracking-wide mt-3 mb-0.5">
      {title}
    </Text>
  );
}

export function FinancialsCard({ financials: f, calculations: c }: Props) {
  const hasVatBreakdown =
    (f.zero_rated_sales ?? 0) > 0 || (f.standard_rated_sales ?? 0) > 0;
  const hasCommission =
    (f.concessions_commission_pct ?? 0) > 0 || (f.pitch_fee_refund_pct ?? 0) > 0;
  const hasPowerFee = (f.power_fee ?? 0) > 0;
  const hasSiteCostSection = hasCommission || hasPowerFee;
  const hasMilk =
    (f.fresh_milk_litres ?? 0) > 0 || (f.alt_milk_litres ?? 0) > 0;

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 mb-2 text-base">Financials</Text>

      {/* ── SALES ── */}
      <SectionLabel title="Sales" />
      {hasVatBreakdown ? (
        <>
          <Row
            label="Hot drinks & food (20% VAT, incl. VAT)"
            value={formatCurrency(f.standard_rated_sales ?? 0)}
          />
          <Row label="  Ex-VAT net" value={formatCurrency(c.standardRatedNet)} indent />
          <Row label="  VAT collected" value={formatCurrency(c.vatCollected)} indent />
          <Row
            label="Cold drinks (0% VAT)"
            value={formatCurrency(f.zero_rated_sales ?? 0)}
          />
          <Divider />
          <Row label="Total Net Sales (ex-VAT)" value={formatCurrency(c.totalNetSales)} bold />
        </>
      ) : (
        <Row label="Gross Sales" value={formatCurrency(f.gross_sales)} bold />
      )}

      {/* ── PITCH FEE & COMMISSION ── */}
      {hasSiteCostSection && (
        <>
          <SectionLabel title="Pitch Fee & Commission" />
          {(f.pitch_fee ?? 0) > 0 && (
            <Row label="Pitch fee paid" value={formatCurrency(f.pitch_fee)} />
          )}
          {hasCommission && (
            <>
              <Row
                label={`Pitch fee refund (${f.pitch_fee_refund_pct ?? 0}%)`}
                value={formatCurrency(c.pitchFeeRefundGross)}
                indent
              />
              <Row
                label={`Commission (${f.concessions_commission_pct ?? 0}% of net sales)`}
                value={`-${formatCurrency(c.commissionAmount)}`}
                indent
              />
              <Row
                label="Net refund received"
                value={formatCurrency(Math.max(0, c.netRefund))}
                indent
                color={c.netRefund >= 0 ? 'text-green-600' : 'text-red-500'}
              />
            </>
          )}
          {hasPowerFee && (
            <Row label="Power / site fee" value={formatCurrency(f.power_fee ?? 0)} />
          )}
          <Row
            label="Total site cost"
            value={formatCurrency(c.effectivePitchFee + (f.power_fee ?? 0))}
            bold
          />
        </>
      )}

      {/* ── YOUR COSTS ── */}
      <SectionLabel title="Your Costs" />
      <Row label="Cost of Goods" value={formatCurrency(f.cost_of_goods)} />
      {!hasSiteCostSection && (f.pitch_fee ?? 0) > 0 && (
        <Row label="Pitch Fee" value={formatCurrency(f.pitch_fee)} />
      )}
      <Row label="Staffing" value={formatCurrency(f.staffing_costs)} />
      <Row label="Travel" value={formatCurrency(f.travel_costs)} />
      {(f.camping_costs ?? 0) > 0 && (
        <Row label="Camping" value={formatCurrency(f.camping_costs ?? 0)} />
      )}
      <Row label="Equipment" value={formatCurrency(f.equipment_costs)} />
      {(f.other_costs ?? 0) > 0 && (
        <Row label="Other" value={formatCurrency(f.other_costs ?? 0)} />
      )}

      {/* ── MILK USED ── */}
      {hasMilk && (
        <>
          <SectionLabel title="Milk Used" />
          {(f.fresh_milk_litres ?? 0) > 0 && (
            <Row
              label="Fresh Milk"
              value={`${(f.fresh_milk_litres ?? 0).toFixed(1)} L`}
            />
          )}
          {(f.alt_milk_litres ?? 0) > 0 && (
            <Row
              label="Alt Milk"
              value={`${(f.alt_milk_litres ?? 0).toFixed(1)} L`}
            />
          )}
        </>
      )}

      <Divider />
      <Row label="Total Costs" value={formatCurrency(c.totalCosts)} bold />
      <Divider />

      <Row
        label="Net Profit"
        value={formatCurrency(c.netProfit)}
        bold
        large
        color={c.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}
      />
      <Row
        label="Profit Margin"
        value={formatPercent(c.profitMargin)}
        bold
        large
        color={c.profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}
      />
    </View>
  );
}
