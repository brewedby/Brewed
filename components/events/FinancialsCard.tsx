import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { EventFinancials, EventCalculations } from '@/types';

interface Props {
  financials: EventFinancials;
  calculations: EventCalculations;
}

function Row({ label, value, bold, color, indent }: {
  label: string; value: string; bold?: boolean; color?: string; indent?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 }}>
      <Text style={{
        fontSize: 14,
        color: indent ? '#a8a29e' : bold ? '#1c1917' : '#78716c',
        paddingLeft: indent ? 12 : 0,
        fontWeight: bold ? '600' : '400',
        flex: 1, marginRight: 8,
      }}>
        {label}
      </Text>
      <Text style={{
        fontSize: 14,
        fontWeight: bold ? '700' : '500',
        color: color ?? (bold ? '#1c1917' : '#78716c'),
      }}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#f5f5f4', marginVertical: 6 }} />;
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 10, fontWeight: '700', color: '#a8a29e',
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginTop: 14, marginBottom: 4,
    }}>
      {title}
    </Text>
  );
}

export function FinancialsCard({ financials: f, calculations: c }: Props) {
  const hasVatBreakdown    = (f.zero_rated_sales ?? 0) > 0 || (f.standard_rated_sales ?? 0) > 0;
  const hasCommission      = (f.concessions_commission_pct ?? 0) > 0 || (f.pitch_fee_refund_pct ?? 0) > 0;
  const hasPowerFee        = (f.power_fee ?? 0) > 0;
  const hasSiteCostSection = hasCommission || hasPowerFee;
  const hasMilk            = (f.fresh_milk_litres ?? 0) > 0 || (f.alt_milk_litres ?? 0) > 0;

  const isProfit = c.netProfit >= 0;

  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f5f5f4' }}>
      {/* Header row with net profit badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontWeight: '700', color: '#1c1917', fontSize: 16 }}>Financials</Text>
        <View style={{
          backgroundColor: isProfit ? '#dcfce7' : '#fee2e2',
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
        }}>
          <Text style={{ color: isProfit ? '#166534' : '#991b1b', fontWeight: '700', fontSize: 13 }}>
            {isProfit ? '+' : ''}{formatCurrency(c.netProfit)}
          </Text>
        </View>
      </View>

      {/* ── SALES ── */}
      <SectionLabel title="Sales" />
      {hasVatBreakdown ? (
        <>
          <Row label="Hot drinks & food (20% VAT, inc.)" value={formatCurrency(f.standard_rated_sales ?? 0)} />
          <Row label="Ex-VAT net"       value={formatCurrency(c.standardRatedNet)} indent />
          <Row label="VAT collected"    value={formatCurrency(c.vatCollected)}     indent />
          <Row label="Cold drinks (0% VAT)" value={formatCurrency(f.zero_rated_sales ?? 0)} />
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
              <Row label={`Pitch fee refund (${f.pitch_fee_refund_pct ?? 0}%)`}
                   value={formatCurrency(c.pitchFeeRefundGross)} indent />
              <Row label={`Commission (${f.concessions_commission_pct ?? 0}% of net)`}
                   value={`−${formatCurrency(c.commissionAmount)}`} indent />
              <Row label="Net refund received"
                   value={formatCurrency(Math.max(0, c.netRefund))} indent
                   color={c.netRefund >= 0 ? '#16a34a' : '#dc2626'} />
            </>
          )}
          {hasPowerFee && (
            <Row label="Power / site fee" value={formatCurrency(f.power_fee ?? 0)} />
          )}
          <Row label="Total site cost"
               value={formatCurrency(c.effectivePitchFee + (f.power_fee ?? 0))} bold />
        </>
      )}

      {/* ── YOUR COSTS ── */}
      <SectionLabel title="Your Costs" />
      <Row label="Cost of Goods"    value={formatCurrency(f.cost_of_goods)} />
      {!hasSiteCostSection && (f.pitch_fee ?? 0) > 0 && (
        <Row label="Pitch Fee"      value={formatCurrency(f.pitch_fee)} />
      )}
      <Row label="Staffing"         value={formatCurrency(f.staffing_costs)} />
      <Row label="Travel"           value={formatCurrency(f.travel_costs)} />
      {(f.camping_costs ?? 0) > 0 && (
        <Row label="Camping"        value={formatCurrency(f.camping_costs ?? 0)} />
      )}
      <Row label="Equipment"        value={formatCurrency(f.equipment_costs)} />
      {(f.other_costs ?? 0) > 0 && (
        <Row label="Other"          value={formatCurrency(f.other_costs ?? 0)} />
      )}

      {/* ── MILK ── */}
      {hasMilk && (
        <>
          <SectionLabel title="Milk Used" />
          {(f.fresh_milk_litres ?? 0) > 0 && (
            <Row label="Fresh Milk" value={`${(f.fresh_milk_litres ?? 0).toFixed(1)} L`} />
          )}
          {(f.alt_milk_litres ?? 0) > 0 && (
            <Row label="Alt Milk"   value={`${(f.alt_milk_litres ?? 0).toFixed(1)} L`} />
          )}
        </>
      )}

      {/* ── TOTALS ── */}
      <Divider />
      <Row label="Total Costs" value={formatCurrency(c.totalCosts)} bold />
      <Divider />
      <Row label="Net Profit"   value={formatCurrency(c.netProfit)}   bold color={isProfit ? '#16a34a' : '#dc2626'} />
      <Row label="Profit Margin" value={formatPercent(c.profitMargin)} bold color={c.profitMargin >= 0 ? '#16a34a' : '#dc2626'} />
    </View>
  );
}
