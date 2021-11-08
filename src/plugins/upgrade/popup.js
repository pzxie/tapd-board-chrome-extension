/**
 * @description popup配置页面，可进行手动检测
 */

/**
 * @typedef {Object} UpgradePopupConfig
 * @property {{id: string, text: string}} checkVersionBtn
 * @property {{id: string, text: string}} [gotoUpgradeBtn]
 * @property {{id: string, text: string}} [reloadExtensionBtn]
 * @property {{id: string, text: string}} [closeUpgradeBtn]
 * @property {{id: string, text: string}} [checkFeedback]
 * @property {{id: string}} [upgradeContainer]
 * 
 */

/**
 * 热更Popup
 */
class UpgradePopup {
  availableVersion = ''

  /**
   * 
   * @param {UpgradePopupConfig} config 
   */
  constructor(config) {
    if (!config) config = {}

    if (!config.checkVersionBtn) throw new Error('初始化配置，UpgradePopupConfig.checkVersionBtn: {id: string, text: string} 是必须提供的。当前为：' + config.checkVersionBtn)
    if (!config.checkVersionBtn.id) throw new Error('初始化配置，UpgradePopupConfig.checkVersionBtn.id: string 是必须提供的。当前为：' + config.checkVersionBtn.id)

    /**
    * @type {UpgradePopupConfig}
    */
    this.upgradePopupConfig = {
      checkVersionBtn: { id: 'checkVersion', text: '检查更新', ...config.checkVersionBtn },
      reloadExtensionBtn: { id: 'reloadExtension', text: '重新加载插件', ...config.reloadExtensionBtn },
      gotoUpgradeBtn: { id: 'gotoUpgrade', text: '前往更新', ...config.gotoUpgradeBtn },
      closeUpgradeBtn: { id: 'closeUpgrade', text: '关闭', ...config.closeUpgradeBtn },

      upgradeContainer: { id: 'upgradeContainer', ...config.upgradeContainer },
      checkFeedback: { id: 'checkFeedback', text: `当前版本：V${chrome.runtime.getManifest().version}。\n正在检查更新。。。`, ...config.checkFeedback },
    }

    this.upgradeStyle = `
      .hide {
        display: none !important;
      }

      #${this.upgradePopupConfig.checkVersionBtn.id} {
        font-size: 12px;
        color: red;
      }

      #${this.upgradePopupConfig.checkVersionBtn.id}:hover {
        color: #4285f4 !important;
        cursor: pointer;
      }

      #${this.upgradePopupConfig.upgradeContainer.id} {
        position: absolute;
        top: 50px;
        bottom: 0;
        right: 0;
        left: 0;
        min-height: 100px;
        background: white;
      }

      #${this.upgradePopupConfig.checkFeedback.id} {
        height: 100px;
        line-height: 100px;
        text-align: center;
        color: #5d84e0;
      }

      #${this.upgradePopupConfig.reloadExtensionBtn.id} {
        background: #675fcf;
        font-size: 12px;
        cursor: pointer;
      }

      #${this.upgradePopupConfig.gotoUpgradeBtn.id} {
        background: green;
        font-size: 12px;
        cursor: pointer;
      }

      #${this.upgradePopupConfig.closeUpgradeBtn.id} {
        background: #aaa;
        font-size: 12px;
        cursor: pointer;
      }
      .upgrade-actions {
        text-align: center;
      }
    `

    // 页面中没有的才进行自动添加
    if (!document.getElementById(this.upgradePopupConfig.upgradeContainer.id)) {
      this.insertStyle(this.upgradeStyle)
      this.insertContainer()
    }

    for (let key in this.upgradePopupConfig) {
      let config = this.upgradePopupConfig[key]

      config.element = document.getElementById(config.id)
    }


    this.init()
  }

  insertStyle (styles) {
    let style = document.createElement('style')

    style.textContent = styles
    document.head.appendChild(style)
  }

  insertContainer () {
    // 如果popup页面已经有更新信息展示容器了
    if (document.getElementById(this.upgradePopupConfig.upgradeContainer.id)) return

    const html = `
    <div id="${this.upgradePopupConfig.checkFeedback.id}">${this.upgradePopupConfig.checkFeedback.text}</div>
    <div class="upgrade-actions">
      <button id="${this.upgradePopupConfig.closeUpgradeBtn.id}" class="hide">${this.upgradePopupConfig.closeUpgradeBtn.text}</button>
      <button id="${this.upgradePopupConfig.reloadExtensionBtn.id}" class="hide">${this.upgradePopupConfig.reloadExtensionBtn.text}</button>
      <button id="${this.upgradePopupConfig.gotoUpgradeBtn.id}" class="hide">${this.upgradePopupConfig.gotoUpgradeBtn.text}</button>
    </div>
    `
    let container = document.createElement('div')
    container.classList.add('hide')
    container.id = this.upgradePopupConfig.upgradeContainer.id
    container.innerHTML = html

    document.body.append(container)
  }

  reload () {
    chrome.runtime.reload()
  }

  init () {
    this.upgradePopupConfig.checkVersionBtn.element.addEventListener('click', () => {
      this.upgradePopupConfig.upgradeContainer.element.classList.remove('hide')

      // 发送更新
      chrome.runtime.sendMessage({ type: 'checkVersion' })
    })

    this.upgradePopupConfig.reloadExtensionBtn.element &&
      this.upgradePopupConfig.reloadExtensionBtn.element.addEventListener('click', this.reload)

    this.upgradePopupConfig.closeUpgradeBtn.element &&
      this.upgradePopupConfig.closeUpgradeBtn.element.addEventListener('click', () => {
        window.close()
      })

    this.upgradePopupConfig.gotoUpgradeBtn.element.addEventListener('click', () => {
      if (!this.availableVersion) return

      // todo 检查是否有相同插件详情页打开，覆盖url，然后选中
      chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}&time=${Date.now()}&version=${this.availableVersion}` })
    })

    /**
     * @typedef {{type: 'checkVersionStatus', status: "throttled" | "no_update" |"update_available"} } CheckVersionStatusRequest 更新标识返回体（是否有更新可用）
     * @typedef {{type: 'checkVersionResult', details: false | {version: string, name: string}} } CheckVersionResultRequest 更新结果返回体
     * @typedef {{type: 'cancelCheckVersionResult'}} CancelCheckVersionResultRequest 取消更新返回体
     * 
     */
    chrome.runtime.onMessage.addListener((request) => {
      if (request && request.type === 'checkVersionStatus') {
        // 更新标识
        if (request.status === 'update_available') {
          this.availableVersion = request.details.version
          document.getElementById('checkFeedback').textContent = '检测到新版本 V' + request.details.version
          document.getElementById('closeUpgrade').classList.remove('hide')
          document.getElementById('reloadExtension').classList.remove('hide')
          document.getElementById('gotoUpgrade').classList.remove('hide')

          return
        } else {
          document.getElementById('checkFeedback').textContent = '无可用更新'
        }
      }
      else if (request && request.type === 'checkVersionResult') {
        // 更新结果
        document.getElementById('checkFeedback').textContent = request.details ? ('已更新至最新版。V' + request.details.version) : '更新失败'
      } else if (request && request.type === 'cancelCheckVersionResult') {
        // 取消结果
        document.getElementById('checkFeedback').textContent = '已取消更新'
      }

      document.getElementById('closeUpgrade').classList.remove('hide')
      document.getElementById('gotoUpgrade').classList.add('hide')
    })
  }
}