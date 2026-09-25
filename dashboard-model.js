/**
 * ISS dashboard data model
 * Front-end contract for operational dashboard data.
 * This file intentionally contains no persistence or authentication code.
 */

export const ISSDashboardSchema = Object.freeze({
  company: {
    id: "string",
    name: "string",
    status: "active | suspended",
    sites: ["siteId"]
  },

  site: {
    id: "string",
    companyId: "string",
    clientId: "string",
    name: "string",
    address: "string",
    status: "operational | attention | critical | offline",
    currentShiftId: "string | null",
    assignedOfficerIds: ["officerId"],
    patrolPlanId: "string | null",
    lastActivityAt: "ISO-8601 datetime"
  },

  officer: {
    id: "string",
    companyId: "string",
    name: "string",
    role: "officer | team_leader | supervisor | controller | manager",
    status: "off_duty | on_duty | patrol | break | unavailable",
    siteId: "string | null",
    shiftId: "string | null"
  },

  shift: {
    id: "string",
    siteId: "string",
    officerIds: ["officerId"],
    supervisorId: "string | null",
    startsAt: "ISO-8601 datetime",
    endsAt: "ISO-8601 datetime",
    actualStartAt: "ISO-8601 datetime | null",
    actualEndAt: "ISO-8601 datetime | null",
    status: "scheduled | active | overdue | completed",
    handoverStatus: "not_required | pending | acknowledged | completed"
  },

  patrol: {
    id: "string",
    siteId: "string",
    shiftId: "string",
    officerId: "string",
    scheduledAt: "ISO-8601 datetime",
    startedAt: "ISO-8601 datetime | null",
    completedAt: "ISO-8601 datetime | null",
    status: "scheduled | in_progress | completed | missed | overdue",
    checkpointsTotal: "number",
    checkpointsCompleted: "number"
  },

  incident: {
    id: "string",
    siteId: "string",
    shiftId: "string | null",
    reportedByOfficerId: "string",
    category: "string",
    severity: "low | medium | high | critical",
    status: "open | investigating | resolved | closed",
    title: "string",
    occurredAt: "ISO-8601 datetime",
    reportedAt: "ISO-8601 datetime",
    evidenceCount: "number"
  },

  procedure: {
    id: "string",
    siteId: "string",
    name: "string",
    type: "opening | closing | patrol | emergency | custom",
    required: "boolean",
    stepsTotal: "number",
    stepsCompleted: "number",
    status: "not_started | in_progress | completed | exception"
  },

  activityEvent: {
    id: "string",
    siteId: "string",
    officerId: "string | null",
    type: "shift | patrol | incident | procedure | handover | system",
    severity: "info | attention | critical",
    message: "string",
    createdAt: "ISO-8601 datetime"
  },

  dashboardSummary: {
    activeSites: "number",
    officersOnDuty: "number",
    patrolsDue: "number",
    patrolsCompleted: "number",
    missedPatrols: "number",
    openIncidents: "number",
    criticalIncidents: "number",
    overdueHandovers: "number",
    sitesRequiringAttention: "number"
  }
});

export const ISSDashboardSelectors = Object.freeze({
  priorityOrder: ["critical", "attention", "operational", "offline"],
  incidentSeverityOrder: ["critical", "high", "medium", "low"],
  dashboardCards: [
    "activeSites",
    "officersOnDuty",
    "patrolsCompleted",
    "openIncidents"
  ],
  exceptionCounters: [
    "missedPatrols",
    "criticalIncidents",
    "overdueHandovers",
    "sitesRequiringAttention"
  ]
});
