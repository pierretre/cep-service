import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface TimePoint {
    timestamp: number;
    value: number;
}

export interface TimeSeriesResponse {
    points: TimePoint[];
    resolution: string;
    startTime: number;
    endTime: number;
}

@Injectable({ providedIn: 'root' })
export class TimeseriesService {

    constructor(private http: HttpClient) { }

    getTimeseries(
        start: number,
        end: number,
        resolution: string
    ): Observable<TimePoint[]> {

        return this.http.get<TimeSeriesResponse>(
            '/api/timeseries',
            {
                params: {
                    start: start.toString(),
                    end: end.toString(),
                    resolution
                }
            }
        ).pipe(
            map(response => response.points)
        );
    }
}
