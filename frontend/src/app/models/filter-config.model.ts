export interface FilterConfig {
    startDate: Date;
    endDate: Date;
    liveMode: boolean; // Auto-update end date to current time
    severityLevels: {
        critical: boolean;
        warning: boolean;
        info: boolean;
    };
    selectedRules: string[];
}