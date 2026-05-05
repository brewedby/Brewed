// Persists prediction snapshots so we can compare against actuals later.
//
// Important: we save the prediction's *result*, not the catalog or COGS
// values it was inferred from. The user's product unit_cost / cost_of_goods
// data is never copied here.
//
// Schema: see supabase/migration_014_prediction_engine.sql.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PredictionResult } from '@/lib/predictionEngine';

interface SavePredictionInput {
  eventId: string;
  userId: string;
  tradeType: string;
  forecastTempC: number | null;
  weatherSummary: string | null;
  prediction: PredictionResult;
}

/** Postgres "column does not exist" → 42703 / "relation does not exist" → 42P01.
 *  We treat both as "the migration hasn't run yet, skip persistence quietly". */
function isMigrationMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string };
  return e.code === '42703' || e.code === '42P01';
}

export function useSavePrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId, userId, tradeType, forecastTempC, weatherSummary, prediction,
    }: SavePredictionInput) => {
      const row = {
        event_id: eventId,
        user_id: userId,
        trade_type: tradeType,
        kind: prediction.kind,
        // The forecast lines are the meaningful part — we don't include
        // raw observation data here (privacy: drivers list is pre-rendered).
        payload: {
          forecast: prediction.forecast,
          drivers: prediction.drivers,
          weatherImpact: prediction.weatherImpact,
        } as Record<string, unknown>,
        forecast_temp_c: forecastTempC,
        weather_summary: weatherSummary,
        confidence: prediction.confidence,
        based_on_events: prediction.basedOnEvents,
      };

      // Use `.from('event_predictions' as never)` style cast so this
      // compiles even before the migration types propagate. Graceful
      // fallback if the table doesn't exist yet.
      const supa = supabase as unknown as {
        from: (t: string) => ReturnType<typeof supabase.from>;
      };
      const { error } = await supa.from('event_predictions').insert(row as never);
      if (error && !isMigrationMissingError(error)) {
        throw error;
      }
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['event_predictions', eventId] });
    },
  });
}
