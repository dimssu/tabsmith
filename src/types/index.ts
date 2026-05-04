export * from "./schemas";

export interface TabLike {
  id?: number;
  url?: string;
  title?: string;
  groupId?: number;
  windowId?: number;
  active?: boolean;
}

export interface TabSignature {
  tabId?: number;
  url: string;
  normalizedUrl: string;
  domain: string;
  pathSegments: string[];
  titleTokens: string[];
}

export interface ScoredCandidate<T> {
  candidate: T;
  score: number;
  breakdown: {
    domain: number;
    path: number;
    title: number;
  };
}

export type RuntimeBadge = {
  count: number;
  color?: string;
};
