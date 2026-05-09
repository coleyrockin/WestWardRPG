export interface SideJobOptions {
  regionId?: string;
  factionRep?: Record<string, number>;
  questOutcomes?: Record<string, string>;
  dailySeed?: string;
  count?: number;
}
export interface GeneratedSideJob {
  id: string;
  type: string;
  region: string;
  factionLean: string | null;
  title: string;
  hint: string;
  rewardGold: number;
  rewardXp: number;
  rewardLine: string;
  boardState: "available";
  source: "generated";
}
export declare const SIDE_JOB_POOL: any[];
export function generateSideJobs(options?: SideJobOptions): GeneratedSideJob[];
