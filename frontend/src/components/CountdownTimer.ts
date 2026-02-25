/**
 * Client-side countdown that ticks every second between API polls.
 * Stores each arrival's absolute arrival_time and recomputes minutes remaining.
 */

interface TimerEntry {
  element: HTMLElement;
  arrivalTime: Date;
}

const entries: TimerEntry[] = [];
let intervalId: number | null = null;

export function registerCountdown(element: HTMLElement, arrivalTimeISO: string): void {
  entries.push({ element, arrivalTime: new Date(arrivalTimeISO) });
}

export function clearCountdowns(): void {
  entries.length = 0;
}

function tick(): void {
  const now = Date.now();
  for (const entry of entries) {
    const diffMs = entry.arrivalTime.getTime() - now;
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    const seconds = Math.max(0, Math.floor((diffMs % 60000) / 1000));

    if (diffMs <= 0) {
      entry.element.textContent = "now";
      entry.element.classList.add("arriving-now");
    } else if (minutes === 0) {
      entry.element.textContent = `${seconds}s`;
      entry.element.classList.add("arriving-soon");
    } else {
      entry.element.textContent = `${minutes}m ${seconds}s`;
      entry.element.classList.remove("arriving-soon", "arriving-now");
    }
  }
}

export function startCountdownTimer(): void {
  if (intervalId !== null) return;
  intervalId = window.setInterval(tick, 1000);
  tick();
}

export function stopCountdownTimer(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
