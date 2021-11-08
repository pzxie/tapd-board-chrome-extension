chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          // 只有对应tapd看板才显示pageAction
          new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlMatches: 'tapd.cn\/[0-9]+\/prong/iterations/card_view' } })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    var exists = false;
    for (var i = 0; i < details.requestHeaders.length; i++) {
      if (details.requestHeaders[i].name === 'Referer') {
        exists = true;
        details.requestHeaders[i].value = 'https://www.tapd.cn/tapd_fe/worktable/search';
        break;
      }
    }

    if (!exists) {
      details.requestHeaders.push({ name: 'Referer', value: 'https://www.tapd.cn/tapd_fe/worktable/search' });
    }

    return { requestHeaders: details.requestHeaders };
  },
  { urls: ['https://www.tapd.cn/api/search_filter/search_filter/edit_show_fields/*'] },
  ["blocking", "requestHeaders", "extraHeaders"]
);