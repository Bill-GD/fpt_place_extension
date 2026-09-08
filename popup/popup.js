import { fetchFPTPlaceTab, getCurrentTime, isEnabled, toggleExtension } from '../utils.js';

const tab = await fetchFPTPlaceTab();

// time
const currentTime = document.querySelector('#current-time');
currentTime.innerText = getCurrentTime();
setInterval(() => {
  currentTime.innerText = getCurrentTime();
}, 1000);

// toggle
const toggleButton = document.querySelector('#toggle-button');

toggleButton.innerHTML = `Toggle: ${(await isEnabled())
  ? '<span class="toggle on">ON</span>'
  : '<span class="toggle off">OFF</span>'}`;

toggleButton.addEventListener('click', async () => {
  void toggleExtension();
});

// force claim
const forceClaimButton = document.querySelector('#force-claim-button');

forceClaimButton.addEventListener('click', async () => {
  if (!(await isEnabled()) || !tab) return;
  void chrome.tabs.sendMessage(tab.id, {
    action: 'clickClaimButton',
  });
});
