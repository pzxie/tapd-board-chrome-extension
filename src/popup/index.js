console.log('popup...')
var list = document.getElementById('list')
var add = document.getElementById('add')
var text = document.getElementById('text')
var currentCC = []

function getPageUrl () {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log(tabs[0])
      resolve(tabs[0].url)
    })
  })
}

function addItem (text) {
  var li = createItem(text)
  list.prepend(li)
}

function createItem (text) {
  var li = document.createElement('li')
  li.dataset.value = text
  li.innerHTML = '<span class="value">' + text + '</span>' +
    '<button class="delete">删除</button>'

  return li
}

function initList (items) {
  setCurrentCC(items)

  for (var index in items) {
    var item = createItem(items[index])
    list.appendChild(item)
  }
}

function setCurrentCC (cc) {
  currentCC = cc
}

async function addItemToList (value) {
  addItem(value)
  currentCC.unshift(value)

  let url = await getPageUrl()

  let key = url.indexOf('prong/iterations/card_view') > -1 ? 'syncTaskBlackList' : 'cc'

  // 只需要设置，不需要通知，content/index.js里面做了监听的
  chrome.storage.local.set({ [key]: currentCC }, function () {
    console.log('----------------')
    console.log('新增： ' + value);
    console.log(`${key}原始值为： ` + currentCC.slice(1));
    console.log(`${key}更新为为： ` + currentCC);
  });
}

// todo 关闭popup页面
async function hidePopup () {

}


// 删除
list.addEventListener('click', async function (e) {
  var current = e.target
  var parent = current.parentElement

  if (current.tagName !== 'BUTTON') return

  var value = parent.dataset.value

  let url = await getPageUrl()

  let key = url.indexOf('prong/iterations/card_view') > -1 ? 'syncTaskBlackList' : 'cc'

  chrome.storage.local.get([key], function (result) {
    if (!result || !result[key]) return

    var cc = result[key].slice(0)
    var index = cc.indexOf(value)

    if (index < 0) return

    cc.splice(index, 1)
    list.removeChild(parent)
    setCurrentCC(cc)
    // 只需要设置，不需要通知，content/index.js里面做了监听的
    chrome.storage.local.set({ [key]: cc }, function () {
      console.log('----------------')
      console.log('删除： ' + value);
      console.log(`${key}原始值为： ` + result[key]);
      console.log(`${key}更新为为： ` + cc);
    });
  });
})

add.addEventListener('click', function (e) {
  var valueArr = text.value.trim().split(',')

  for (var index in valueArr) {
    var value = valueArr[index].trim()
    if (!value || currentCC.indexOf(value) > -1) {
      continue
    }
    addItemToList(value)
  }

  text.value = ''
})

getPageUrl().then(url => {
  let key = url.indexOf('prong/iterations/card_view') > -1 ? 'syncTaskBlackList' : 'cc'

  if (key === 'syncTaskBlackList') document.getElementById('title').textContent = '同步需求黑名单'

  chrome.storage.local.get([key], function (result) {
    if (result && result[key] && result[key].length) {
      initList(result[key])
    }
  });
})

let upgrade = new UpgradePopup({
  checkVersionBtn: { id: 'checkVersion' }
})

document.getElementById('reload').addEventListener('click', upgrade.reload)
