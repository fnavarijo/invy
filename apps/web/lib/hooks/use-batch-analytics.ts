import { useState, useEffect } from 'react';
import {
  getTopProductsByQuantity,
  getTopProductsByRevenue,
  getTopBuyers,
  type TopProductByQuantityItem,
  type TopProductByRevenueItem,
  type TopBuyerItem,
} from '@/lib/api/analytics';

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

export type AnalyticsDatasetState<T> = {
  data: T[] | null;
  loading: boolean;
  error: string | null;
};

export type BatchAnalyticsState = {
  quantity: AnalyticsDatasetState<TopProductByQuantityItem>;
  revenue: AnalyticsDatasetState<TopProductByRevenueItem>;
  buyers: AnalyticsDatasetState<TopBuyerItem>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBatchAnalytics(batchId: string): BatchAnalyticsState {
  const [quantity, setQuantity] = useState<
    AnalyticsDatasetState<TopProductByQuantityItem>
  >({ data: null, loading: true, error: null });

  const [revenue, setRevenue] = useState<
    AnalyticsDatasetState<TopProductByRevenueItem>
  >({ data: null, loading: true, error: null });

  const [buyers, setBuyers] = useState<AnalyticsDatasetState<TopBuyerItem>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const signal = controller.signal;

    Promise.allSettled([
      getTopProductsByQuantity(batchId, undefined, signal),
      getTopProductsByRevenue(batchId, undefined, signal),
      getTopBuyers(batchId, undefined, signal),
    ]).then(([quantityResult, revenueResult, buyersResult]) => {
      if (cancelled) return;

      if (quantityResult.status === 'fulfilled') {
        setQuantity({
          data: quantityResult.value.data,
          loading: false,
          error: null,
        });
      } else {
        const err = quantityResult.reason as Error;
        if (err.name !== 'AbortError' && !cancelled) {
          setQuantity({ data: null, loading: false, error: err.message });
        }
      }

      if (revenueResult.status === 'fulfilled') {
        setRevenue({
          data: revenueResult.value.data,
          loading: false,
          error: null,
        });
      } else {
        const err = revenueResult.reason as Error;
        if (err.name !== 'AbortError' && !cancelled) {
          setRevenue({ data: null, loading: false, error: err.message });
        }
      }

      if (buyersResult.status === 'fulfilled') {
        setBuyers({
          data: buyersResult.value.data,
          loading: false,
          error: null,
        });
      } else {
        const err = buyersResult.reason as Error;
        if (err.name !== 'AbortError' && !cancelled) {
          setBuyers({ data: null, loading: false, error: err.message });
        }
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [batchId]);

  return { quantity, revenue, buyers };
}
