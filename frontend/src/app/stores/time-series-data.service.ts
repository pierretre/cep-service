import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { FilterConfig } from './filter-history.service';

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
        resolution: string,
        filters?: FilterConfig
    ): Observable<TimePoint[]> {

        let params = new HttpParams()
            .set('start', start.toString())
            .set('end', end.toString())
            .set('resolution', resolution);

        // Add filter parameters if provided
        if (filters) {
            if (filters.status && filters.status !== 'all') {
                params = params.set('status', filters.status);
            }
            if (filters.dataSource && filters.dataSource !== 'all') {
                params = params.set('dataSource', filters.dataSource);
            }

            // Add severity levels
            const severities: string[] = [];
            if (filters.severityLevels.critical) severities.push('critical');
            if (filters.severityLevels.high) severities.push('high');
            if (filters.severityLevels.medium) severities.push('medium');
            if (filters.severityLevels.low) severities.push('low');

            if (severities.length > 0 && severities.length < 4) {
                params = params.set('severities', severities.join(','));
            }
        }

        return this.http.get<TimeSeriesResponse>(
            `${environment.apiUrl}/timeseries`,
            { params }
        ).pipe(
            map(response => response.points)
        );
    }
}
