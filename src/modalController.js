// Modal overlay rendering extracted from main.js.
//
// createModalController({ ctx, helpers, skillBranches }) returns ctx-bound
// draw functions for each in-game overlay panel. All functions take plain data
// objects — no closures over game state — so they can be moved and tested
// independently of the main game loop.
//
// Import once after the render helpers are wired up:
//   const _mc = createModalController({ ctx, helpers: _renderHelpers, skillBranches: SKILL_BRANCH_LABELS });
// Then call per-frame inside drawHud():
//   if (dialogueOpen) _mc.drawDialoguePanel({ ... });

import { FACTION_NAMES } from "./factionEffects.js";
import { resolveScrollableRowWindow } from "./render.js";

export function createModalController({ ctx, helpers, skillBranches }) {
  if (!ctx) throw new Error("createModalController requires ctx");
  if (!helpers) throw new Error("createModalController requires helpers");
  if (!Array.isArray(skillBranches)) throw new Error("createModalController requires skillBranches array");

  const { fillRoundedRect, strokeRoundedRect, drawSoftPanel, drawClippedText, fitText } = helpers;

  // ── Game Over ─────────────────────────────────────────────────────────────

  function drawGameOverPanel({ canvasWidth, canvasHeight, margin, deaths, t }) {
    const compact = canvasWidth < 560;
    ctx.fillStyle = "rgba(18, 4, 5, 0.78)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    const panelW = Math.min(500, canvasWidth - margin * 2);
    const panelH = 150;
    const px = (canvasWidth - panelW) / 2;
    const py = canvasHeight * 0.38;
    drawSoftPanel(px, py, panelW, panelH, {
      top: "rgba(48, 18, 18, 0.9)",
      bottom: "rgba(18, 8, 9, 0.88)",
      border: "rgba(255, 166, 138, 0.36)",
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe3d8";
    ctx.font = `bold ${compact ? 28 : 38}px Georgia`;
    ctx.fillText(t("labels.defeatedTitle"), canvasWidth * 0.5, py + 48);
    ctx.font = "20px Georgia";
    ctx.fillText(t("labels.recover"), canvasWidth * 0.5, py + 83);
    ctx.font = "italic 16px Georgia";
    ctx.fillStyle = "#ffa0a0";
    ctx.fillText(
      fitText(t("labels.deathsLine", { deaths: deaths + 1 }), panelW - 36),
      canvasWidth * 0.5, py + 112,
    );
    ctx.textAlign = "left";
  }

  // ── Victory / Run Summary ─────────────────────────────────────────────────

  function drawVictoryPanel({ summary, ending, canvasWidth, canvasHeight, margin }) {
    const compact = canvasWidth < 560;
    ctx.fillStyle = "rgba(8, 11, 16, 0.8)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    const panelW = Math.min(620, canvasWidth - margin * 2);
    const decisions = summary.latestDecisions.length
      ? summary.latestDecisions
      : ["No major decisions recorded."];
    const decisionsCount = Math.min(3, decisions.length);
    const trophyHighlights = (summary.houseTrophyHighlights || []).slice(0, 3);
    const trophyDisplay = trophyHighlights.length
      ? trophyHighlights
      : [summary.houseTrophyLine || "No house trophies recorded yet."];
    const trophyCap = compact ? 2 : 3;
    const trophyCount = Math.min(trophyCap, trophyDisplay.length);
    const layout = resolveVictoryPanelLayout({ canvasWidth, canvasHeight, margin, decisionsCount, trophyCount });
    const { panelH, px, py, trophyHeaderY, trophyFirstY, footerY } = layout;
    const decisionLineH = 18;
    const trophyLineH = 18;

    drawSoftPanel(px, py, panelW, panelH, {
      top: "rgba(34, 28, 42, 0.95)",
      bottom: "rgba(8, 12, 18, 0.94)",
      border: "rgba(255, 196, 144, 0.58)",
    });

    ctx.textAlign = "left";
    ctx.font = `bold ${compact ? 26 : 34}px Georgia`;
    drawClippedText(ending.title || "Lantern Revolt Complete", px + 22, py + 46, panelW - 44, "#ffc490");
    ctx.font = "14px Georgia";
    drawClippedText(
      ending.summary || "Dustward will remember what you changed.",
      px + 22, py + 72, panelW - 44, "#f3ecd8",
    );

    ctx.font = "bold 13px Georgia";
    drawClippedText("Run Summary", px + 22, py + 110, panelW - 44, "#ffe16a");
    ctx.font = "12px Georgia";
    const leftX = px + 22;
    const rightX = px + Math.floor(panelW * 0.52);
    const rows = [
      ["Time", summary.durationLabel],
      ["Kills", String(summary.kills)],
      ["Mini-bosses", String(summary.miniBossKills)],
      ["Resources", String(summary.resourcesHarvested)],
      ["Quest outcomes", String(summary.questOutcomesCount)],
      ["Dialogue picks", String(summary.dialogueChoicesCount || 0)],
      ["Gold", String(summary.gold)],
      ["Level", String(summary.level)],
      ["Home proof", String(summary.houseTrophyCount || 0)],
      ["Companion", summary.companion],
    ];
    for (let i = 0; i < rows.length; i++) {
      const x = i < 5 ? leftX : rightX;
      const y = py + 135 + (i % 5) * 23;
      drawClippedText(`${rows[i][0]}: ${rows[i][1]}`, x, y, panelW * 0.44, "#e6d8bd");
    }

    const axes = summary.axes || {};
    ctx.font = "12px Georgia";
    drawClippedText(
      `Axes: Control/Freedom ${axes.controlVsFreedom || 0}, Truth/Comfort ${axes.truthVsComfort || 0}, Solidarity/Status ${axes.solidarityVsStatus || 0}`,
      px + 22, py + 238, panelW - 44, "#cbb6a2",
    );
    ctx.font = "bold 12px Georgia";
    drawClippedText("Latest Decisions", px + 22, py + 266, panelW - 44, "#ffe16a");
    ctx.font = "11px Georgia";
    for (let i = 0; i < decisionsCount; i++) {
      drawClippedText(`- ${decisions[i]}`, px + 22, py + 287 + i * decisionLineH, panelW - 44, "#e6d8bd");
    }
    ctx.font = "bold 12px Georgia";
    drawClippedText("Home Trophies", px + 22, py + trophyHeaderY, panelW - 44, "#ffe16a");
    ctx.font = "11px Georgia";
    for (let i = 0; i < trophyCount; i++) {
      drawClippedText(`- ${trophyDisplay[i]}`, px + 22, py + trophyFirstY + i * trophyLineH, panelW - 44, "#e6d8bd");
    }
    ctx.font = "italic 11px Georgia";
    drawClippedText(
      "Progress is saved. Load this ending from the title screen later.",
      px + 22, py + footerY, panelW - 44, "#b8a792",
    );
  }

  // ── Dialogue Choice ───────────────────────────────────────────────────────

  function drawDialoguePanel({ npcName, choices, selection, canvasWidth, canvasHeight, margin, describeChoiceEffectTags }) {
    const sw = Math.min(520, canvasWidth - margin * 2);
    const sh = 122 + choices.length * 64;
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.floor((canvasHeight - sh) / 2);
    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(18, 24, 32, 0.95)",
      bottom: "rgba(8, 12, 18, 0.94)",
      border: "rgba(168, 215, 255, 0.56)",
    });
    ctx.font = "bold 18px Georgia";
    drawClippedText(`Speaking with ${npcName}`, sx + 18, sy + 30, sw - 36, "#cce4ff");
    ctx.font = "12px Georgia";
    drawClippedText("↑/↓ select  Enter say it  Esc back", sx + 18, sy + 50, sw - 36, "#a9b8d0");
    for (let i = 0; i < choices.length; i++) {
      const c = choices[i];
      const iy = sy + 68 + i * 64;
      const selected = i === selection;
      fillRoundedRect(sx + 10, iy, sw - 20, 56, 7, selected ? "rgba(168, 215, 255, 0.22)" : "rgba(255,255,255,0.06)");
      if (selected) strokeRoundedRect(sx + 10.5, iy + 0.5, sw - 21, 55, 7, "#cce4ff", 1);
      ctx.font = "bold 13px Georgia";
      drawClippedText(`> ${c.prompt}`, sx + 22, iy + 20, sw - 44, selected ? "#cce4ff" : "#f3ecd8");
      ctx.font = "italic 11px Georgia";
      const tags = describeChoiceEffectTags(c);
      drawClippedText(tags || `Chapter ${c.chapter || 1}`, sx + 22, iy + 40, sw - 44, "#9aa6bf");
    }
  }

  // ── Quest Outcome ─────────────────────────────────────────────────────────

  function drawQuestOutcomePanel({ outcomes, selection, canvasWidth, canvasHeight, margin }) {
    const sw = Math.min(520, canvasWidth - margin * 2);
    const sh = 132 + outcomes.length * 76;
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.floor((canvasHeight - sh) / 2);
    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(24, 18, 31, 0.95)",
      bottom: "rgba(10, 8, 16, 0.94)",
      border: "rgba(255, 196, 144, 0.56)",
    });
    ctx.font = "bold 20px Georgia";
    drawClippedText("Quest Outcome", sx + 18, sy + 30, sw - 36, "#ffc490");
    ctx.font = "12px Georgia";
    drawClippedText("Choose the consequence. ↑/↓ select  Enter confirm", sx + 18, sy + 52, sw - 36, "#cbb6a2");
    for (let i = 0; i < outcomes.length; i++) {
      const outcome = outcomes[i];
      const iy = sy + 72 + i * 76;
      const selected = i === selection;
      fillRoundedRect(sx + 10, iy, sw - 20, 66, 7, selected ? "rgba(255, 196, 144, 0.2)" : "rgba(255, 255, 255, 0.055)");
      if (selected) strokeRoundedRect(sx + 10.5, iy + 0.5, sw - 21, 65, 7, "#ffc490", 1);
      ctx.font = "bold 14px Georgia";
      drawClippedText(outcome.label, sx + 22, iy + 20, sw - 44, selected ? "#ffc490" : "#f3ecd8");
      ctx.font = "italic 12px Georgia";
      drawClippedText(outcome.summary, sx + 22, iy + 42, sw - 44, "#b8a792");
    }
  }

  // ── Character Sheet ───────────────────────────────────────────────────────

  function drawCharacterSheetPanel({
    summary, gearSummary, inventorySummary, workstationSummary, houseProgress,
    regionProfile, explorationRenown, factionRep, companion, house, playerStance,
    canvasWidth, canvasHeight, margin,
  }) {
    const effects = summary.effects || {};
    const sw = Math.min(620, canvasWidth - margin * 2);
    const sh = Math.min(
      canvasHeight - margin * 2,
      canvasHeight < 380 ? canvasHeight - margin * 2 : 382,
    );
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.max(margin, Math.floor((canvasHeight - sh) / 2));
    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(21, 25, 32, 0.96)",
      bottom: "rgba(8, 11, 16, 0.94)",
      border: "rgba(216, 188, 106, 0.55)",
    });

    ctx.font = "bold 22px Georgia";
    drawClippedText(`${summary.originLabel} ${summary.roleLabel}`, sx + 20, sy + 34, sw - 40, "#ffd77b");
    ctx.font = "12px Georgia";
    drawClippedText(summary.originSummary, sx + 20, sy + 56, sw - 40, "#d8c7a8");

    const factionLine = Object.entries(factionRep || {})
      .map(([id, val]) => `${FACTION_NAMES[id] || id} ${val}`)
      .join(" / ");
    const sheetLines = [
      { text: `Attributes: ${summary.attributeLine}`, color: "#e6d8bd" },
      { text: `Hooks: HP +${effects.maxHpBonus || 0}, Stamina +${effects.staminaReserveBonus || 0}, Barter +${effects.barterBonusPct || 0}%, Craft +${effects.craftingYieldPct || 0}%`, color: "#d8c7a8" },
      { text: `Weapon: ${gearSummary.weaponLine} - ${gearSummary.handlingLine}`, color: "#e6d8bd" },
      { text: `Weapon branch: ${gearSummary.branchLine}`, color: "#d8c7a8" },
      { text: `Armor: ${gearSummary.armorLine} - weight ${gearSummary.armorWeight}`, color: "#d8c7a8" },
      { text: `Earned gear: ${inventorySummary.ownedArmorLine}`, color: "#d8c7a8" },
      { text: `Weapon tokens: ${inventorySummary.weaponTokenLine}`, color: "#d8c7a8" },
      { text: `Crafting: ${gearSummary.economyLine}`, color: "#d8c7a8" },
      { text: `Station: ${workstationSummary.benefitLine}`, color: "#d8c7a8" },
      { text: `Projects: ${workstationSummary.projectsLine}`, color: "#cbb6a2" },
      { text: `Home proof: ${houseProgress.trophyLine}`, color: "#ffe16a" },
      { text: `Exploration: ${explorationRenown.progressLine}`, color: "#ffe16a" },
      { text: `Region: ${regionProfile.label} - ${regionProfile.mood}`, color: "#ffe16a" },
      { text: `Landmarks: ${regionProfile.landmarkHints.slice(0, 4).join(", ")}`, color: "#cbb6a2" },
      { text: `Danger: ${regionProfile.dangerIdentity}`, color: "#cbb6a2" },
      { text: `Stance: ${playerStance}`, color: "#e6d8bd" },
      { text: `Faction lean: ${FACTION_NAMES[summary.factionLean] || summary.factionLean}`, color: "#d8c7a8" },
      { text: `Rep: ${factionLine}`, color: "#cbb6a2" },
      {
        text: `Companion: ${companion.active ? companion.name : companion.downed ? `${companion.name} recovering` : "none"} / House: ${house.unlocked ? `owned / workbench ${workstationSummary.level}` : "locked"}`,
        color: "#b8a792",
      },
    ];
    ctx.font = "12px Georgia";
    let lineY = sy + 88;
    const lineGap = sh < 300 ? 16 : 20;
    for (const line of sheetLines) {
      if (lineY > sy + sh - 24) break;
      drawClippedText(line.text, sx + 20, lineY, sw - 40, line.color);
      lineY += lineGap;
    }
    ctx.font = "italic 11px Georgia";
    drawClippedText("Press I or Esc to close.", sx + 20, sy + sh - 14, sw - 40, "#9d927d");
  }

  // ── Skill Screen ──────────────────────────────────────────────────────────

  function drawSkillScreenPanel({ skillTree, upgradePoints, selection, canvasWidth, canvasHeight, margin }) {
    const sw = Math.min(440, canvasWidth - margin * 2);
    const sh = skillBranches.length * 64 + 110;
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.floor((canvasHeight - sh) / 2);
    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(20, 22, 36, 0.94)",
      bottom: "rgba(8, 10, 18, 0.92)",
      border: "rgba(186, 168, 255, 0.55)",
    });
    ctx.font = "bold 20px Georgia";
    drawClippedText("Skill Tree", sx + 16, sy + 30, sw - 32, "#cdb8ff");
    ctx.font = "12px Georgia";
    drawClippedText(`Upgrade points: ${upgradePoints}   (T to close)`, sx + 16, sy + 50, sw - 32, "#b9aedf");
    for (let i = 0; i < skillBranches.length; i++) {
      const branch = skillBranches[i];
      const ranks = skillTree?.[branch.id] || 0;
      const iy = sy + 70 + i * 64;
      const selected = i === selection;
      fillRoundedRect(sx + 8, iy, sw - 16, 56, 7, selected ? "rgba(186, 168, 255, 0.22)" : "rgba(255, 255, 255, 0.05)");
      if (selected) strokeRoundedRect(sx + 8.5, iy + 0.5, sw - 17, 55, 7, "#cdb8ff", 1);
      ctx.font = "bold 14px Georgia";
      drawClippedText(`${branch.label}  ${ranks}/5`, sx + 20, iy + 18, sw - 40, selected ? "#cdb8ff" : "#f3ecd8");
      ctx.font = "italic 12px Georgia";
      drawClippedText(branch.desc, sx + 20, iy + 36, sw - 40, "#a09cba");
    }
    ctx.font = "10px Georgia";
    drawClippedText("↑/↓ select   Enter unlock   Esc close", sx + 16, sy + sh - 14, sw - 32, "#9088b0");
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  function drawSettingsPanel({ rows, selection, canvasWidth, canvasHeight, margin, readSettingsRowValue }) {
    const sw = Math.min(440, canvasWidth - margin * 2);
    const sh = rows.length * 44 + 110;
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.floor((canvasHeight - sh) / 2);
    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(20, 26, 36, 0.94)",
      bottom: "rgba(8, 12, 18, 0.92)",
      border: "rgba(168, 215, 255, 0.55)",
    });
    ctx.font = "bold 20px Georgia";
    drawClippedText("Settings", sx + 16, sy + 30, sw - 32, "#cce4ff");
    ctx.font = "12px Georgia";
    drawClippedText("↑/↓ select  ←/→ change  Esc close", sx + 16, sy + 50, sw - 32, "#a9b8d0");
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const iy = sy + 70 + i * 44;
      const selected = i === selection;
      fillRoundedRect(sx + 8, iy, sw - 16, 38, 7, selected ? "rgba(168, 215, 255, 0.22)" : "rgba(255, 255, 255, 0.05)");
      if (selected) strokeRoundedRect(sx + 8.5, iy + 0.5, sw - 17, 37, 7, "#cce4ff", 1);
      ctx.font = "bold 14px Georgia";
      drawClippedText(row.label, sx + 20, iy + 16, sw * 0.55, selected ? "#cce4ff" : "#f3ecd8");
      ctx.font = "13px Georgia";
      ctx.textAlign = "right";
      ctx.fillStyle = selected ? "#cce4ff" : "#f3ecd8";
      if (row.kind === "action") {
        ctx.fillText("Enter ▶", sx + sw - 20, iy + 24);
      } else {
        const value = readSettingsRowValue(row);
        let valueText;
        if (row.kind === "bool") valueText = value ? "ON" : "OFF";
        else if (row.kind === "range") valueText = row.format ? row.format(value) : String(value);
        else valueText = String(value);
        ctx.fillText(`◀ ${valueText} ▶`, sx + sw - 20, iy + 24);
      }
      ctx.textAlign = "left";
    }
  }

  // ── Codex ─────────────────────────────────────────────────────────────────

  function drawCodexPanel({ codexTabs, entries, progress, codexTab, codexEntrySel, canvasWidth, canvasHeight, margin }) {
    const sw = Math.min(560, canvasWidth - margin * 2);
    const sh = Math.min(420, canvasHeight - margin * 2);
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.floor((canvasHeight - sh) / 2);
    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(20, 22, 32, 0.94)",
      bottom: "rgba(8, 10, 16, 0.92)",
      border: "rgba(186, 168, 255, 0.55)",
    });
    ctx.font = "bold 20px Georgia";
    drawClippedText(`Codex (${progress.unlocked}/${progress.total})`, sx + 16, sy + 28, sw - 32, "#cdb8ff");
    ctx.font = "11px Georgia";
    drawClippedText("Tab: ←/→  Entry: ↑/↓  Esc close", sx + 16, sy + 46, sw - 32, "#a09cba");

    const tabH = 26;
    const tabW = (sw - 32) / codexTabs.length;
    for (let i = 0; i < codexTabs.length; i++) {
      const tx = sx + 16 + i * tabW;
      const ty = sy + 56;
      const isActive = i === codexTab;
      fillRoundedRect(tx + 2, ty, tabW - 4, tabH, 6, isActive ? "rgba(186,168,255,0.32)" : "rgba(255,255,255,0.05)");
      if (isActive) strokeRoundedRect(tx + 2.5, ty + 0.5, tabW - 5, tabH - 1, 6, "#cdb8ff", 1);
      ctx.font = "bold 12px Georgia";
      ctx.textAlign = "center";
      ctx.fillStyle = isActive ? "#cdb8ff" : "#a09cba";
      ctx.fillText(codexTabs[i].toUpperCase(), tx + tabW / 2, ty + 17);
      ctx.textAlign = "left";
    }

    const listY = sy + 92;
    const listH = sh - 100;
    const rowH = 24;
    const visibleRows = Math.floor(listH / rowH);
    const startIdx = Math.max(0, Math.min(entries.length - visibleRows, codexEntrySel - Math.floor(visibleRows / 2)));
    for (let i = 0; i < visibleRows && startIdx + i < entries.length; i++) {
      const idx = startIdx + i;
      const entry = entries[idx];
      const iy = listY + i * rowH;
      const sel = idx === codexEntrySel;
      if (sel) fillRoundedRect(sx + 16, iy, sw - 32, rowH - 2, 5, "rgba(186,168,255,0.2)");
      ctx.font = "bold 12px Georgia";
      const titleColor = entry.unlocked ? (sel ? "#cdb8ff" : "#f3ecd8") : "#6e6890";
      drawClippedText(entry.unlocked ? entry.title : "???", sx + 24, iy + 16, sw * 0.32, titleColor);
      if (entry.unlocked) {
        ctx.font = "italic 11px Georgia";
        drawClippedText(entry.body, sx + 24 + sw * 0.32, iy + 16, sw * 0.55, "#a09cba");
      } else {
        ctx.font = "italic 11px Georgia";
        drawClippedText("(undiscovered)", sx + 24 + sw * 0.32, iy + 16, sw * 0.55, "#5a5478");
      }
    }
  }

  // ── Shop ──────────────────────────────────────────────────────────────────

  function drawShopPanel({ items, selection, gold, priceNote, t, canvasWidth, canvasHeight, margin, resolveShopItemCost, shopItemName, shopItemDesc }) {
    const sw = Math.min(420, canvasWidth - margin * 2);
    const shopWindow = resolveScrollableRowWindow({
      itemCount: items.length,
      selectedIndex: selection,
      canvasHeight,
      margin,
      rowHeight: 52,
      headerHeight: 110,
      minRows: 5,
      maxRows: items.length || 1,
      emptyRows: 0,
    });
    const visibleRows = shopWindow.visibleRows;
    const firstRow = shopWindow.firstIndex;
    const sh = shopWindow.height;
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.floor((canvasHeight - sh) / 2);

    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(18, 28, 31, 0.94)",
      bottom: "rgba(8, 14, 18, 0.92)",
      border: "rgba(255, 215, 123, 0.5)",
    });
    ctx.font = "bold 20px Georgia";
    drawClippedText(t("labels.shopTitle"), sx + 16, sy + 30, sw - 32, "#ffd77b");
    ctx.font = "12px Georgia";
    drawClippedText(`${t("labels.shopHeader", { gold })}  ${selection + 1}/${items.length}`, sx + 16, sy + 50, sw - 32, "#c9b889");
    ctx.font = "11px Georgia";
    drawClippedText(priceNote, sx + 16, sy + 68, sw - 32, "#aebfa5");

    for (let visible = 0; visible < visibleRows; visible++) {
      const i = firstRow + visible;
      const item = items[i];
      const iy = sy + 80 + visible * 52;
      const selected = i === selection;
      fillRoundedRect(sx + 8, iy, sw - 16, 46, 7, selected ? "rgba(216, 188, 106, 0.24)" : "rgba(255, 255, 255, 0.05)");
      if (selected) strokeRoundedRect(sx + 8.5, iy + 0.5, sw - 17, 45, 7, "#ffd77b", 1);
      ctx.font = "bold 14px Georgia";
      drawClippedText(shopItemName(item), sx + 20, iy + 18, sw - 112, selected ? "#ffd77b" : "#f3ecd8");
      const displayCost = resolveShopItemCost(item);
      ctx.fillStyle = item.cost < 0 ? "#5fe0b5" : (gold >= displayCost ? "#ffd77b" : "#ff6b6b");
      ctx.font = "14px Georgia";
      ctx.textAlign = "right";
      ctx.fillText(item.cost < 0 ? `+${Math.abs(item.cost)}g` : `${displayCost}g`, sx + sw - 20, iy + 18);
      ctx.textAlign = "left";
      ctx.font = "italic 12px Georgia";
      drawClippedText(shopItemDesc(item), sx + 20, iy + 36, sw - 40, "#a09880");
    }
  }

  // ── Job Board ─────────────────────────────────────────────────────────────

  function drawJobBoardPanel({ choices, selection, boardCopy, canvasWidth, canvasHeight, margin }) {
    const sw = Math.min(540, canvasWidth - margin * 2);
    const jobWindow = resolveScrollableRowWindow({
      itemCount: choices.length,
      selectedIndex: selection,
      canvasHeight,
      margin,
      rowHeight: 78,
      headerHeight: 108,
      minRows: 3,
      maxRows: 7,
      emptyRows: 1,
    });
    const rows = jobWindow.visibleRows;
    const firstRow = jobWindow.firstIndex;
    const sh = jobWindow.height;
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.floor((canvasHeight - sh) / 2);
    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(20, 27, 24, 0.96)",
      bottom: "rgba(9, 13, 12, 0.94)",
      border: "rgba(255, 211, 107, 0.55)",
    });
    ctx.font = "bold 20px Georgia";
    drawClippedText(boardCopy.title, sx + 16, sy + 30, sw - 32, "#ffd77b");
    ctx.font = "12px Georgia";
    drawClippedText(
      `${boardCopy.subtitle}  ${Math.min(selection + 1, choices.length || 1)}/${choices.length || 0}`,
      sx + 16, sy + 52, sw - 32, "#c9b889",
    );
    if (choices.length === 0) {
      fillRoundedRect(sx + 10, sy + 72, sw - 20, 54, 7, "rgba(255, 255, 255, 0.055)");
      ctx.font = "italic 13px Georgia";
      drawClippedText(boardCopy.emptyLine, sx + 22, sy + 104, sw - 44, "#b8a792");
    } else {
      for (let visible = 0; visible < Math.min(rows, choices.length); visible++) {
        const i = firstRow + visible;
        const job = choices[i];
        const iy = sy + 68 + visible * 78;
        const selected = i === selection;
        fillRoundedRect(sx + 10, iy, sw - 20, 70, 7, selected ? "rgba(216, 188, 106, 0.24)" : "rgba(255, 255, 255, 0.055)");
        if (selected) strokeRoundedRect(sx + 10.5, iy + 0.5, sw - 21, 69, 7, "#ffd77b", 1);
        ctx.font = "bold 14px Georgia";
        drawClippedText(`${job.title}  [${job.threat}]`, sx + 22, iy + 19, sw - 168, selected ? "#ffd77b" : "#f3ecd8");
        ctx.font = "12px Georgia";
        ctx.textAlign = "right";
        const statusLabel = job.status === "ready" ? "CLAIM" : (job.status === "failed" ? "REPORT" : job.kind.toUpperCase());
        ctx.fillStyle = job.status === "ready" ? "#5fe0b5" : (job.status === "failed" ? "#ff8f6d" : "#ffd77b");
        ctx.fillText(statusLabel, sx + sw - 22, iy + 19);
        ctx.textAlign = "left";
        ctx.font = "italic 12px Georgia";
        drawClippedText(
          job.status === "ready" ? `Ready: ${job.rewardLine}` : (job.status === "failed" ? job.progressLine : job.boardNote || job.hint),
          sx + 22, iy + 38, sw - 44, "#a09880",
        );
        ctx.font = "11px Georgia";
        drawClippedText(
          `${job.availabilityLine || job.regionHint}  ${job.progressLine}  ${job.rewardLine}${job.bonusLine && job.status === "available" ? `  ${job.bonusLine}` : ""}`,
          sx + 22, iy + 58, sw - 44, "#c9b889",
        );
      }
    }
  }

  // ── Workbench ─────────────────────────────────────────────────────────────

  function drawWorkbenchPanel({
    actions, catalog, selection, inventorySummary, workstationSummary,
    houseProgress, craftsCompleted, preparedUpgrade, canvasWidth, canvasHeight, margin,
  }) {
    const blocked = catalog.filter((action) => !action.available);
    const sw = Math.min(500, canvasWidth - margin * 2);
    const rows = Math.max(3, Math.min(6, actions.length || 1));
    const sh = rows * 58 + 124;
    const sx = Math.floor((canvasWidth - sw) / 2);
    const sy = Math.floor((canvasHeight - sh) / 2);
    drawSoftPanel(sx, sy, sw, sh, {
      top: "rgba(24, 23, 17, 0.96)",
      bottom: "rgba(10, 12, 10, 0.94)",
      border: "rgba(216, 188, 106, 0.58)",
    });
    ctx.font = "bold 20px Georgia";
    drawClippedText("Workbench", sx + 16, sy + 30, sw - 32, "#ffd77b");
    ctx.font = "12px Georgia";
    drawClippedText(
      `${workstationSummary.stationLine}  Enter/E craft  ↑/↓ select  Esc close`,
      sx + 16, sy + 52, sw - 32, "#c9b889",
    );
    ctx.font = "11px Georgia";
    drawClippedText(`Gear: ${inventorySummary.ownedArmorLine} | Home: ${houseProgress.planningLine}`, sx + 16, sy + 68, sw - 32, "#b8a792");

    if (actions.length === 0) {
      fillRoundedRect(sx + 10, sy + 86, sw - 20, 54, 7, "rgba(255, 255, 255, 0.055)");
      ctx.font = "italic 13px Georgia";
      drawClippedText("Bring 2 Wood + 1 Stone, gear finds, or refine materials.", sx + 22, sy + 117, sw - 44, "#b8a792");
    } else {
      for (let i = 0; i < Math.min(rows, actions.length); i++) {
        const action = actions[i];
        const iy = sy + 86 + i * 58;
        const selected = i === selection;
        fillRoundedRect(sx + 10, iy, sw - 20, 50, 7, selected ? "rgba(216, 188, 106, 0.24)" : "rgba(255, 255, 255, 0.055)");
        if (selected) strokeRoundedRect(sx + 10.5, iy + 0.5, sw - 21, 49, 7, "#ffd77b", 1);
        ctx.font = "bold 14px Georgia";
        drawClippedText(action.label, sx + 22, iy + 19, sw - 44, selected ? "#ffd77b" : "#f3ecd8");
        ctx.font = "italic 12px Georgia";
        drawClippedText(action.description, sx + 22, iy + 38, sw - 44, "#a09880");
      }
    }
    ctx.font = "italic 11px Georgia";
    const blockedLine = blocked.length
      ? `Blocked: ${blocked[0].label} (${blocked[0].blockedReason})`
      : `Benefits: ${workstationSummary.benefitLine}`;
    drawClippedText(blockedLine, sx + 16, sy + sh - 30, sw - 32, "#9d927d");
    drawClippedText(
      `Crafts completed: ${craftsCompleted || 0}  Prepared: ${preparedUpgrade || "none"}`,
      sx + 16, sy + sh - 16, sw - 32, "#9d927d",
    );
  }

  return {
    drawGameOverPanel,
    drawVictoryPanel,
    drawDialoguePanel,
    drawQuestOutcomePanel,
    drawCharacterSheetPanel,
    drawSkillScreenPanel,
    drawSettingsPanel,
    drawCodexPanel,
    drawShopPanel,
    drawJobBoardPanel,
    drawWorkbenchPanel,
  };
}

// ── Pure layout helpers (no ctx required) — exported so tests can verify ──────

export function resolveVictoryPanelLayout({ canvasWidth, canvasHeight, margin, decisionsCount, trophyCount }) {
  const decisionLineH = 18;
  const trophyLineH = 18;
  const decisionsBlockBottom = 287 + (decisionsCount - 1) * decisionLineH;
  const trophyHeaderY = decisionsBlockBottom + 25;
  const trophyFirstY = trophyHeaderY + 21;
  const trophyBlockBottom = trophyFirstY + (trophyCount - 1) * trophyLineH;
  const footerY = trophyBlockBottom + 22;
  const panelH = footerY + 14;
  const panelW = Math.min(620, canvasWidth - margin * 2);
  return {
    panelW,
    panelH,
    px: Math.floor((canvasWidth - panelW) / 2),
    py: Math.max(margin, Math.floor((canvasHeight - panelH) / 2)),
    trophyHeaderY,
    trophyFirstY,
    footerY,
  };
}
