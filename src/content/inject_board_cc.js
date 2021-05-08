var allCC = []

maxLabelCount = 100

if (window.cardFilter) {
  cardFilter._generate_cc = function () {
    var r = this
      , e = "";
    var wrap = '<li class="divider-wrap divider-wrap-cc"><span>参与人</span><span class="divider three"></span></li>' +
      '<li class="card-filter-cc">' +
      '<ul>' +
      '%%' +
      '</ul>' +
      'li'
    var temp = '<li class="filter-by" data-value="cc-%%">' +
      '<a>' +
      '<div class="avatar-container">' +
      '<i class="avatar-text-default avatar ">' +
      '%%' +
      '</i> ' +
      '%%' +
      '</div>' +
      '</a>' +
      '</li>';
    $.each(allCC, function (i, cc) {
      e += temp.replace(/\%\%/g, cc)
    })
    wrap = wrap.replace(/\%\%/g, e)

    $('.card-filter-options').append($(wrap))
    cardFilter._set_filter_status("cc")
  }

  cardFilter._clear_cc = function () {
    $('.divider-wrap-cc, .card-filter-cc').remove()
    return this
  }

  var tempInit = cardFilter._init.bind(cardFilter)
  cardFilter._init = function (t) {
    tempInit(t)
    cardFilter._clear_cc()._generate_cc()
  }

  window.addEventListener("message", function (e) {
    allCC = e.data && e.data.cc || []
    cardFilter._clear_cc()._generate_cc()
  }, false);
}

