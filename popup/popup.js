import {
  calcNextTime,
  DEFAULT_TIMESTAMPS,
  fetchFPTPlaceTab,
  getCurrentTime,
  isEnabled,
  setMessage,
  setNextTime,
  toggleExtension,
  updateCollected,
} from '../utils.js';

void fetchFPTPlaceTab();

// current time
const currentTime = document.querySelector('#current-time');
currentTime.innerText = getCurrentTime().toString();
setInterval(() => {
  currentTime.innerText = getCurrentTime().toString();
}, 1000);

// status
const statusLabel = document.querySelector('#status');
statusLabel.innerText = getCurrentTime().started() ? 'Started' : 'Ended';

// collected
void updateCollected();

// next timestamp
const { nextTime: nextTimeStr = DEFAULT_TIMESTAMPS[0] } = await chrome.storage.local.get('nextTime');
setNextTime(nextTimeStr, false);

// toggle
const toggleButton = document.querySelector('#toggle-button');

toggleButton.innerHTML = `Toggle: ${(await isEnabled())
  ? '<span class="toggle on">ON</span>'
  : '<span class="toggle off">OFF</span>'}`;

toggleButton.addEventListener('click', async () => {
  void toggleExtension();
});

// restore saved message
const { message: savedMessage } = await chrome.storage.local.get('message');
if (savedMessage) {
  const messageEl = document.querySelector('#message');
  if (messageEl) messageEl.innerText = savedMessage;
}

// listen for storage changes (e.g. from background or content script)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.message) {
    const messageEl = document.querySelector('#message');
    if (messageEl) messageEl.innerText = changes.message.newValue;
  }
});

// force claim
const forceClaimButton = document.querySelector('#force-claim-button');

forceClaimButton.addEventListener('click', async () => {
  if (!(await isEnabled())) {
    await setMessage('Extension is disabled. Toggle ON to claim.');
    return;
  }

  if (!getCurrentTime().started()) {
    await setMessage('Please wait until tomorrow.');
    return;
  }

  const tab = await fetchFPTPlaceTab();
  if (!tab) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'forceClaim',
    });
    if (response?.success === true) {
      void updateCollected();
      calcNextTime();
    }
    if (response?.message) {
      await setMessage(response.message);
    }
  } catch (error) {
    console.error('Failed to send message to tab:', error);
    await setMessage('Could not force claim, consider reloading page.', false);
  }
});
