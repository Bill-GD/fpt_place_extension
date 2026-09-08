chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['clickClaimButton', 'forceClaim', 'getCollected'].includes(message.action)) {
    return;
  }

  if (message.action === 'getCollected') {
    if (message?.started === true) {
      const button = [...document.querySelectorAll('button')]
        .find((el) => {
          return el.innerText.trim().startsWith('Get Number');
        });
      sendResponse({ success: true, message: button.innerText.trim().split('(')[1].slice(0, -1) });
    } else if (message?.started === false) {
      const button = [...document.querySelectorAll('button')]
        .find((el) => {
          return el.innerText.trim().endsWith('number(s) today');
        });
      sendResponse({ success: true, message: button.innerText.trim().split(' ')[1] });
    }
    return;
  }

  const button = [...document.querySelectorAll('button')]
    .find((el) => {
      return el.innerText.trim().startsWith('Get Number');
    });

  if (button) {
    button.click();
    console.log('Claimed number.');

    void chrome.runtime.sendMessage({ action: 'resetAlarm' });
    sendResponse({
      success: true,
      message: `Claimed number ${new Date().toLocaleTimeString(undefined, { hour12: false })}`,
    });
  } else {
    console.log('Button not found.');
    sendResponse({ success: false, message: 'Button not found' });
  }
});
