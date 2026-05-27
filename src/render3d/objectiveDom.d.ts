export type ObjectiveDomRefs = {
  label: any | null;
  text: any | null;
  meta: any | null;
  tag: any | null;
  createElement: ((tagName: string) => any) | null;
};

export function createObjectiveDomRefs(rootDocument?: any): ObjectiveDomRefs;
export function syncObjectiveDom(refs: ObjectiveDomRefs, snapshot?: any, loopState?: any): void;
