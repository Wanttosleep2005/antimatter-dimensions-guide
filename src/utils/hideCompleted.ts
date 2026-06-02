const KEY = 'ad-hide-completed';

export function getHideCompleted(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return true; // default: hide
  }
}

export function setHideCompleted(v: boolean) {
  localStorage.setItem(KEY, String(v));
  window.dispatchEvent(new Event('ad-hide-completed-changed'));
}
