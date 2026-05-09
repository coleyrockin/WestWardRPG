export declare const SEASON_CYCLE: number;
export declare const SECONDS_PER_DAY: number;
export declare const SEASONS: string[];
export function resolveCurrentSeason(calendarDay?: number): string;
export function advanceCalendarDay(world: any, dt: number): void;
export function resolveSeasonModifiers(season: string, regionId: string): { spawnMult: number; visibilityMod: number; vendorBonus: boolean; eventLabel: string | null };
export function resolveSeasonLabel(calendarDay: number): string;
