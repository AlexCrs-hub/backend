const PERIODS = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month'
};

const DOWNTIME_TYPES = {
    PLANNED: 'planned',
    UNPLANNED: 'unplanned'
};

const DOWNTIME_REASONS = {
    MAINTENANCE: 'maintenance',
    TOOL_CHANGE: 'tool_change',
    SETUP: 'setup',
    MATERIAL_WAIT: 'material_wait',
    BREAKDOWN: 'breakdown',
    FAULT: 'fault',
    MICRO_STOP: 'micro_stop',
    OTHER: 'other'
};

// Downtime shorter than this is treated as a micro-stop and is not asked to be reported
const DOWNTIME_MIN_REPORTABLE_MS = 5 * 60 * 1000;

// How far back the "report downtime" flow looks for unreported downtime
const DOWNTIME_REPORT_WINDOW_HOURS = 24;

const USER_ROLES = {
    ADMIN: 'admin',
    OPERATOR: 'operator',
    MAINTENANCE: 'maintenance'
};

module.exports = {
    PERIODS,
    DOWNTIME_TYPES,
    DOWNTIME_REASONS,
    DOWNTIME_MIN_REPORTABLE_MS,
    DOWNTIME_REPORT_WINDOW_HOURS,
    USER_ROLES
};