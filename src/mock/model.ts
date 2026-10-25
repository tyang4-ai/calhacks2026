// The search model's ID and its real report. report stays null until S3-catalog T9 copies in B11's
// first real training report: nothing here is invented, and panels with no report say "Not trained yet".
import type { ModelReport } from "../core/types";

export const modelId = "cindia-embed-v1";

export const report: ModelReport | null = null;
