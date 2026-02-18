export interface FilterConfig {
    startDate: Date;
    endDate: Date;
    liveMode: boolean;
    severityLevels: {
        critical: boolean;
        warning: boolean;
        info: boolean;
    };
    selectedRules: string[] | null;
    incidentSearchTerm: string;
}