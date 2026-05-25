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

const USER_ROLES = {
    ADMIN: 'admin',
    OPERATOR: 'operator',
    MAINTENANCE: 'maintenance'
};

module.exports = { PERIODS, DOWNTIME_TYPES, DOWNTIME_REASONS, USER_ROLES };