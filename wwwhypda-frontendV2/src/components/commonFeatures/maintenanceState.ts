// Independent of account/session epochs: maintenance never clears personal drafts.
export const maintenanceEvent = 'wwhypda-maintenance';
let active = false;
export function maintenanceActive(): boolean { return active; }
export function setMaintenance(value: boolean): void {
    if (active === value) return;
    active = value;
    window.dispatchEvent(new Event(maintenanceEvent));
}
