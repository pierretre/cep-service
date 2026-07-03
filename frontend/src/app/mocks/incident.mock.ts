import { Incident, IncidentSeverity, Rule } from '../models';

export const MOCK_RULES: Rule[] = [
    {
        id: 1,
        name: 'High Temperature Alert',
        eplQuery: 'SELECT * FROM TemperatureStream WHERE temp > 80',
        description: 'Triggers when machine temperature exceeds 80 degrees',
        active: true,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        deploymentId: 'dep-1'
    },
    {
        id: 2,
        name: 'Pressure Drop Warning',
        eplQuery: 'SELECT * FROM PressureStream WHERE pressure < 2.0',
        description: 'Triggers when system pressure drops below 2.0 bar',
        active: true,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        deploymentId: 'dep-1'
    },
    {
        id: 3,
        name: 'Vibration Anomaly',
        eplQuery: 'SELECT * FROM VibrationStream WHERE amplitude > 5.0',
        description: 'Triggers when vibration amplitude is abnormally high',
        active: true,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        deploymentId: 'dep-1'
    },
    {
        id: 4,
        name: 'Critical Power Failure',
        eplQuery: 'SELECT * FROM PowerStream WHERE status = "OFF"',
        description: 'Triggers on complete power loss',
        active: true,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        deploymentId: 'dep-1'
    }
];

export const MOCK_INCIDENTS: Incident[] = [
    // Scenario 1: Escalating failure (Warning -> Critical)
    // A machine starts with high vibration, then pressure drops, then it fails completely.
    {
        id: 101,
        message: 'Vibration amplitude reached 5.2 on Machine A',
        rule: MOCK_RULES[2],
        severity: IncidentSeverity.Warning,
        startTime: new Date('2026-06-28T08:00:00Z'),
        createdAt: new Date('2026-06-28T08:00:05Z'),
        updatedAt: new Date('2026-06-28T08:00:05Z'),
    },
    {
        id: 102,
        message: 'Pressure dropped to 1.8 bar on Machine A',
        rule: MOCK_RULES[1],
        severity: IncidentSeverity.Warning,
        startTime: new Date('2026-06-28T08:15:00Z'),
        createdAt: new Date('2026-06-28T08:15:10Z'),
        updatedAt: new Date('2026-06-28T08:15:10Z'),
    },
    {
        id: 103,
        message: 'Critical Power Failure detected on Machine A',
        rule: MOCK_RULES[3],
        severity: IncidentSeverity.Critical,
        startTime: new Date('2026-06-28T08:30:00Z'),
        createdAt: new Date('2026-06-28T08:30:05Z'),
        updatedAt: new Date('2026-06-28T08:30:05Z'),
    },

    // Scenario 2: Intermittent Temperature Spikes
    // Machine B has recurring temperature issues.
    {
        id: 201,
        message: 'Temperature spike: 82C on Machine B',
        rule: MOCK_RULES[0],
        severity: IncidentSeverity.Warning,
        startTime: new Date('2026-06-29T10:00:00Z'),
        createdAt: new Date('2026-06-29T10:00:05Z'),
        updatedAt: new Date('2026-06-29T10:00:05Z'),
    },
    {
        id: 202,
        message: 'Temperature spike: 85C on Machine B',
        rule: MOCK_RULES[0],
        severity: IncidentSeverity.Warning,
        startTime: new Date('2026-06-29T11:00:00Z'),
        createdAt: new Date('2026-06-29T11:00:05Z'),
        updatedAt: new Date('2026-06-29T11:00:05Z'),
    },
    {
        id: 203,
        message: 'Temperature spike: 88C on Machine B',
        rule: MOCK_RULES[0],
        severity: IncidentSeverity.Critical,
        startTime: new Date('2026-06-29T12:00:00Z'),
        createdAt: new Date('2026-06-29T12:00:05Z'),
        updatedAt: new Date('2026-06-29T12:00:05Z'),
    },

    // Scenario 3: System-wide instability
    // Multiple machines reporting pressure drops simultaneously.
    {
        id: 301,
        message: 'Pressure drop on Machine C',
        rule: MOCK_RULES[1],
        severity: IncidentSeverity.Warning,
        startTime: new Date('2026-06-30T14:00:00Z'),
        createdAt: new Date('2026-06-30T14:00:05Z'),
        updatedAt: new Date('2026-06-30T14:00:05Z'),
    },
    {
        id: 302,
        message: 'Pressure drop on Machine D',
        rule: MOCK_RULES[1],
        severity: IncidentSeverity.Warning,
        startTime: new Date('2026-06-30T14:05:00Z'),
        createdAt: new Date('2026-06-30T14:05:05Z'),
        updatedAt: new Date('2026-06-30T14:05:05Z'),
    },
    {
        id: 303,
        message: 'Pressure drop on Machine E',
        rule: MOCK_RULES[1],
        severity: IncidentSeverity.Warning,
        startTime: new Date('2026-06-30T14:10:00Z'),
        createdAt: new Date('2026-06-30T14:10:05Z'),
        updatedAt: new Date('2026-06-30T14:10:05Z'),
    },

    // Scenario 4: Random noise/info incidents
    {
        id: 401,
        message: 'Routine check: Vibration within limits',
        rule: MOCK_RULES[2],
        severity: IncidentSeverity.Info,
        startTime: new Date('2026-07-01T09:00:00Z'),
        createdAt: new Date('2026-07-01T09:00:05Z'),
        updatedAt: new Date('2026-07-01T09:00:05Z'),
    }
];
