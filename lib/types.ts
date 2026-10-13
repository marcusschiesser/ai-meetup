export type Demo = {
  id: string;
  date: string;
  firstName: string | null;
  description: string;
  createdAt: string;
};
export type Topic = {
  id: string;
  firstName: string;
  description: string;
  createdAt: string;
  voteCount: number;
  voted: boolean;
};
export type Board = {
  demos: Demo[];
  topics: Topic[];
  organizer: boolean;
  today: string;
};
export type ActionResult =
  { ok: true } | { ok: false; error: string; fields?: Record<string, string> };
