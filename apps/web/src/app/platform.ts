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
