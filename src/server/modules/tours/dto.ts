import 'server-only';

export type TourSummary = Record<string, unknown>;
export type TourDetail = Record<string, unknown>;

export function toTourSummary(tour: object): TourSummary {
  return { ...tour };
}

export function toTourDetail(tour: object): TourDetail {
  return { ...tour };
}
