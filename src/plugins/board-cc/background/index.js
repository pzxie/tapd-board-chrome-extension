// background.js
chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          // 只有对应tapd看板才显示pageAction
          new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlMatches: 'tapd.cn\/[0-9]+\/board\/index' } })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});