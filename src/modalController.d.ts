export function createModalController(opts: { ctx: any; helpers: any; skillBranches: any[] }): {
  drawGameOverPanel(data: any): void;
  drawVictoryPanel(data: any): void;
  drawDialoguePanel(data: any): void;
  drawQuestOutcomePanel(data: any): void;
  drawCharacterSheetPanel(data: any): void;
  drawSkillScreenPanel(data: any): void;
  drawSettingsPanel(data: any): void;
  drawCodexPanel(data: any): void;
  drawShopPanel(data: any): void;
  drawJobBoardPanel(data: any): void;
  drawWorkbenchPanel(data: any): void;
};

export function resolveVictoryPanelLayout(opts: {
  canvasWidth: number;
  canvasHeight: number;
  margin: number;
  decisionsCount: number;
  trophyCount: number;
}): {
  panelW: number;
  panelH: number;
  px: number;
  py: number;
  trophyHeaderY: number;
  trophyFirstY: number;
  footerY: number;
};
