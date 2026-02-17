/**
 * Time-series data models for adaptive resolution charting
 */

export interface TimePoint {
    timestamp: number;
    value: number;
}

export interface TimeSeriesData {
    points: TimePoint[];
    resolution: string;
    startTime: number;
    endTime: number;
}

export type ResolutionLevel = '1m' | '5m' | '15m' | '1h' | '6h' | '1d' | '1w';

export interface TimeRange {
    start: number;
    end: number;
}

export interface DataRequest {
    start: number;
    end: number;
    resolution: ResolutionLevel;
}

export interface CachedData {
    request: DataRequest;
    data: TimeSeriesData;
    timestamp: number;
}
