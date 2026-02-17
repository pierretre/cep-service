export interface FilterConfig {
    startDate: string;
    endDate: string;
    severityLevels: {
        critical: boolean;
        high: boolean;
        medium: boolean;
        low: boolean;
    };
}