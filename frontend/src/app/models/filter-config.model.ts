export interface FilterConfig {
    startDate: string;
    endDate: string;
    severityLevels: {
        critical: boolean;
        warning: boolean;
        info: boolean;
    };
}