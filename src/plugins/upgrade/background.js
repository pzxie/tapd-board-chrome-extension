class UpgradeBackground {
  cancelUpgrade = false
  requestInstance = null

  /**
   * 
   * @param {{ baseRequestUpgradeUrl: string }} config 
   */
  constructor(config) {
    this.init()
    this.baseRequestUpgradeUrl = config && config.baseRequestUpgradeUrl || 'https://gitee.com/pzxie/chrome-extension-store/raw/master'
  }

  getRequestUpgradeUrl (version) {
    return this.baseRequestUpgradeUrl + `/${chrome.runtime.getManifest().name}/manifest.json`
  }

  // 刷新插件
  async reload (version) {
    let success
    try {
      success = await this.downloadAvailableVersion()

      if (this.cancelUpgrade) {
        this.cancelUpgrade = false
        chrome.runtime.sendMessage({ type: 'cancelCheckVersionResult' })
        return
      }

      let config = chrome.runtime.getManifest()

      chrome.runtime.sendMessage({ type: 'checkVersionResult', details: success && config })

      if (success) setTimeout(() => {
        console.log('插件已更新至：V', config.version)
        chrome.runtime.reload()
      }, 3000);
    } catch (e) {
      if (this.cancelUpgrade) {
        this.cancelUpgrade = false
        chrome.runtime.sendMessage({ type: 'cancelCheckVersionResult' })
        return
      }
      chrome.runtime.sendMessage({ type: 'checkVersionResult', details: false })
    }

  }

  /**
   * @returns {Promise<boolean>}
   */
  downloadAvailableVersion () {
    return new Promise((resolve, reject) => {

      this.requestInstance = {
        cancel: function () {
          reject(false)
        }
      }

      setTimeout(() => {
        resolve(Math.random() > 0.5)
      }, 3000);

      // todo 
      // requestInstance = 

    })
  }

  /**
   * 获取更新信息
   * @returns  {{status: "throttled" | "no_update" |"update_available" , details: {version: string, url: string}}} 
   */
  async requestUpdateCheck () {
    let manifest = chrome.runtime.getManifest()
    let result = {
      status: 'no_update',
      details: {
        version: manifest.version,
      }
    }

    try {
      let data = await fetch(this.getRequestUpgradeUrl(), {
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      })

      data = await data.json()

      if (data && data.version && (data.version > manifest.version)) {
        result.status = 'update_available'
        result.details.version = data.version
      }
    } catch (e) { }

    return result
  }

  init () {
    chrome.runtime.onInstalled.addListener(function () {
      chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([
          {
            conditions: [
              // 只有对应tapd看板才显示pageAction
              // new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlMatches: 'extensions/?id=[a-z0-9A-Z]+&time=[0-9]+&version=' } })
              new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlMatches: 'chrome://extensions' } })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
          }
        ]);
      });
    });
    /**
      * @typedef {{type: 'checkVersion', needResponse: boolean} } CheckVersionRequest 
      * @typedef {{type: 'cancelCheckVersion'} } CancelCheckVersionRequest
      * 
      */
    chrome.runtime.onMessage.addListener(async (request) => {
      if (request && request.type === 'checkVersion') {
        let data = await this.requestUpdateCheck()

        chrome.runtime.sendMessage({ type: 'checkVersionStatus', status: data && data.status, details: data.details })

        // chrome扩展无法进行文件系统处理。
        // data && data.details && this.reload(data.details.version)
      } else if (request && request.type === 'cancelCheckVersion') {
        this.cancelUpgrade = true
        // todo ,切换为 xhr 的cancel api
        this.requestInstance && this.requestInstance.cancel()
      }
    })
  }
}

new UpgradeBackground()