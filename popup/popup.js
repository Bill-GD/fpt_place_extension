import { clickClaimButton } from '../scripts/runner.js';
import { getCurrentTime } from '../time.js';

// time
const currentTime = document.querySelector('#current-time');
currentTime.innerText = getCurrentTime();
setInterval(() => {
  currentTime.innerText = getCurrentTime();
}, 1000);

// toggle
const toggleButton = document.querySelector('#toggle-button');

const { enabled = false } = await chrome.storage.local.get('enabled');
toggleButton.innerHTML = `Toggle: ${enabled ? '<span class="toggle on">ON</span>' : '<span class="toggle off">OFF</span>'}`;

toggleButton.addEventListener('click', async () => {
  const { enabled = false } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({
    enabled: !enabled,
  });
  const newState = !enabled;
  toggleButton.innerHTML = `Toggle: ${newState ? '<span class="toggle on">ON</span>' : '<span class="toggle off">OFF</span>'}`;

  console.log('Extension enabled:', newState);
});

// force claim
const forceClaimButton = document.querySelector('#force-claim-button');
forceClaimButton.addEventListener('click', () => {
  clickClaimButton();
});
