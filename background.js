chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create('autoClick', {
    periodInMinutes: 45,
  });
  console.log('Created 45 min periodic timer');
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'autoClick') {
    return;
  }

  const { enabled } = await chrome.storage.local.get('enabled');

  if (!enabled) {
    return;
  }

  const tabs = await chrome.tabs.query({
    url: 'https://place.fpt.com/',
  });

  for (const tab of tabs) {
    void chrome.tabs.sendMessage(tab.id, {
      action: 'clickButton',
    });
  }
});
