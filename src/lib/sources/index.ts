import type { SourceKey } from "@/lib/models";
import { arc } from "./arc";
import { atb } from "./atb";
import { bdjobs } from "./bdjobs";
import { ashby } from "./ashby";
import { facebook } from "./facebook";
import { googlejobs } from "./googlejobs";
import { glassdoor } from "./glassdoor";
import { greenhouse } from "./greenhouse";
import { hackernews } from "./hackernews";
import { himalayas } from "./himalayas";
import { indeed } from "./indeed";
import { jobicy } from "./jobicy";
import { jobright } from "./jobright";
import { builtin, earlytechroles, jobpilot, newgradai, remotelyaijobs, remoteworkapp, youhired } from "./jsonldBoard";
import { lever } from "./lever";
import { linkedin } from "./linkedin";
import { linkedinCompany } from "./linkedinCompany";
import { nextjobz } from "./nextjobz";
import { reddit } from "./reddit";
import { remoteok } from "./remoteok";
import { remoterocketship } from "./remoterocketship";
import { remotive } from "./remotive";
import { skilljobs } from "./skilljobs";
import type { SourceAdapter } from "./types";
import { wellfound } from "./wellfound";
import { wttj } from "./wttj";
import { weworkremotely } from "./weworkremotely";
import { workingnomads } from "./workingnomads";
import { x } from "./x";

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
  skilljobs,
  remotive,
  remoteok,
  jobicy,
  workingnomads,
  weworkremotely,
  hackernews,
  greenhouse,
  x,
  googlejobs,
  lever,
  ashby,
  remoteworkapp,
  earlytechroles,
  newgradai,
  youhired,
  jobpilot,
  remotelyaijobs,
  builtin,
  glassdoor,
  wttj,
};

export type { NormalizedJob, SourceAdapter } from "./types";
