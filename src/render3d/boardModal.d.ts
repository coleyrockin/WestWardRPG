export type BoardModalController = {
  open(): void;
  close(): void;
  accept(): void;
  dispose(): void;
  isOpen(): boolean;
};

export function createBoardModalController(options?: {
  modal?: any;
  acceptButton?: any;
  closeButton?: any;
  setPromptText?: (text: string) => void;
  onAccept?: () => void;
  onClose?: () => void;
  onOpen?: () => void;
}): BoardModalController;
