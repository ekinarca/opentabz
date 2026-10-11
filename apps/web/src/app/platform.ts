/** "⌘" on Apple platforms, "Ctrl" elsewhere, for shortcut hints. */
export function modKey(): string {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) || navigator.userAgent.includes('Mac OS X')
    ? '⌘'
    : 'Ctrl';
}

/** Whether the platform's primary modifier (⌘ or Ctrl) is held. */
export function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return modKey() === '⌘' ? event.metaKey : event.ctrlKey;
}

/**
 * Whether a click or key press still counts as the user's: browsers open dialogs (print) and
 * devices (the microphone) only then. Browsers without the API are taken to allow it.
 */
export function userJustActed(): boolean {
  const activation = (navigator as Partial<Navigator>).userActivation;
  return activation === undefined || activation.isActive;
}
