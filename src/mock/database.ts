// The scripted data.synced snapshot the tour plays at d15 (B13's shape), shown under the Simulated
// badge. S3-catalog T1 stub: no tables and no processes until T8 counts them from the mock data.
import type { Payloads } from "../core/events";

export const demoDataSync: Payloads["data.synced"] = { tables: [], screens: 0, processes: [] };
