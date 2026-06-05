// Public surface of the Pricing Engine. Other modules import ONLY from here —
// never from internal files. The wishlist uses this now; cost-to-complete later.

export { scrapeProduct } from "./scraper";
export { searchAllRetailers } from "./search";
export { scoreCandidate, normalize, MATCH_THRESHOLD } from "./matcher";
export { extractProduct, mergeIn } from "./extract";
export { adapterForUrl, searchAdapters } from "./adapters";

export type {
  Product,
  SearchQuery,
  Candidate,
  ScoredCandidate,
  RetailerResult,
  SearchOutcome,
} from "./types";
