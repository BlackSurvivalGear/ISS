# ISS Dashboard Data Model

The dashboard is an **exception-first operational view**. It should answer two questions immediately:

1. What is happening on every security site now?
2. Which site, shift, patrol, incident or handover needs attention?

## Entity relationships

```
Company
 ├─ Clients
 └─ Sites
     ├─ Shifts ── Officers
     ├─ Patrols ── Checkpoints
     ├─ Incidents
     ├─ Procedures
     └─ Activity Events
```

## Dashboard hierarchy

### 1. Command summary
Primary cards:
- Active sites
- Officers on duty
- Patrol completion
- Open incidents

Exception counters:
- Missed patrols
- Critical incidents
- Overdue handovers
- Sites requiring attention

### 2. Site status
Each site row/card should show:
- Site and client
- Operational status
- Current shift
- Officers on duty
- Current/next patrol
- Open incident count
- Last activity time

Priority ordering is critical → attention → operational → offline.

### 3. Live activity
A reverse-chronological operational event stream for:
- Shift start/end
- Patrol start/completion/missed patrol
- Incident creation/status change
- Procedure completion/exception
- Handover acknowledgement
- System events

### 4. Alerts
Alerts are derived from operational records rather than stored as a second source of truth. Examples:
- Scheduled patrol is overdue
- Active shift has no assigned officer
- Critical incident remains open
- Required opening/closing procedure has an exception
- Handover remains pending after shift change

## Data ownership

Every operational record belongs to a company and is scoped through a site. Client users should only see sites assigned to their client account. Officer access should be limited to the active/assigned site and shift. Manager/admin views can aggregate across company sites.

## Implementation boundary

This stage defines the front-end data contract only. Firebase/database collections, authentication rules, live listeners and persistence are deliberately deferred until the dashboard structure is agreed.
