// The one list the data tests, B11, B14 and B15 check text against (A2 R28, contracts section 11).
// S3-catalog T1 stub: the word lists are empty until T2 writes them. allowedHosts is the plan's exact
// value already. Relative /market/ paths are allowed besides these hosts.

export interface ContentRules {
  /** The kept-out list. These words appear only in a community's protocols and here. */
  bannedObjects: string[];
  stereotypeWords: string[];
  meaningWords: string[];
  /** English and Chinese. */
  accusingWords: string[];
  /** Each nation's names in English and Chinese, by community ID. T2 settles the general terms' key. */
  peopleNames: Record<string, string[]>;
  allowedHosts: string[];
}

export const contentRules: ContentRules = {
  bannedObjects: [],
  stereotypeWords: [],
  meaningWords: [],
  accusingWords: [],
  peopleNames: {},
  allowedHosts: ["example.com", "example.org"],
};
