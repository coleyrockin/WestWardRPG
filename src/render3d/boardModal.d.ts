export type BoardModalController = {
  open(): void;
  close(): void;
  accept(): void;
  choose(optionId: string): void;
  dispose(): void;
  isOpen(): boolean;
};

export function createBoardModalController(options?: {
  modal?: any;
  acceptButton?: any;
  optionButtons?: any[];
  closeButton?: any;
  setPromptText?: (text: string) => void;
  onAccept?: () => void;
  onChoose?: ((optionId: string) => void) | null;
  onClose?: () => void;
  onOpen?: () => void;
}): BoardModalController;
