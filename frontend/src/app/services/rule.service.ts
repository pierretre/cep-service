import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Rule, fromRule } from '../models/rule.model';

export interface CreateRuleRequest {
    name: string;
    eplQuery: string;
    description: string;
    active: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class RuleService {
    private apiUrl = `${environment.apiUrl}/rules`;

    constructor(private http: HttpClient) { }

    getAllRules(): Observable<Rule[]> {
        return this.http.get<any[]>(this.apiUrl).pipe(
            map(rules => rules.map(fromRule))
        );
    }

    getRuleById(id: number): Observable<Rule> {
        return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
            map(fromRule)
        );
    }

    createRule(request: CreateRuleRequest): Observable<Rule> {
        return this.http.post<any>(this.apiUrl, request).pipe(
            map(fromRule)
        );
    }

    updateRule(id: number, request: CreateRuleRequest): Observable<Rule> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, request).pipe(
            map(fromRule)
        );
    }

    deleteRule(id: number): Observable<string> {
        return this.http.delete(`${this.apiUrl}/${id}`, { responseType: 'text' });
    }

    activateRule(id: number): Observable<string> {
        return this.http.patch(`${this.apiUrl}/${id}/activate`, {}, { responseType: 'text' });
    }

    deactivateRule(id: number): Observable<string> {
        return this.http.patch(`${this.apiUrl}/${id}/deactivate`, {}, { responseType: 'text' });
    }

    getActiveRules(): Observable<Rule[]> {
        return this.http.get<any[]>(`${this.apiUrl}/active`).pipe(
            map(rules => rules.map(fromRule))
        );
    }
}
