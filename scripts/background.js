import { calcNextTime, fetchFPTPlaceTab, setAlarm, setMessage, updateCollected } from './utils.js';

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'autoClick') {
    return;
  }

  const { enabled } = await chrome.storage.local.get('enabled');
  if (!enabled) {
    return;
  }

  const tab = await fetchFPTPlaceTab();
  if (!tab) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'clickClaimButton',
    });
    if (response?.success === true) {
      void updateCollected();
      calcNextTime();
    }
    if (response?.message) {
      await setMessage(response.message);
    }
  } catch (err) {
    console.error('Failed to send message to tab:', err);
    await setMessage('Could not claim, consider reloading page.', false);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'resetAlarm') {
    setAlarm();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) {
    if (changes.enabled.newValue) {
      setAlarm(45, false);
      console.log('Extension enabled: created 45 min periodic autoClick alarm');
    } else {
      void chrome.alarms.clear('autoClick');
      console.log('Extension disabled: cleared autoClick alarm');
    }
  }
});
