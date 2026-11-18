export interface Scene {
  title: string;
  mount(container: HTMLElement, signal: AbortSignal): void;
}

export const scenes: readonly Scene[] = [];
