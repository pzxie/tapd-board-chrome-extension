class Progress {
  constructor(scroll) {
    this.container = document.createElement('div')
    this.scroll = scroll || function () { }
  }

  append (text, style, tag) {
    let progressItem = document.createElement('div')

    if (style) progressItem.style = style

    progressItem.classList.add('_tapd_progress_item')
    progressItem.innerHTML = text

    this.container.appendChild(progressItem)
    this.scroll()
  }

  /**
   * 每个用户更新的开始
   * @param {*} username 
   */
  appendStart (username) {
    this.append(`<span style="color: #aaa;font-weight: bold;marginTop: 10px;font-size: 14px;">开始同步 ${username} 的任务</span>`)
    this.append(`<span style="color: #aaa;font-weight: bold;">获取 ${username} 源任务</span>`)

  }

  /**
   * 每个任务的开始
   * @param {*} label 
   * @param {*} text 
   */
  appendItemStart (label, text) {
    this.append(`<span style="color: #3582fb;font-weight: bold;">${label}:</span> ${text}`)
  }

  /**
   * 每个任务的的子进度
   * @param {*} label 
   * @param {*} text 
   */
  appendItemList (label, text = '', level = 1) {
    this.append(`<span style="padding-left: ${level * 2}em; color: #3582fb;font-weight: bold;">${label}${!text && text !== 0 ? '' : '：'}</span> ${text}`)
  }

  /**
   * 每个任务的结果
   * @param {*} type 
   * @param {*} text 
   */
  appendItemResult (type = 'normal', text) {
    if (type === 'success') {
      this.append(`<span style="color: green;font-weight: bold;">${text || '更新成功'}</span>`)
    } else if (type === 'failed') {
      this.append(`<span style="color: red;font-weight: bold;">${text || '更新失败'}</span>`)
    } else {
      this.append(`<span style="color: '#ccc';font-weight: bold;">${text || '无更新'}</span>`)
    }
  }

  /**
   * 每个用户的结果
   * @param {string} username 用户名 
   * @param {Array} addList 添加成功的列表 
   * @param {Array} updateList 更新成功的列表 
   */
  appendEnd (username, addList, updateList, error) {
    this.append(`<div style="color: green;font-weight: bold;marginTop: 10px;font-size: 12px;">${username} 的任务同步${error ? '失败' : '完成'}</div> 
    <div class="_tapd_progress_item"><strong>新建：</strong>${addList.length}</div>
    <div class="_tapd_progress_item"><strong>更新：</strong>${updateList.length}</div>` +
      (!error ? '' : `<div class="_tapd_progress_item"><strong style="color: red;">错误信息：</strong>${error}</div>`)
    )
  }

  /**
   * 同步任务的总结论
   * @param {Array<{username: string, addList: Array, updateList: Array, success: boolean, message?: string}>} result 
   */
  appendConclusion (result) {
    let success = ''
    let failed = ''

    for (let item of result) {
      if (item.success) {
        success += ` <div class="_tapd_progress_item" style="padding-left: 24px"><strong>人员：</strong>${item.username}</div>`
        success += ` <div class="_tapd_progress_item" style="padding-left: 24px"><strong>新建：</strong>${item.addList.length}</div>`
        success += ` <div class="_tapd_progress_item" style="padding-left: 24px"><strong>更新：</strong>${item.updateList.length}</div>`
      } else {
        failed += ` <div class="_tapd_progress_item" style="padding-left: 24px"><strong>人员：</strong>${item.username}</div>`
        failed += ` <div class="_tapd_progress_item" style="padding-left: 24px"><strong>新建：</strong>${item.addList.length}</div>`
        failed += ` <div class="_tapd_progress_item" style="padding-left: 24px"><strong>更新：</strong>${item.updateList.length}</div>`
        failed += ` <div class="_tapd_progress_item" style="padding-left: 24px;color: red;"><strong>错误信息：</strong>${item.message}</div>`
      }
    }

    this.append(`<div style="color: #ccc;font-weight: bold;margin-top: 10px;margin-bottom: 10px;font-size: 14px;">任务同步总体情况</div> 
    <div style="color: green;font-weight: bold;marginTop: 5px; class="_tapd_progress_item">成功名单</div>
    ${success}
    <div style="color: red;font-weight: bold;marginTop: 5px; class="_tapd_progress_item">失败名单</div>
    ${failed || '--'}
    `)
  }
}

class ProgressDrawer extends Progress {
  constructor(scroll) {
    super(scroll)
    this.id = '_tapd_crx_progress'
    this.container = null
    this._child = {}
    this.close = null
    this.timer = null
    delete this.scroll
  }

  child (username) {
    return username ? this._child[username] : this
  }

  addActions () {
    let close = document.createElement('button')
    close.textContent = '关闭'
    close.id = '_tapd_progress_close'
    close.addEventListener('click', this.hide.bind(this))
    this.close = close
    document.body.appendChild(close)
  }

  show () {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = this.id
      this.addActions(this.container)
      document.body.appendChild(this.container)
    }

    this.close && this.close.classList.remove('_tapd_hidden')
    this.container.classList.remove('_tapd_hidden')

    return this
  }

  hide () {
    this.close.classList.add('_tapd_hidden')
    this.container.classList.add('_tapd_hidden')

    for (let key in this._child) {
      this._child[key] = null
      delete this._child[key]
    }

    this.container.innerHTML = ''
    return this
  }

  scroll (delay = 5) {
    if (this.timer) return

    this.timer = setTimeout(function () {
      if (this.container.scrollTop < this.container.scrollHeight - this.container.clientHeight) {
        this.container.scrollTop += 2
        this.timer = null
        this.scroll(20)
      } else {
        this.timer = null
      }
    }.bind(this), delay);
  }

  createProgress (username) {
    if (!this.container) throw new Error('需要先运行 show 方法，才能添加Progress')

    this._child[username] = new Progress(this.scroll.bind(this))
    this.container.appendChild(this._child[username].container)

    return this._child[username]
  }
}