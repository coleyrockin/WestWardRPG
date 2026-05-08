export interface MusicProfile {
  rootHz: number;
  scale: number[];
  tempoBPM: number;
  padType: string;
  padGain: number;
  padDetuneCents: number;
  melodyType: string;
  melodyGain: number;
  melodyPattern: number[];
  tensionRootHz: number;
  tensionType: string;
  tensionMaxGain: number;
}

export function applyOutcomeModulation(
  baseProfile: MusicProfile,
  narrative: { questOutcomes?: Record<string, string> } | null | undefined,
): MusicProfile;
