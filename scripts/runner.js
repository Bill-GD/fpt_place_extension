chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'clickClaimButton' && message.action !== 'forceClaim') {
    return;
  }

  const button = [...document.querySelectorAll('button')]
    .find((el) => {
      return el.innerText.trim().startsWith('Get Number Now');
    });

  if (button) {
    button.click();
    console.log('Claimed number.');

    void chrome.runtime.sendMessage({
      action: 'resetAlarm',
    });

    sendResponse({ success: true, message: 'Claimed number' });
  } else {
    console.log('Button not found.');

    sendResponse({ success: false, message: 'Button not found' });
  }
});
