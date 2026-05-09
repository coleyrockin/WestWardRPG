export interface Letter {
  id: string;
  poiId: string;
  title: string;
  author: string;
  body: string;
  refersTo: string[];
}
export declare const LETTERS: Letter[];
export function getLetterById(id: string): Letter | null;
export function getLetterByPoiId(poiId: string): Letter[];
export function resolveLetterChain(id: string, visited?: Set<string>): Letter[];
