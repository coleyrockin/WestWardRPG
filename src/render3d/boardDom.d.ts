import type { BoardView } from "./boardCopy.js";

export type BoardDomRefs = {
  title: any | null;
  boone: any | null;
  body: any | null;
  reward: any | null;
  listings: any | null;
  accept: any | null;
  close: any | null;
  optionButtons: any[];
  createElement: ((tagName: string) => any) | null;
};

export function createBoardDomRefs(rootDocument?: any): BoardDomRefs;
export function syncBoardDom(refs: BoardDomRefs, view: BoardView): void;
