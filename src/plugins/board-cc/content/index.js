var script = document.createElement('script')
script.src = chrome.extension.getURL('src/plugins/board-cc/inject/index.js')
document.body.appendChild(script)

script.onload = function () {
  // 初始化，向注入到页面中的js发送事件
  chrome.storage.local.get(['cc'], function (result) {
    var allCC = []
    if (!result || !result.cc || !result.cc.length) {
      chrome.storage.local.set({ cc: allCC }, function () {
        console.log('cc初始化为： ' + allCC);
        // 只需要设置，不需要通知，content/index.js里面做了监听的
      });
    } else {
      allCC = result.cc
      window.postMessage({ cc: allCC }, 'https://www.tapd.cn');
    }
  });
}

// 此时插入的脚本还未开始执行，需要将初始化放在一下轮事件执行
// setTimeout(, 500)

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (var key in changes) {
    if (key !== 'cc') return

    window.postMessage({ cc: changes.cc.newValue }, 'https://www.tapd.cn');
  }
});


