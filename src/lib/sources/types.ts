import type { SourceKey } from "@/lib/models";

/** Common shape every source adapter produces from raw platform data. */
export interface NormalizedJob {
  source: SourceKey;
  externalId?: string;
  sourceUrl?: string;
  title: string;
  company?: string;
  location?: string;
  isRemote?: boolean;
  jobType?: string;
  /** Board's own seniority label, e.g. LinkedIn "Entry level". */
  level?: string;
  /** Experience requirement text, e.g. "At least 2 years", "0 to 2 years". */
  experience?: string;
  salary?: string;
  description?: string;
  skills?: string[];
  applyUrl?: string;
  postedAt?: Date;
  deadline?: Date;
  /**
   * For remote jobs: countries applicants must be in, as the board states them.
   * Empty/undefined = open worldwide. A remote job limited to other countries is filtered out.
   */
  remoteCountries?: string[];
  /** True when the item is free text (e.g. a Facebook post) and fields are guesses. */
  unstructured?: boolean;
}

export type Config = Record<string, unknown>;
export type RawItem = Record<string, unknown>;

export interface FetchContext {
  /** Fetch posts published after this moment (last successful check, or start of today). */
  since: Date;
  /** Per-source settings editable in Admin → Sources. */
  config: Config;
}

export interface SourceAdapter {
  key: SourceKey;
  name: string;
  /** "direct" sources call the platform's public feed (free); "apify" sources run an actor (paid per item). */
  kind: "direct" | "apify";
  /** How often the worker checks this platform for new posts. */
  intervalMinutes: number;
  enabledByDefault: boolean;
  defaultConfig: Config;
  /** Return raw posts published after ctx.since (may include a few repeats; dedup handles them). */
  fetchNew(ctx: FetchContext): Promise<RawItem[]>;
  normalize(raw: RawItem): NormalizedJob | null;
}
