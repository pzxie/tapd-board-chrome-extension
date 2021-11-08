/**
 * @description content 嵌入脚本。可页面加载时进行一次检测
 */

class UpgradeContent {
  constructor() {
    this.init()
  }

  init () {
    chrome.runtime.sendMessage({ type: 'checkVersion' })
  }
}

new UpgradeContent()

