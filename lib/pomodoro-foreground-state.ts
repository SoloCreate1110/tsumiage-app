let activePomodoroItemId: string | null = null;
let appIsActive = true;

export function setActivePomodoroItemScreen(itemId: string | null) {
  activePomodoroItemId = itemId;
}

export function setPomodoroAppActive(isActive: boolean) {
  appIsActive = isActive;
}

export function isPomodoroItemScreenActive(itemId: string) {
  return appIsActive && activePomodoroItemId === itemId;
}
