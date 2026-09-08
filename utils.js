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
  return `${padStart(date.getHours())}:${padStart(date.getMinutes())}:${padStart(date.getSeconds())}`;
}

export function setMessage(str) {
  document.querySelector('#message').innerText = str;
}

export async function isEnabled() {
  const { enabled = false } = await chrome.storage.local.get('enabled');
  return enabled;
}

export async function toggleExtension() {
  const toggleButton = document.querySelector('#toggle-button');
  const { enabled = false } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({
    enabled: !enabled,
  });
  const newState = !enabled;
  toggleButton.innerHTML = `Toggle: ${newState
    ? '<span class="toggle on">ON</span>'
    : '<span class="toggle off">OFF</span>'}`;

  console.log('Extension enabled:', newState);
}

export async function fetchFPTPlaceTab() {
  const tabs = await chrome.tabs.query({
    url: 'https://place.fpt.com/',
  });

  if (tabs.length <= 0) {
    void toggleExtension();
    setMessage('Please open "place.fpt.com" (the home page)');
    return null;
  }

  await chrome.storage.local.set({
    tab: tabs[0],
  });

  return tabs[0];
}
