export interface InputManager {
  register(code: string, handler: (e: KeyboardEvent) => void, options?: { preventDefault?: boolean; modes?: string[] }): this;
  unregister(code: string): void;
  dispatch(event: KeyboardEvent, currentMode?: string): boolean;
  registerAll(map: Record<string, any>): this;
  readonly size: number;
}
export function createInputManager(): InputManager;
