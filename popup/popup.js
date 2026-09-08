import { getCurrentTime } from '../time.js';

const currentTime = document.querySelector('#current-time');
currentTime.innerText = getCurrentTime();


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

  console.log('Extension enabled:', enabled);
});
