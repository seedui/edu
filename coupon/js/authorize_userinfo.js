﻿;(function(w) {
    w.mpAppid = typeof(eduData[getQueryString("kfrom")]) == 'undefined' ? '' : (eduData[getQueryString("kfrom")].appid || '');
    w.openid = $.fn.cookie(mpappid + 'y_openid');
    w.headimgurl = $.fn.cookie(mpappid + '_headimgurl');
    w.nickname = $.fn.cookie(mpappid + '_nickname');
    w.expires_in = {expires: 7};
    w.Authorize = function(o) {
        this.mpappid = o && o.mpappid || mpappid; //mpappid
        this.scope = "snsapi_userinfo"; //scope
        this.redirect_uri = business_url + "mp/auth/snsapi_userinfo"; //redirect_uri
        this.callBackPage = o && o.callBackPage || ""; //授权之后的回调页面
        this.param = ""; //微信的参数
    }
    Authorize.prototype.authorize = function(fn) {
        window.location.href = "https://open.weixin.qq.com/connect/oauth2/authorize?appid=" + this.mpappid + "&redirect_uri=" + encodeURIComponent(this.redirect_uri + "?callBackPage=" + this.callBackPage + "&authAppId=" + this.mpappid + "&busiAppId=" + busiAppId + "&param=" + this.param) + "&response_type=code&scope=" + this.scope + "&state=" + this.mpappid + "#wechat_redirect";
        if (fn) {
            fn();
        }
    };
    Authorize.prototype.checkIsAuthorize = function() {
        if ($.fn.cookie(mpappid + 'y_openid')) {
            return true;
        } else {
            return false;
        }
    };
    Authorize.prototype.getQueryParam = function(name) {
        var currentSearch = decodeURIComponent(location.search.slice(1));
        if (currentSearch != '') {
            var paras = currentSearch.split('&');
            for (var i = 0, l = paras.length, items; i < l; i++) {
                items = paras[i].split('=');
                if (items[0] === name) {
                    return items[1];
                }
            }
            return '';
        }
        return '';
    };
    Authorize.prototype.jumpToUrl = function() {
        if (this.callBackPage) {
            window.location.href = this.callBackPage;
        }
    };
    Authorize.prototype.getParam = function() {
        var jsonobj = {};
        var currentSearch = decodeURIComponent(location.search.slice(1)).split('&');

        for (var i = 0, l = currentSearch.length, items; i < l; i++) {
            items = currentSearch[i].split('=');
            jsonobj[items[0]] = items[1];
        }
        this.param = encodeURIComponent(JSON.stringify(jsonobj));
    };
    Authorize.prototype.init = function(fn) {
        this.getParam();
        var that = this;

        if (!openid || !nickname) {
            openid = that.getQueryParam("oid");
            openid && $.fn.cookie(mpappid + 'y_openid', openid, expires_in);
            if (!openid) {
                that.authorize(function() {});
            }

        } else {
            $.fn.cookie(mpappid + 'y_openid', openid, expires_in);
            if (fn) {
                setTimeout(function() {
                    fn();
                }, 50);
            }
        }
        if (!headimgurl) {
            headimgurl = that.getQueryParam("him");
            headimgurl && $.fn.cookie(mpappid + '_headimgurl', headimgurl, expires_in);
        } else {
            $.fn.cookie(mpappid + '_headimgurl', headimgurl, expires_in);
        }
        if (!nickname) {
            nickname = that.getQueryParam("nnm");
            nickname && $.fn.cookie(mpappid + '_nickname', nickname, expires_in);
        } else {
            $.fn.cookie(mpappid + '_nickname', nickname, expires_in);
        }
    }
   new Authorize({callBackPage: location.href}).init();
})(window);