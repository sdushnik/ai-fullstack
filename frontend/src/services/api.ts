// To use a real backend, implement `ReplayApi` (see ./types) and export it here.
import { createMockApi } from "./mock";
import type { ReplayApi } from "./types";

export const api: ReplayApi = createMockApi();
