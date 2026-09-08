import { fetchFPTPlaceTab, setMessage } from './utils.js';

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
    await chrome.tabs.sendMessage(tab.id, {
      action: 'clickClaimButton',
    });
  } catch (err) {
    console.error('Failed to send message to tab:', err);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'setMessage') {
    void setMessage(message.message);
  } else if (message.action === 'resetAlarm') {
    void chrome.alarms.create('autoClick', {
      periodInMinutes: 45,
    });
    console.log('Reset 45 min periodic autoClick alarm');
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) {
    if (changes.enabled.newValue) {
      void chrome.alarms.create('autoClick', {
        periodInMinutes: 45,
      });
      console.log('Extension enabled: created 45 min periodic autoClick alarm');
    } else {
      void chrome.alarms.clear('autoClick');
      console.log('Extension disabled: cleared autoClick alarm');
    }
  }
});
