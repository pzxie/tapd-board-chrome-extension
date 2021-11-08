let _tapd_crx_init_retry_num = 0

function sendTapdAutoInitData () {
  if (_tapd_crx_init_retry_num > 9) return

  if (!window.currentIterationId || !window.user_nick || !window._workspace_id) {
    setTimeout(() => {
      _tapd_crx_init_retry_num++
      sendTapdAutoInitData()
    }, 1000)
    return
  }

  console.log(_tapd_crx_init_retry_num)
  window.postMessage({ type: 'tapd_auto_data_init', user_nick: window.user_nick, _workspace_id: window._workspace_id, currentIterationId: window.currentIterationId }, '*');
}

sendTapdAutoInitData()
