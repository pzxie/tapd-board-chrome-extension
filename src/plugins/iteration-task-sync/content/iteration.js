let user_nick = ''
let _workspace_id = ''

const sourceWorkspaceMap = {
  '64667970': '技术需求',
  '20096901': '互联网医院'
}

// 资源管理空间
const validTargetWorkspaceIds = ['37431868']

// 资源管理空间自定义字段映射
const targetCustomField = ['custom_field_源空间', 'custom_field_源ID', 'custom_field_迭代标识', 'custom_field_祖先需求标识', 'custom_field_源需求最后修改时间', 'custom_field_项目制评级', 'custom_field_源URL']
const targetCustomFieldMap = {}

let blackList = []

let progress = new ProgressDrawer()

function serializeFormData (data, pre) {
  let formData = ''

  for (let key in data) {
    let value = data[key]

    let title = pre ? `${pre}[${key}]` : `${key}`

    if (typeof value !== 'object') formData += `&${title}=${value}`
    else formData += '&' + serializeFormData(value, `${title}`)
  }

  return formData.substr(1)
}

function toDoubleString (num) {
  if (num < 10) return '0' + num

  return num.toString()
}

function getDate (date = Date.now()) {
  let formedDate = new Date(date)

  let year = formedDate.getFullYear()
  let month = toDoubleString(formedDate.getMonth() + 1)
  let day = toDoubleString(formedDate.getDate())

  return year + '-' + month + '-' + day
}

function getTime (date = Date.now()) {
  let formedDate = new Date(date)

  let minutes = toDoubleString(formedDate.getMinutes())
  let seconds = toDoubleString(formedDate.getSeconds())

  return minutes + ':' + seconds
}

function getDateTime (date = Date.now()) {
  let formedDate = new Date(date)

  return getDate(formedDate) + ' ' + getTime(formedDate)
}

function getCurrentIteration () {
  const iteration = $('.iteration-card--pick')

  return iteration.length && {
    name: iteration.find('.iteration_title').text().replace(/[\t\n]/g, ''),
    id: iteration.attr('iteration_id'),
    start: iteration.attr('iteration-startdate'),
    end: iteration.attr('iteration-enddate')
  }
}

function isInDuration (date) {
  let iteration = getCurrentIteration()

  if (!iteration || !date) return false

  let formedDate = new Date(date)

  formedDate = getDate(formedDate)

  if (formedDate >= iteration.start && formedDate <= iteration.end) return true

  return false
}

/**
 * 设置用户为admin
 * @param {string | false} username 
 * @returns {Promise<boolean>}
 */
function setAdmin (username) {
  return new Promise(resolved => {
    if (username !== false && username !== user_nick) {
      resolved(false)
      return
    }

    chrome.storage.local.set({ autoSyncAdmin: username }, function () {
      resolved(true)
    });
  })
}

/**
 * 判断用户是否是admin
 * @param {string} username 
 * @returns {Promise<boolean>}
 */
function isAdmin (username) {
  return new Promise(resolved => {
    chrome.storage.local.get(['autoSyncAdmin'], function (result) {
      if (!result || !result.autoSyncAdmin || result.autoSyncAdmin !== username) {
        resolved(false)
        return
      }
      resolved(true)
    });
  })
}

/**
 * 
 * @param {*} fn 
 * @param {*} query 
 * @param {*} filters 
 * @returns {Array<SearchResponseList>}
 */
async function fetchAllQueryData (fn, query, filters) {
  let data = await fn(query, filters)

  if (!data || !data.data || !data.meta || data.meta.code !== '0') return []

  let currentResultList = data.data.list || []

  if (+data.data.totalPages > +data.data.currentPage && +data.data.perpage === currentResultList.length)
    return currentResultList.concat(await fetchAllQueryData(fn, { ...query, page: +data.data.currentPage + 1 }, filters))

  return currentResultList
}

/**
 * 根据html解析生成花费数据
 * @param {string} html 
 * @returns {Array<{date: string, spent: number, username: string, remain: number}> | null} 
 */
function getSpentListByHtml (html, remain = 0, owner) {
  var h = $(html)

  var list = h.find('tbody tr td')
  var columns = h.find('th').length

  if (!list || !list.length) return null

  let data = []

  let keyMap = ['date', 'spent', 'username']
  let temp = {}

  $.each(list, (index, item) => {
    let keyMapIndex = index % columns;
    if (keyMapIndex === 3) {
      if (isInDuration(temp.date) && (owner && temp.username && temp.username.trim() === owner.trim())) data.push(temp)
      temp = {}
      return
    } else if (keyMapIndex > 3) return

    let value = item.textContent.replace(/[\t\n]/g, '')

    temp[keyMap[keyMapIndex]] = keyMapIndex === 1 ? parseFloat(value) : value
  })

  data = data.reverse()

  data.forEach((item, index) => {
    item.remain = data.slice(index + 1).reduce((pre, value) => pre + value.spent, +remain || 0)
  })

  return data
}

/**
 * 通过html，获取storyId
 * @param {string} html 
 */
function getStoryIdByHtml (html, name) {
  let h = $(html)
  let story = h.find(`[title="${name}"]`)
  let storyId = story[0] && $(story[0]).attr('id').split('_')
  storyId = storyId.pop()

  if (storyId) return storyId

  return ''
}


/**
 * 
 * @typedef {{
    data: {
        fields: {
            id: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            name: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            status: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            owner: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            custom_field_迭代标识: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
                extra: {
                    "37431868": string;
                };
                extra_type: {
                    "37431868": string;
                };
            };
            custom_field_祖先需求标识: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
                extra: {
                    "37431868": string;
                };
                extra_type: {
                    "37431868": string;
                };
            };
            effort_completed: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            remain: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            modified: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            custom_field_源ID: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
                extra: {
                    "37431868": string;
                };
                extra_type: {
                    "37431868": string;
                };
            };
            custom_field_源空间: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
                extra: {
                    "37431868": string;
                };
                extra_type: {
                    "37431868": string;
                };
            };
            custom_field_源需求最后修改时间: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
                extra: {
                    "37431868": string;
                };
                extra_type: {
                    "37431868": string;
                };
            };
            creator: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            created: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
            workspace_id: {
                is_system: string;
                label: string;
                html_type: string;
                name: string;
            };
        };
        list: {
            id: string;
            name: string;
            status: string;
            owner: string;
            effort_completed: string;
            remain: string;
            modified: string;
            creator: string;
            created: string;
            workspace_id: string;
            workitem_type_id: string;
            parent_id: string;
            secret_root_id: string;
            children_id: string;
            category_name: string;
            parent_name: string;
            workitem_type_name: string;
            short_id: string;
            workspace_name: string;
            iteration_name: string;
            release_name: string;
            story_name: string;
            secret_workitem: string;
            title_url: string;
            status_class: string;
            status_alias: string;
            icon: string;
            enable_multi_workflow: string;
            custom_field_源需求最后修改时间: string;
            custom_field_源空间: string;
            custom_field_源ID: string;
            custom_field_迭代标识: string;
            custom_field_祖先需求标识: string;
            measurement_editable: string;
        }[];
        currentPage: string;
        total_count: string;
        perpage: string;
        totalPages: string;
        type: string;
        orderField: string;
        orderType: string;
        set_show_fields_url: string;
        parallel_token: string;
        query_token: string;
        search_type: string;
        view_mode: string;
        display_mode: string;
        headWidthMap: string;
        isAllowBatchEdit: string;
        inline_edit_permission: string;
        workspace_names: string;
    };
    meta: {
        code: string;
        message: string;
    };
    timestamp: string;
}} SearchResponse 
 */

/**
 * 
 * @typedef {{
            id: string;
            name: string;
            status: string;
            owner: string;
            effort_completed: string;
            remain: string;
            modified: string;
            creator: string;
            created: string;
            workspace_id: string;
            workitem_type_id: string;
            parent_id: string;
            secret_root_id: string;
            children_id: string;
            category_name: string;
            parent_name: string;
            workitem_type_name: string;
            short_id: string;
            workspace_name: string;
            iteration_name: string;
            release_name: string;
            story_name: string;
            secret_workitem: string;
            title_url: string;
            status_class: string;
            status_alias: string;
            icon: string;
            enable_multi_workflow: string;
            custom_field_源需求最后修改时间: string;
            custom_field_源空间: string;
            custom_field_源ID: string;
            custom_field_迭代标识: string;
            custom_field_祖先需求标识: string;
            measurement_editable: string;
        }[]} SearchResponseList 
 */


/**
 * 设置需求面板筛选接口返回数据字段
 */
async function setStoryPanelQueryResultsFields (workspace = _workspace_id) {
  let customField = []
  let customFieldMap = {}
  targetCustomField.forEach(field => {
    if (targetCustomFieldMap[field]) {
      customField.push(targetCustomFieldMap[field])
      customFieldMap[targetCustomFieldMap[field]] = targetCustomFieldMap[field]
    }
  })

  // 需求查询看板显示字段设置
  await fetch(`https://www.tapd.cn/${workspace}/userviews/edit_show_fields/`, {
    "headers": {
      "accept": "*/*",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    "body": serializeFormData({
      data: {
        fields: {
          id: 'id',
          name: 'name',
          status: 'status',
          priority: 'priority',
          parent_id: 'parent_id',
          iteration_id: 'iteration_id',
          owner: 'owner',
          begin: 'begin',
          due: 'due',
          effort: 'effort',
          effort_completed: 'effort_completed',
          remain: 'remain',
          progress: 'progress',
          ...customFieldMap
        }
      },
      custom_fields: `id;name;priority;iteration_id;status;parent_id;owner;effort_completed;remain;${!customField.length ? '' : (customField.join(';') + ';')}begin;due;effort;progress;`,
      location: '/prong/stories/stories_list',
      workspace_id: workspace,
      workspace_code: workspace,
      id: '1000000000000000016'
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  // 迭代显示字段设置
  await fetch(`https://www.tapd.cn/${workspace}/userviews/edit_show_fields/`, {
    "headers": {
      "accept": "*/*",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    "body": serializeFormData({
      data: {
        fields: {
          id: 'id',
          name: 'name',
          status: 'status',
          owner: 'owner',
          begin: 'begin',
          modified: 'modified',
          due: 'due',
          effort: 'effort',
          effort_completed: 'effort_completed',
          remain: 'remain',
          progress: 'progress',
          ...customFieldMap
        }
      },
      custom_fields: `id;name;status;owner;effort;effort_completed;remain;progress;begin;due;${!customField.length ? '' : (customField.join(';') + ';')}modified;`,
      location: '/prong/iterations/index',
      workspace_id: workspace,
      workspace_code: workspace,
      id: '1000000000000000001'
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  await fetch(`https://www.tapd.cn/${workspace}/workspace_settings/api_clear_drag_config`, {
    "headers": {
      "accept": "application/json, text/javascript, */*; q=0.01",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    "body": `target=%2F${workspace}%2Fprong%2Fstories%2Fstories_list`,
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });
}

/**
 * 设置高级查询中筛选接口返回数据字段
 */
async function setIterationPanelQueryResultsFields () {
  var e = document.cookie.match(new RegExp("".concat(encodeURIComponent('dsc-token'), "=(\\w+);{0,1}")));
  e = e ? e[1] : "";
  let dscToken = decodeURIComponent(e)

  // 高级查询 - 需求 的显示字段
  await fetch("https://www.tapd.cn/api/search_filter/search_filter/edit_show_fields", {
    "body": JSON.stringify({
      "location": "/search/get_all/story",
      "custom_fields": `id;name;status;owner;effort;effort_completed;begin;due;remain;modified;completed;creator;created;workspace_id;progress;${targetCustomField.join(';')};`,
      "dsc_token": dscToken
    }),
    headers: {
      referer: "https://www.tapd.cn/tapd_fe/worktable/search"
    },
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  })
  // 高级查询 - 任务 的显示字段
  await fetch("https://www.tapd.cn/api/search_filter/search_filter/edit_show_fields", {
    "body": JSON.stringify({
      "location": "/search/get_all/task",
      "custom_fields": `id;name;status;iteration_id;effort;begin;due;remain;owner;creator;story_id;modified;completed;effort_completed;progress`,
      "dsc_token": dscToken
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  })
}

async function isQueryFiledSet () {
  return new Promise((resolve) => {
    chrome.storage.local.get(['isQueryFiledSet'], function (result) {
      resolve(result && !!result.isQueryFiledSet)
    });
  })
}

async function setQueryFiled (workspace) {
  let isSet = await isQueryFiledSet()
  if (isSet) return

  await setStoryPanelQueryResultsFields(workspace)
  await setIterationPanelQueryResultsFields()
  chrome.storage.local.set({ 'isQueryFiledSet': true });
}

/**
 * 添加成员到迭代中
 * @param {object} iteration 
 * @param {string} iteration.id
 * @param {string} iteration.name 
 * @param {string} username 
 */
async function addUserToIteration (iteration, username, workspace = _workspace_id) {
  progress.appendItemStart('开始新增用户', username)

  let data = await fetch(`https://www.tapd.cn/${workspace}/prong/stories/quick_add_story/${iteration.id}/true`, {
    "headers": {
      "accept": "*/*",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    "body": `data%5Bstory%5D%5Bname%5D=${encodeURIComponent(username)}&data%5Bstory%5D%5Bpriority%5D=&data%5Bstory%5D%5Bowner%5D=`,
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  let html = await data.text()
  let storyId = getStoryIdByHtml(html, username)

  // 更新迭代标识字段
  await updateStoryByField(storyId, 'custom_field_9', iteration.name)
  // 更新祖先需求标识
  await updateStoryByField(storyId, 'custom_field_10', username)

  progress.appendItemResult('success', '新增完成')
}

/**
 * 添加子需求到迭代所属需求中
 * 
 * @param {object} params
 * @param {string} params.parentStoryId 长ID
 * @param {string} params.storyName 需求名称
 * @param {string} params.effort 预估花费工时
 * @param {string} params.effort_completed 已完成工时
 * @param {string} params.remain 剩余工时
 * @param {string} params.progress 进度百分比
 * @param {string} params.owner 处理人
 * @param {string} params.begin 预计开始
 * @param {string} params.due 预计结束
 * @param {string} params.custom_field_9 迭代标识
 * @param {string} params.custom_field_10 祖先需求标识
 * @param {string} params.custom_field_eight 源ID
 * @param {string} params.custom_field_seven 源空间
 * @param {string} params.custom_field_four 源需求最后修改时间
 * @param {object} params.iteration 
 * @param {string} params.iteration.id
 * @param {string} params.iteration.name
 * @param {*} storyName 
 */
async function addChildStoryToStory (params, workspace = _workspace_id) {
  if (!params.storyName || !params.owner || !params.parentStoryId || !params.iteration.id) {
    throw new Error(
      '参数不正确' + JSON.stringify(params, null, 4)
    )
  }

  let body = { ...params }
  delete body.iteration
  delete body.storyName
  delete body.parentStoryId
  // 针对工时字段，需要通过填写花费的接口才能设置
  delete body.remain
  delete body.effort_completed
  if (!body.custom_field_9) body.custom_field_9 = params.iteration.name
  body.name = encodeURIComponent(params.storyName)

  // await fetch(`https://www.tapd.cn/${workspace}/prong/stories/quick_add_child_story/${params.parentStoryId}/${params.iteration.id}/true?fields[0]=id&fields[1]=name&fields[2]=effort&fields[3]=effort_completed&fields[4]=status&fields[5]=progress&fields[6]=owner&fields[7]=begin&fields[8]=due&fields[9]=modified&fields[10]=custom_field_one&fields[11]=custom_field_two&fields[12]=custom_field_three&fields[13]=custom_field_five&fields[14]=custom_field_six&fields[15]=Action&from=new_iteration&preview_type=j-iteration-title-link`, {
  let story = await fetch(`https://www.tapd.cn/${workspace}/prong/stories/quick_add_child_story/${params.parentStoryId}/${params.iteration.id}/true?from=new_iteration&preview_type=j-iteration-title-link`, {
    "headers": {
      "accept": "*/*",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    "body": serializeFormData({
      data: { story: body }
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  return story.text()
}

/**
 * 更新需求的单个字段值
 * @param {string} storyId 长ID
 * @param {string} [workspace] 空间ID
 * @param {*} value 
 * @param {'begin' | 'due' | 'owner' | 'effort'| 'custom_field_seven' | 'custom_field_four' | 'custom_field_eight' | 'custom_field_9' | 'custom_field_10'}  filed
 * begin: 开始日期
 * 
 * due：结束日期
 * 
 * owner：处理人
 * 
 * effort：预估工时
 * 
 * custom_field_seven：源空间
 * 
 * custom_field_four：最后修改时间
 * 
 * custom_field_eight: 源ID
 * 
 * custom_field_9: 需求迭代名称
 * 
 * custom_field_10: 需求所属祖先需求
 */
async function updateStoryByField (storyId, filed, value, workspace = _workspace_id) {
  return await fetch(`https://www.tapd.cn/${workspace}/prong/stories/inline_update?r=${Date.now()}`, {
    "headers": {
      "accept": "*/*",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    "body": `data%5Bid%5D=${storyId}&data%5Btype%5D=story&data%5Bfield%5D=${filed}&data%5Bvalue%5D=${encodeURIComponent(value)}`,
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });
}



/**
 * 更新状态
 * @param {object} args 
 * @param {string} args.storyId 需求id 长ID
 * @param {'planning'| 'developing' | 'resolved'} args.currentStatus 当前状态
 * @param {'planning'| 'developing' | 'resolved'} args.newStatus 新状态
 * @param {string} args.description 更新描述
 * @param {string} workspace  空间ID
 * 
 */
async function updateStoryStatus (args, workspace = _workspace_id) {
  return await fetch(`https://www.tapd.cn/${workspace}/prong/stories/change_story_status/${args.storyId}/iteration_list/db`, {
    "headers": {
      "accept": "text/plain, */*; q=0.01",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    "body": serializeFormData({
      data: {
        Story: {
          current_status: args.currentStatus
        },
        new_status: args.newStatus,
        [`STATUS_${args.currentStatus}-planning`]: {
          owner: user_nick
        },
        [`STATUS_${args.currentStatus}-developing`]: {
          owner: user_nick
        },
        [`STATUS_${args.currentStatus}-resolved`]: {
          owner: user_nick
        },
        [`STATUS_${args.currentStatus}-rejected`]: {
          owner: user_nick
        },
        editor: '',
        Comment: {
          description: ''
        }
      }
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });
}

/**
 * 根据storyId查询需求详情
 * @param {string} storyId  长ID
 * @param {string} workspace 
 * 
 * @returns {SearchResponse}
 */
async function getStoryById (storyId, workspace = _workspace_id) {
  let result = await fetch("https://www.tapd.cn/api/search_filter/search_filter/search", {
    "body": JSON.stringify({
      "workspace_ids": workspace,
      "search_data": JSON.stringify({
        "data": [
          {
            "id": 2,
            "fieldLabel": "ID",
            "fieldOption": "like",
            "fieldSystemName": "id",
            "fieldIsSystem": 1,
            "value": storyId,
            "selectOption": []
          }
        ],
        "optionType": "AND",
        "needInit": true
      }),
      "obj_type": "story",
      "search_type": "advanced",
      "page": 1,
      "perpage": "20",
      "parallel_token": "",
      "order_field": "created",
      "order_value": "desc",
      "display_mode": "list",
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  let data = await result.json()

  return data && data.data && data.data.list && data.data.list[0] || null
}

/**
 * 更新花费
 * @param {object} args 
 * @param {object} args.spentdate 花费日期
 * @param {object} args.timespent 使用工时
 * @param {object} args.timeremain 剩余工时
 * @param {object} args.storyId 需求id 长ID
 * @param {string} workspace  空间ID
 * 
 */
async function updateStorySpent (args, workspace = _workspace_id) {
  if (!args.spentdate || !args.timespent) throw new Error('花费日期或者消费工时必填')

  return await fetch(`https://www.tapd.cn/${workspace}/prong/tracking/timeedit`, {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "zh-CN,zh;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      "upgrade-insecure-requests": "1"
    },
    "body": `data%5BTimesheet%5D%5Bspentdate%5D=${args.spentdate}&data%5BTimesheet%5D%5Btimespent%5D=${args.timespent * 8}&data%5BTimesheet%5D%5Btimeremain%5D=${args.timeremain * 8}&data%5BTimesheet%5D%5Bexceed%5D=0&data%5BTimesheet%5D%5Bid%5D=&data%5BTimesheet%5D%5Bentity_id%5D=${args.storyId}&data%5BTimesheet%5D%5Bentity_type%5D=story&data%5BTimesheet%5D%5Bmemo%5D=&data%5BTimesheet%5D%5Bcallback%5D=story_list&data%5BTimesheet%5D%5Bcallback_param%5D=113743186800103344446046&data%5Bsave%5D=%E4%BF%9D%E5%AD%98`,
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });
}

async function getFields (workspace = _workspace_id) {
  let data = await fetch(`https://www.tapd.cn//api/entity/filter/get_fields?from=iteration_list&workspace_id=${workspace}&selected_workspace_id=`, {
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "include"
  });
  return data.json()
}

async function getStorySpent (id, spentRemain, workspace = _workspace_id) {
  let html = await fetch(`https://www.tapd.cn/${workspace}/prong/tracking/listspent/story/${id}&time=${Date.now()}`, {
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "include"
  });
  html = await html.text()

  return getSpentListByHtml(html, spentRemain)
}

/**
 * 获取任务的花费列表
 * 只会获取指定owner在这个迭代周期里面的花费列表
 * @param {*} id 任务Id
 * @param {*} spentRemain 任务当前剩余工时
 * @param {*} workspace 项目ID
 * @param {*} owner 需要获取花费的处理人
 * @returns 
 */
async function getTaskSpent (id, spentRemain, workspace, owner) {
  let html = await fetch(`https://www.tapd.cn/${workspace}/prong/tracking/listspent/task/${id}?time=${Date.now()}`, {
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "include"
  });
  html = await html.text()

  return getSpentListByHtml(html, spentRemain, owner)
}


/**
 * 获取对应人员所在空间所有任务
 * @param {object} query
 * @param {string} query.workspace  单个id,或者多个id以 | 分隔，如 ’1234‘，’1234|4567‘
 * @param {string} query.username
 * @param {string} query.startTime
 * @param {string} query.endTime
 * @param {string} query.page
 * @param {Array} [filters]
 * @returns {SearchResponse}
 */
async function getTaskByFilters (query, filters) {
  if (!query.workspace || !query.username || !query.startTime || !query.endTime) {
    throw new Error('参数不正确，', query)
  }

  let result = await fetch("https://www.tapd.cn/api/search_filter/search_filter/search", {
    "body": JSON.stringify({
      "workspace_ids": query.workspace,
      "search_data": JSON.stringify({
        "data": [
          {
            "id": 8,
            "fieldLabel": "处理人",
            "fieldOption": "user_like",
            "fieldSystemName": "owner",
            "fieldIsSystem": 1,
            "value": query.username,
            "selectOption": []
          },
          {
            "id": 9,
            "fieldLabel": "最后修改时间",
            "fieldOption": "between",
            "fieldSystemName": "modified",
            "fieldIsSystem": 1,
            "value": `${getDateTime(query.startTime)},${getDateTime(query.endTime)}`,
            "selectOption": []
          },
          ...(filters ? [filters] : [])
        ],
        "optionType": "AND",
        "needInit": true
      }),
      "obj_type": "task",
      "search_type": "advanced",
      "page": query.page || 1,
      "perpage": 100,
      "parallel_token": "",
      "order_field": "created",
      "order_value": "asc",
      "display_mode": "list",
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  return await result.json()
}

/**
 * 获取对应人员空间已建需求（非顶级需求）
 * @param {object} query
 * @param {string} query.workspace  单个id,或者多个id以 | 分隔，如 ’1234‘，’1234|4567‘
 * @param {string} query.iteration 自定义字段，迭代标识
 * @param {string} query.ancestorStoryName 自定义字段，祖先需求
 * @param {string} query.page
 * @param {Array} [filters]
 * @returns {SearchResponse}
 */
async function getUserStoriesByFilters (query, filters) {
  if (!query.workspace || !query.iteration || !query.ancestorStoryName) {
    throw new Error('参数不正确，', query)
  }

  let result = await fetch("https://www.tapd.cn/api/search_filter/search_filter/search", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json;charset=UTF-8",
    },
    "body": JSON.stringify({
      "workspace_ids": query.workspace,
      "search_data": JSON.stringify({
        "data": [
          {
            "id": 2,
            "fieldLabel": "迭代标识",
            "fieldOption": "equal",
            "fieldSystemName": "迭代标识",
            "fieldIsSystem": 0,
            "value": query.iteration,
            "selectOption": []
          },
          {
            "id": 4,
            "fieldLabel": "祖先需求标识",
            "fieldIsSystem": 0,
            "fieldOption": "equal",
            "fieldSystemName": "祖先需求标识",
            "value": query.ancestorStoryName,
            "selectOption": []
          },
          {
            "id": 5,
            "fieldLabel": "父需求",
            "fieldIsSystem": 1,
            "fieldOption": "not_empty",
            "fieldSystemName": "parent_id",
            "value": "",
            "selectOption": []
          }
        ],
        "optionType": "AND",
        "needInit": true
      }),
      "obj_type": "story",
      "search_type": "advanced",
      "page": query.page || 1,
      "perpage": "100",
      "parallel_token": "",
      "order_field": "created",
      "order_value": "asc",
      "display_mode": "list",
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  return await result.json()
}

/**
 * 获取迭代中所有的用户（顶级需求）
 * @param {object} query
 * @param {string} query.workspace  单个id,或者多个id以 | 分隔，如 ’1234‘，’1234|4567‘
 * @param {string} query.iteration 自定义字段，迭代标识
 * @param {string} query.page
 * @param {Array} [filters]
 * @returns {SearchResponse}
 */
async function getIterationUsersByFilters (query, filters) {
  if (!query.workspace || !query.iteration) {
    throw new Error('参数不正确，', query)
  }

  let result = await fetch("https://www.tapd.cn/api/search_filter/search_filter/search", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json;charset=UTF-8",
    },
    "body": JSON.stringify({
      "workspace_ids": query.workspace,
      "search_data": JSON.stringify({
        "data": [
          {
            "id": 2,
            "fieldLabel": "迭代标识",
            "fieldOption": "equal",
            "fieldSystemName": "迭代标识",
            "fieldIsSystem": 0,
            "value": query.iteration,
            "selectOption": []
          },

          {
            "id": 5,
            "fieldLabel": "父需求",
            "fieldIsSystem": 1,
            "fieldOption": "empty",
            "fieldSystemName": "parent_id",
            "value": "",
            "selectOption": []
          },
          ...(filters || [])
        ],
        "optionType": "AND",
        "needInit": true
      }),
      "obj_type": "story",
      "search_type": "advanced",
      "page": query.page || 1,
      "perpage": "100",
      "parallel_token": "",
      "order_field": "created",
      "order_value": "asc",
      "display_mode": "list",
    }),
    "method": "POST",
    "mode": "cors",
    "credentials": "include"
  });

  return await result.json()
}

/**
 * 获取看板配置的人员列表（board-cc 设置的看板过滤人员。可以认为两边设置的人是一致的）
 * @returns {Promise<string[]>}
 */
function getUsers () {
  return new Promise(async (resolved) => {
    let isUserAdmin = await isAdmin(user_nick)
    if (!isUserAdmin) {
      resolved([user_nick])
      return
    }

    chrome.storage.local.get(['cc'], function (result) {
      if (!result || !result.cc) {
        resolved([])
        return
      }
      resolved(result.cc.slice(0))
    });
  })
}


async function updateStoryFromTask (story, task, isParentStory, username) {
  let isChanged = false
  if (!isParentStory) {
    // 如果已经剩余为0了，就默认不需要更新了
    if (+story.remain === 0) {
      // 只是为了修复改以往的状态
      if (+task.remain === 0 && +story.effort_completed !== 0 && story.status !== 'resolved') {
        updateStoryStatus({
          storyId: story.id,
          currentStatus: story.status,
          newStatus: 'resolved'
        }, _workspace_id)
      } else if (+story.effort_completed === 0 && story.status === 'planning') {
        // 只是为了修复改以往的状态
        updateStoryStatus({
          storyId: story.id,
          currentStatus: story.status,
          newStatus: 'developing'
        }, _workspace_id)
      } else if (+story.effort_completed !== 0) {
        // 这才是需要的，如果是新安装，新迭代，就只需要这一个就ok了
        return isChanged
      }
    }

    if (+story.effort !== task.effort * 8) {
      await updateStoryByField(story.id, 'effort', task.effort * 8)
      progress.child(username).appendItemList(`预估工时更新`, `${story.effort} -> ${task.remain * 8}`)
      isChanged = true
    }

    // 如果begin没在迭代里，那肯定在上个月或更早。所以需要先获取源任务本月的花费时长 与 目标需求的本月花费时长做对比
    // 如果源任务有几个处理人的，那也需要单独获取原任务本人的处理时长
    if (!isInDuration(story.begin) || task.owner.split(';').length > 1) {
      let taskSpentList = await getTaskSpent(task.id, +task.remain, task.workspace_id, username)
      let taskEffortCompleted = (taskSpentList || []).reduce((pre, current) => {
        return pre + current.spent * 8
      }, 0)

      if (+story.effort_completed !== taskEffortCompleted && taskSpentList.length) {
        for (let spent of taskSpentList) {
          await updateStorySpent({ spentdate: spent.date, timespent: spent.spent, timeremain: spent.remain, storyId: story.id })
          progress.child(username).appendItemList(`花费更新，${spent.date}`, `${spent.spent * 8}，剩余 ${spent.remain * 8}`)
        }
        isChanged = true
      }
    } else {
      // 如果begin在迭代里。那就直接通过完成时间对比就行
      if (+story.effort_completed !== task.effort_completed * 8) {
        let taskSpentList = await getTaskSpent(task.id, +task.remain, task.workspace_id, username)

        if (taskSpentList && taskSpentList.length) {
          for (let spent of taskSpentList) {
            await updateStorySpent({ spentdate: spent.date, timespent: spent.spent, timeremain: spent.remain, storyId: story.id })
            progress.child(username).appendItemList(`花费更新，${spent.date}`, `${spent.spent * 8}，剩余 ${spent.remain * 8}`)
          }
          isChanged = true
        }
      }
    }
  } else {
    if (+story.effort_completed !== 0 && story.status === 'planning') {
      // 只是为了修复改以往的状态
      await updateStoryStatus({
        storyId: story.id,
        currentStatus: story.status,
        newStatus: 'developing'
      }, _workspace_id)
    }
  }
  if (story.name !== task.name) {
    await updateStoryByField(story.id, 'name', task.name)
    progress.child(username).appendItemList(`任务名更新`, `${story.name} -> ${task.name}`)
    isChanged = true
  }

  if (story.begin !== task.begin) {
    await updateStoryByField(story.id, 'begin', task.begin)
    progress.child(username).appendItemList(`开始时间更新`, `${story.begin} -> ${task.begin}`)
    isChanged = true
  }

  if (story.due !== task.due) {
    await updateStoryByField(story.id, 'due', task.due)
    progress.child(username).appendItemList(`结束时间更新`, `${story.due} -> ${task.due}`)
    isChanged = true
  }

  if (isChanged) {
    await updateStoryByField(story.id, targetCustomFieldMap['custom_field_源需求最后修改时间'], getDateTime())
  }

  return isChanged
}

function initIterationStory (iteration) {
  const button = document.createElement('button')

  async function addStories () {
    progress.show()
    let currentIteration = iteration || getCurrentIteration();
    progress.append(`<span style="color: #aaa;font-weight: bold;marginTop: 10px;font-size: 14px;">开始新增迭代用户</span>`)

    let userStories = await getIterationUsersByFilters({
      workspace: _workspace_id,
      iteration: currentIteration.name
    })
    let userStoriesMap = {}

    userStories.data.list.forEach(item => {
      userStoriesMap[item.name] = item
    })

    let cc = await getUsers()
    let promiseList = []
    let addList = []
    let existList = []

    for (let name of cc) {
      if (!userStoriesMap[name]) {
        addList.push(name)
        promiseList.push(addUserToIteration({ id: currentIteration.id, name: currentIteration.name }, name))
      } else existList.push(name)
    }

    await Promise.all(promiseList)

    progress.append(`<div style="color: #ccc;font-weight: bold;margin-top: 10px;margin-bottom: 10px;font-size: 14px;">迭代用户新增总体情况</div>
    <div class="_tapd_progress_item"><span style="color: green;font-weight: bold;">新增：</span> ${addList.length}</div>
    <div class="_tapd_progress_item"><span style="color: green;font-weight: bold;">已存在：</span> ${existList.length}</div>`)
  }

  button.addEventListener('click', addStories)

  button.classList.add('addUser')
  button.textContent = '添加成员'

  document.body.append(button)
}

function initSyncTaskToStory (iteration) {
  const button = document.createElement('button')

  /**
   * 新增父需求
   * @param {object} arg 
   * @param {object} arg.task 任务
   * @param {object} arg.currentIteration 当前的迭代
   * @param {string} arg.username 用户名
   * @param {string} arg.userStoryId 用户需求ID
   * @param {object} arg.targetStoryMap 需求映射暂存
   * @returns {string | false} string: pId， false: 不需要创建。中断
   */
  async function addParentStory (arg) {
    // 如果当前任务的父需求还未创建，则先创建父需求
    const { task, currentIteration, username, userStoryId, targetStoryMap } = arg

    let pStory = await getStoryById(task.story_id, task.workspace_id)
    if (!pStory) {
      let message = `获取源需求${name}详情失败，请检查Tapd接口返回是否有变化。\n `
      throw new Error(message)
    }

    // 完成时间比当前迭代时间更早
    if (pStory.completed && (getDate(pStory.completed) < currentIteration.start)) return false

    let customFieldObj = {
      [targetCustomFieldMap[targetCustomField[0]]]: task.workspace_name,
      [targetCustomFieldMap[targetCustomField[1]]]: task.story_id,
      [targetCustomFieldMap[targetCustomField[2]]]: currentIteration.name,
      [targetCustomFieldMap[targetCustomField[3]]]: username,
      [targetCustomFieldMap[targetCustomField[4]]]: pStory.modified,
      [targetCustomFieldMap[targetCustomField[5]]]: pStory[targetCustomField[5]],
      [targetCustomFieldMap[targetCustomField[6]]]: location.origin + '/' + pStory.title_url,
    }
    delete customFieldObj[undefined]

    progress.child(username).appendItemStart('添加父需求', task.story_name)

    let story = await addChildStoryToStory({
      iteration: currentIteration,
      parentStoryId: userStoryId,
      storyName: task.story_name,
      owner: username,
      begin: pStory.begin,
      due: pStory.due,
      ...customFieldObj
    })
    let pId = getStoryIdByHtml(story, task.story_name)

    targetStoryMap[task.story_id] = { _updated: true, id: pId, name: task.story_name, parent_id: userStoryId, owner: username, begin: pStory.begin, due: pStory.due, iteration_id: currentIteration.id, iteration_name: currentIteration.name, ...customFieldObj }

    progress.child(username).appendItemResult('success', '添加成功')

    if (!pId) {
      let message = `获取需求Id失败，请检查Tapd接口返回是否有变化。\n 当前已创建父需求 ${task.story_name}`
      throw new Error(message)
    }

    return pId
  }

  /**
   * 更新父需求
   * @param {object} arg 
   * @param {object} arg.task 任务
   * @param {object} arg.currentIteration 当前的迭代
   * @param {object} arg.targetStoryMap 需求映射暂存
   * @param {Array} arg.updateList 更新列表。当需要统计时，可以传入
   * @returns {void | false}
   */
  async function updateParentStory (arg) {
    const { task, currentIteration, targetStoryMap, updateList, username } = arg
    let name = targetStoryMap[task.story_id].name

    let parentStory = await getStoryById(task.story_id, task.workspace_id)

    // 完成时间比当前迭代时间更早
    if (parentStory.completed && (getDate(parentStory.completed) < currentIteration.start)) {
      targetStoryMap[task.story_id]._updated = true
      return false
    }

    // 已经更新过了
    if (targetStoryMap[task.story_id]._updated) return false

    progress.child(username).appendItemStart('更新父需求', name)

    if (!parentStory) {
      let message = `获取源需求${name}详情失败，请检查Tapd接口返回是否有变化。\n `
      throw new Error(message)
    }

    let updated = await updateStoryFromTask(targetStoryMap[task.story_id], parentStory, true, username)
    updated && updateList && updateList.push({ name, id: pId })
    targetStoryMap[task.story_id]._updated = true

    progress.child(username).appendItemResult(updated && 'success')
  }

  /**
   * 新增对应源需求的任务
   * @param {object} arg 
   * @param {string} arg.pId 父需求ID
   * @param {object} arg.task 任务
   * @param {object} arg.currentIteration 当前的迭代
   * @param {string} arg.username 用户名
   * @param {object} arg.targetStoryMap 需求映射暂存
   * @param {Array} arg.addList 新增列表
   * @param {Array} arg.spentList 新增列表
   * @returns {void}
   */
  async function addChildStory (arg) {
    const { pId, task, currentIteration, username, targetStoryMap, addList, spentList } = arg

    progress.child(username).appendItemStart('新建任务需求：', task.name)

    // 创建任务的需求
    let id = task.id
    let name = task.name
    let customFieldObj = {
      [targetCustomFieldMap[targetCustomField[0]]]: task.workspace_name,
      [targetCustomFieldMap[targetCustomField[1]]]: task.id,
      [targetCustomFieldMap[targetCustomField[2]]]: currentIteration.name,
      [targetCustomFieldMap[targetCustomField[3]]]: username,
      [targetCustomFieldMap[targetCustomField[4]]]: task.modified,
      [targetCustomFieldMap[targetCustomField[6]]]: location.origin + '/' + task.title_url,
    }
    delete customFieldObj[undefined]

    let story = await addChildStoryToStory({
      iteration: currentIteration,
      parentStoryId: pId,
      storyName: name,
      owner: username,
      begin: task.begin,
      due: task.due,
      effort: task.effort * 8,
      ...customFieldObj
    })
    progress.child(username).appendItemResult('success', '新建完成')
    progress.child(username).appendItemList('开始更新工时')
    targetStoryMap[task.id] = { id: id, name: name, parent_id: pId, owner: username, begin: task.begin, due: task.due, iteration_id: currentIteration.id, iteration_name: currentIteration.name }
    let storyId = getStoryIdByHtml(story, name)

    if (spentList && spentList.length) {
      for (spent of spentList) {
        await updateStorySpent({ spentdate: spent.date, timeremain: spent.remain, timespent: spent.spent, storyId: storyId })
        progress.child(username).appendItemList(spent.date, `${spent.spent * 8}，剩余 ${spent.remain * 8}`)
      }

      updateStoryStatus({
        storyId,
        currentStatus: 'planning',
        newStatus: +spentList[spentList.length - 1].remain === 0 ? 'resolved' : 'developing'
      }, _workspace_id)
    } else progress.child(username).append(`<span style="color: #ccc;font-weight: bold;padding-left: 2em;">暂无工时更新</span>`)


    addList.push({ name, id: storyId })
  }


  async function innerSyncTaskToStory (currentIteration, username, userStoryId) {
    let addList = []
    let updateList = []

    progress.createProgress(username)

    try {
      progress.show()
      progress.child(username).appendStart(username)

      let tasks = await fetchAllQueryData(getTaskByFilters, { workspace: Object.keys(sourceWorkspaceMap).join('|'), username, startTime: currentIteration.start, endTime: currentIteration.end })
      let targetStories = await fetchAllQueryData(getUserStoriesByFilters, { workspace: _workspace_id, iteration: currentIteration.name, ancestorStoryName: username });
      let targetStoryMap = {}

      targetStories.forEach(story => {
        let sourceId = story[targetCustomFieldMap['custom_field_源ID']] || story.custom_field_源ID
        if (!sourceId) return
        targetStoryMap[sourceId] = story
      })

      for (let task of tasks) {
        let id = ''
        let name = ''
        let isNotCreate = false

        // 黑名单任务，不做处理
        if (blackList.indexOf(task.id) > -1) continue

        // 完成时间比当前迭代时间更早
        if (task.completed && (getDate(task.completed) < currentIteration.start)) continue

        // 新创建需求
        if (!targetStoryMap[task.id]) {
          let spentList = await getTaskSpent(task.id, task.remain, task.workspace_id, username)

          // 如果任务已经完成，并且username并没有进行任何花费，则不予创建
          // 因为花费列表只会获取当个迭代周期的，有可能花费时间在上一个迭代周期。所以不会造成任务的同步减少
          if (+task.remain === 0 && (!spentList || !spentList.length)) continue

          let pId = ''
          if (task.story_id) {
            // 黑名单需求，不做处理
            if (blackList.indexOf(task.story_id) > -1) continue

            if (!targetStoryMap[task.story_id] && task.story_name) {
              pId = await addParentStory({ task, currentIteration, username, userStoryId, targetStoryMap })

              if (pId === false) continue
            } else {
              pId = targetStoryMap[task.story_id].id

              // 父应用被查询更新过， 就不再进行
              if (!targetStoryMap[task.story_id]._updated) {
                let notContinue = await updateParentStory({ task, currentIteration, targetStoryMap, updateList, username })

                if (notContinue === false) continue
              }
            }
          } else pId = userStoryId

          await addChildStory({ pId, task, currentIteration, username, targetStoryMap, addList, spentList })
        } else {
          // 更新子需求时，先更新父需求状态
          await updateParentStory({ task, currentIteration, targetStoryMap, updateList, username })

          progress.child(username).appendItemStart('开始更新任务需求', targetStoryMap[task.id].name)

          let updated = await updateStoryFromTask(targetStoryMap[task.id], task, false, username)
          updated && updateList.push({ name: targetStoryMap[task.id].name, id: targetStoryMap[task.id].id })

          progress.child(username).appendItemResult(updated && 'success')
        }
      }

      progress.child(username).appendEnd(username, addList, updateList)

      getUserStorySpentList({ workspace_id: _workspace_id, iteration: currentIteration, projectStoryMap: targetStoryMap })

      return {
        success: true,
        username,
        addList,
        updateList
      }
    } catch (e) {
      console.error(e)
      progress.child(username).appendEnd(username, addList, updateList, e.message)

      return {
        success: false,
        username,
        addList,
        updateList,
        message: e.message
      }
    }
  }

  async function addStories () {
    progress.show()

    let cc = await getUsers()
    let currentIteration = iteration || getCurrentIteration()

    let promiseList = []

    for (let username of cc) {
      let userStory = await getIterationUsersByFilters({ workspace: _workspace_id, iteration: currentIteration.name }, [
        {
          "id": 110,
          "fieldLabel": "标题",
          "displayName": "标题",
          "fieldOption": "equal",
          "fieldSystemName": "name",
          "fieldIsSystem": 1,
          "value": username,
          "selectOption": []
        }
      ])
      if (userStory.data.list.length !== 1) {
        promiseList.push(Promise.resolve({
          success: false,
          username,
          addList: [],
          updateList: [],
          message: userStory.data.list.length === 0 ? `没有查询到${username}这个用户` : `有多个${username}，请检查迭代用户需求是否正常`
        }))
      } else {
        let story = userStory.data.list[0]

        if (+story.effort_completed !== 0 && story.status === 'planning') {
          // 只是为了修复改以往的状态
          updateStoryStatus({
            storyId: story.id,
            currentStatus: story.status,
            newStatus: 'developing'
          }, _workspace_id)
        }

        promiseList.push(innerSyncTaskToStory(currentIteration, username, story.id))
      }
    }

    let result = await Promise.all(promiseList)

    progress.appendConclusion(result)
  }

  button.addEventListener('click', addStories)

  button.classList.add('syncTask')
  button.textContent = '同步任务'

  document.body.append(button)
}

async function init () {
  if (validTargetWorkspaceIds.indexOf(_workspace_id) < 0) return

  let fields = await getFields(_workspace_id)
  fieldsList = fields && fields.data && fields.data.Story

  // 更新空间自定义字段中文对应的key
  for (let field in fieldsList) {
    let customFieldName = fieldsList[field].category + '_' + fieldsList[field].label
    if (targetCustomField.indexOf(customFieldName) > -1) {
      targetCustomFieldMap[field] = customFieldName
      targetCustomFieldMap[customFieldName] = field
    }
  }

  setQueryFiled(_workspace_id)

  chrome.storage.local.get(['syncTaskBlackList'], function (result) {
    if (result && result.syncTaskBlackList && result.syncTaskBlackList.length) {
      blackList = result.syncTaskBlackList
    }
    initIterationStory()
    initSyncTaskToStory()
    document.addEventListener('click', (e) => {
      var target = null

      if (e.target.classList.contains('ul-row-item-' + targetCustomFieldMap['custom_field_源URL'])) target = e.target
      else if (e.target.parentElement.classList.contains('ul-row-item-' + targetCustomFieldMap['custom_field_源URL'])) target = e.target.parentElement

      if (target) {
        let url = target.dataset['editableValue']
        url && window.open(url, '_blank')
        e.preventDefault()
      }
    }, true)
  });
}

window.addEventListener("message", function (e) {
  if (!e.data || !e.data.user_nick || !e.data._workspace_id || e.data.type !== 'tapd_auto_data_init') return

  user_nick = e.data.user_nick
  _workspace_id = e.data._workspace_id

  init()
}, false);

let isValidPage = false
for (let workspace of validTargetWorkspaceIds) {
  if (location.href.indexOf(workspace) > -1) {
    isValidPage = true;
    break
  }
}

if (isValidPage) {
  var script = document.createElement('script')
  script.src = chrome.extension.getURL('src/plugins/iteration-task-sync/inject/index.js')
  document.body.appendChild(script)
}



