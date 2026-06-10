export type BoardPin = {
  title: string;
  detail: string;
  rewardLine: string;
};

export type BoardView = {
  mode: "offer" | "active" | "completed";
  title: string;
  booneLine: string;
  bodyLines: string[];
  rewardLine: string;
  progressLine: string;
  listings: BoardPin[];
};

export function buildBoardView(state: Record<string, any>): BoardView;
