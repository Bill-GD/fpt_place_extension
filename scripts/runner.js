const events = ['clickClaimButton', 'forceClaim', 'getCollected', 'getTimeRemaining', 'canClick'];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!events.includes(message.action)) return;

  switch (message.action) {
    case 'getCollected': {
      if (message?.started === true) {
        const text = [...document.querySelectorAll('p')]
          .find((el) => {
            return el.innerText.trim().endsWith('number(s) today');
          });
        if (!text) return;
        sendResponse({ success: true, collected: text.innerText.trim().split(' ')[1] });
      } else if (message?.started === false) {
        const button = [...document.querySelectorAll('button')]
          .find((el) => {
            return el.innerText.trim().endsWith('number(s) today');
          });
        if (!button) return;
        sendResponse({ success: true, collected: button.innerText.trim().split(' ')[1] });
      }
      return;
    }
    case 'canClick': {
      const button = [...document.querySelectorAll('button')]
        .find((el) => {
          return el.innerText.trim().startsWith('Get Number');
        });
      sendResponse({ success: true, canClick: !button.innerText.includes('(') });
      return;
    }
    case 'getTimeRemaining': {
      const button = [...document.querySelectorAll('button')]
        .find((el) => {
          return el.innerText.trim().startsWith('Get Number');
        });
      if (button.innerText.includes('(')) {
        sendResponse({ success: true, message: button.innerText.trim().split('(')[1].slice(0, -1) });
      } else {
        sendResponse({ success: true, message: '00:00' });
      }
      return;
    }
    default: {
      const button = [...document.querySelectorAll('button')]
        .find((el) => {
          return el.innerText.trim().startsWith('Get Number');
        });

      if (button) {
        button.click();

        void chrome.runtime.sendMessage({ action: 'resetAlarm' });
        sendResponse({
          success: true,
          message: `Claimed number at ${new Date().toLocaleTimeString(undefined, { hour12: false })}`,
        });
      } else {
        sendResponse({ success: false, message: 'Button not found' });
      }
      return;
    }
  }
});
