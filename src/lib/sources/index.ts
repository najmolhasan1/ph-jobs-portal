import type { SourceKey } from "@/lib/models";
import { arc } from "./arc";
import { atb } from "./atb";
import { bdjobs } from "./bdjobs";
import { facebook } from "./facebook";
import { himalayas } from "./himalayas";
import { indeed } from "./indeed";
import { jobright } from "./jobright";
import { linkedin } from "./linkedin";
import { linkedinCompany } from "./linkedinCompany";
import { nextjobz } from "./nextjobz";
import { reddit } from "./reddit";
import { remoterocketship } from "./remoterocketship";
import type { SourceAdapter } from "./types";
import { wellfound } from "./wellfound";

export const adapters: Record<SourceKey, SourceAdapter> = {
  bdjobs,
  atb,
  nextjobz,
  linkedin,
  linkedin_company: linkedinCompany,
  facebook,
  himalayas,
  remoterocketship,
  arc,
  wellfound,
  jobright,
  reddit,
  indeed,
};

export type { NormalizedJob, SourceAdapter } from "./types";
