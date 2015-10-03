
$(function() {
  var INTERVAL = 1000;
  var TRY_INITIAL_NUM = 5;
  var TRY_BASIC_NUM = 3;
  var QUERYS = ["com", "ne.jp", "co.jp"];
  
  var _bookmarks = {};
  var _pageUrl;
  var _timestamp;
  var _users;
  var _isError = 0;
  var _isPrivateUser = 0;

  var HATENA_API = {
    MY_BOOKMARKS: "http://b.hatena.ne.jp/my/search/json",
    PAGE_BOOKMARKS: "http://b.hatena.ne.jp/entry/jsonlite/",
  };

  function fetchMyBookmarks(n, tryNum) {
    var dfd = $.Deferred();

    var query = QUERYS[n];

    if (tryNum <= 0) {
      isError = 1;
      dfd.reject();
      return dfd.promise();
    }

    var url = HATENA_API.MY_BOOKMARKS;
    var offset = 0;
    var limit = 100;

    var data = {
      q: query,
      of: offset,
      limit: limit,
    };

    $.ajax({
      url: url,
      data: data,
      dataType: "JSONP",
    }).done(function(data) {
      var bookmarks = data.bookmarks;
      _bookmarks[n] = bookmarks;

      if (bookmarks.length === 0) {
        console.log("error - fetchMyBookmarks : " + tryNum); // =====

        setTimeout(function() {
          fetchMyBookmarks(n, --tryNum)
            .done(function() {
              dfd.resolve();
            })
            .fail(function() {
              dfd.reject();
            });
        }, INTERVAL);
      } else {
        console.log("success - fetchMyBookmarks : " + tryNum); // =====

        var bookmark;
        for (var i=0; i < bookmarks.length; ++i) {
          bookmark = bookmarks[i];
          if (bookmark.is_private === 1) {
            continue;
          }

          _pageUrl = bookmark.entry.url;
          _timestamp = bookmark.timestamp
          break;
        }

        dfd.resolve();
      }
    }).fail(function() {
      console.log("fail - fetchMyBookmarks"); // =====
      showError();
    });

    return dfd.promise();
  }

  function fetchPageBookmarks(pageUrl, timestamp) {
    var dfd = $.Deferred();

    if (pageUrl === undefined || timestamp === undefined) {
      console.log("error"); // =====
    }

    var url = HATENA_API.PAGE_BOOKMARKS;

    var data = {
      url: pageUrl,
    };

    $.ajax({
      url: url,
      data: data,
      dataType: "JSONP",
    }).done(function(data) {
      var bookmarks = data.bookmarks;
      var bookmark;
      var users = [];
      for (var i=0; i < bookmarks.length; ++i) {
        bookmark = bookmarks[i];
        if (getUnixTimestamp(bookmark.timestamp) === timestamp) {
          users.push(bookmark.user);
        }
      }
      _users = users;
      dfd.resolve();
    }).fail(function() {
      console.log("fail"); // =====
      dfd.reject();
    });

    return dfd.promise();
  }

  function getUnixTimestamp(localeDate) {
    var date = new Date(localeDate);
    var unixTimestamp = Math.round( date.getTime()/1000);
    return unixTimestamp;
  }

  function checkUser(users) {
    console.log(users); // =====
    
    if (users.length === 0) {
      _isPrivateUser = 1;
      $("#your-hatena-id").html('あなたのはてなIDは…よく分かりませんでしたが、もしや<span class="hatena-id">プライベートアカウント</span>では？</p><p>もし違う場合は、はてなブックマークにログインしているか確認してください。それでも失敗する場合は、はてな API が正しく値を返してくれていないかもしれません。</p><p>非公開ブックマークは下に示すように取れてるかも？');
    } else {
      var userStr = users.join('</span>もしくは<span class="hatena-id">');
      $("#your-hatena-id").html('あなたのはてなIDは…たぶん<span class="hatena-id">'+userStr+'</span>ですね！');
    }
  }

  function showError() {
      $("#your-hatena-id").html('あなたのはてなIDは…む、よく分かりませんでした。</p><p>ブックマークが取得できなかったようです。はてなブックマークにログインしているか確認してください。それでも失敗する場合は、はてな API が正しく値を返してくれていないかもしれません。');
      $(".bookmark-list p").text("どうやら取れませんでした。");
      setScrollbar();
  }

  function checkBookmarks(n) {
    var bookmarks = _bookmarks[n];

    console.log("# bookmarks"); // =====
    console.log(bookmarks); // =====

    if (_isPrivateUser) {
      showBookmarks(bookmarks, n);
    } else {
      var private = [];
      var public = [];

      bookmarks.forEach(function(bookmark) {
        if (bookmark.is_private === 1) {
          private.push(bookmark);
        } else {
          public.push(bookmark);
        }
      });

      showBookmarks(private, n);
    }
  }

  function showBookmarks(bookmarks, n) {
    $("#list-"+n).html("");

    bookmarks.forEach(function(bookmark) {
      var title = bookmark.entry.title;
      var url = bookmark.entry.url;
      var comment = bookmark.comment;

      var titleEle = $("<p>").text("Title: " + title);
      var urlEle = $("<p>").text("URL: " + url);
      var commentEle = $("<p>").text("Comment: " + comment);

      var divEle = $("<div>").addClass("bookmark").append(titleEle).append(urlEle).append(commentEle);
      $("#list-"+n).append(divEle);
    });

    if ($("#list-"+n).html() == "") {
      $("#list-"+n).html("<p>軽く調べましたが見つかりませんでした。</p>");
    }

    setScrollbar();
  }

  function end() {
    console.log("end"); // =====
  }

  function fetchOtherMyBookmarks(n) {
    var query = QUERYS[n];
    if (query == undefined) {
      return;
    }

    setTimeout(function() {
      fetchMyBookmarks(n, TRY_BASIC_NUM)
        .done(function() {
          checkBookmarks(n);

          fetchOtherMyBookmarks(++n);
        }).fail(function() {
          console.log("fail - fetchOtherMyBookmarks : " + n); // =====
        });
    }, INTERVAL);
  }

  function alertError() {
    console.log("Completely failed."); // =====
    showError();
  }

  function setScrollbar() {
    $(".bookmark-list").each(function() {
      var clientHeight = this.clientHeight;
      var scrollHeight = this.scrollHeight;

      $(this).perfectScrollbar("destroy");

      if (scrollHeight - clientHeight > 0) {
        $(this).perfectScrollbar({
          wheelSpeed: 30,
          minScrollbarLength: 50,
        });
      } else {
        $(this).perfectScrollbar({
          wheelSpeed: 30,
          minScrollbarLength: 50,
          wheelPropagation:true,
        });
      }
    });
  }

  (function _init() {
    setScrollbar();

    var n = 0;

    fetchMyBookmarks(n, TRY_INITIAL_NUM)
      .then(function() {
        if (_isError) {
          end();
          return;
        }
        return fetchPageBookmarks(_pageUrl, _timestamp);
      })
      .done(function() {
        checkUser(_users);
        checkBookmarks(n);

        fetchOtherMyBookmarks(1);
      }).fail(function() {
        console.log("fail - init"); // =====
        alertError();
      });
  })();
  
});


