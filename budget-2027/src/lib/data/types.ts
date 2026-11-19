/** Serializable view models passed from server components to client charts. Values are decimal strings. */
import type { Vintage } from "@/lib/ingest/documents";

export interface SourceRefView {
  locator: string;
  value: string | null;
  documentId: string;
  documentTitle: string;
  publisher: string;
  url: string;
  pageUrl: string | null;
  sha256: string;
  retrievedOn: string;
}

export interface PointView {
  period: string;
  vintage: Vintage;
  value: string | null;
  review: "cross_checked" | "single_source" | "conflict" | "editor_approved";
  sources: SourceRefView[];
}

export interface MetricView {
  key: string;
  label: string;
  short: string;
  definition: string;
  scope: string;
  basis: string;
  unit: string;
  changeIn: "percent" | "pp";
}

export interface SeriesView {
  metric: MetricView;
  versionId: string;
  points: PointView[];
}

export interface MeasureView {
  id: string;
  direction: "revenue" | "expenditure";
  title: string;
  effect2027: string | null;
  effect2028: string | null;
  effect2029: string | null;
  locator: string;
  documentTitle: string;
  url: string;
}
