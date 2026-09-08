export const DEFAULT_TIMESTAMPS = [
  '08:30:00',
  '09:15:00',
  '10:00:00',
  '10:45:00',
  '11:30:00',
  '12:15:00',
  '13:00:00',
  '13:45:00',
  '14:30:00',
  '15:15:00',
  '16:00:00',
];

function padStart(value) {
  return String(value).padStart(2, '0');
}

export function getCurrentTime() {
  const date = new Date();
  const hour = date.getHours(), minute = date.getMinutes(), second = date.getSeconds();
  return {
    hour,
    minute,
    second,
    started() {
      return (hour >= 8 && minute >= 30) && hour <= 16;
    },
    toString() {
      return `${padStart(hour)}:${padStart(minute)}:${padStart(second)}`;
    },
  };
}

export async function setMessage(str) {
  await chrome.storage.local.set({ message: str });
  if (typeof document !== 'undefined') {
    const messageEl = document.querySelector('#message');
    if (messageEl) {
      messageEl.innerText = str;
    }
  }
}

export function setNextTime(time) {
  if (typeof document !== 'undefined') {
    const nextTimeEl = document.querySelector('#next-time');
    if (nextTimeEl) {
      nextTimeEl.innerText = time;
    }
  }
}

export function calcNextTime() {
  const currentTime = getCurrentTime();
}

export async function isEnabled() {
  const { enabled = false } = await chrome.storage.local.get('enabled');
  return enabled;
}

export async function toggleExtension() {
  const { enabled = false } = await chrome.storage.local.get('enabled');
  const newState = !enabled;
  await chrome.storage.local.set({ enabled: newState });

  if (typeof document !== 'undefined') {
    const toggleButton = document.querySelector('#toggle-button');
    if (toggleButton) {
      toggleButton.innerHTML = `Toggle: ${newState
        ? '<span class="toggle on">ON</span>'
        : '<span class="toggle off">OFF</span>'}`;
    }
  }

  console.log('Extension enabled:', newState);
  return newState;
}

export async function fetchFPTPlaceTab() {
  const tabs = await chrome.tabs.query({
    url: 'https://place.fpt.com/*',
  });

  if (tabs.length <= 0) {
    await setMessage('Please open "place.fpt.com" (the home page)');
    return null;
  }

  return tabs[0];
}
