console.log('popup...')
var list = document.getElementById('list')
var add = document.getElementById('add')
var text = document.getElementById('text')
var currentCC = []

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

function addItemToList (value) {
  addItem(value)
  currentCC.unshift(value)
  
  // 只需要设置，不需要通知，content/index.js里面做了监听的
  chrome.storage.local.set({ cc: currentCC }, function () {
    console.log('----------------')
    console.log('新增： ' + value);
    console.log('cc原始值为： ' + currentCC.slice(1));
    console.log('cc更新为为： ' + currentCC);
  });
}

chrome.storage.local.get(['cc'], function (result) {
  if (result && result.cc && result.cc.length) {
    initList(result.cc)
  }
});



// 删除
list.addEventListener('click', function (e) {
  var current = e.target
  var parent = current.parentElement

  if (current.tagName !== 'BUTTON') return

  var value = parent.dataset.value

  chrome.storage.local.get(['cc'], function (result) {
    if (!result || !result.cc) return

    var cc = result.cc.slice(0)
    var index = cc.indexOf(value)

    if (index < 0) return

    cc.splice(index, 1)
    list.removeChild(parent)
    setCurrentCC(cc)
    // 只需要设置，不需要通知，content/index.js里面做了监听的
    chrome.storage.local.set({ cc: cc }, function () {
      console.log('----------------')
      console.log('删除： ' + value);
      console.log('cc原始值为： ' + result.cc);
      console.log('cc更新为为： ' + cc);
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
