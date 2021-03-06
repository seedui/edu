H.record = {
    maxRecord: parseInt($('.record-box').attr('max-record')) || 5,
    recordTime: parseInt($('.record-box').attr('record-time')) || 60,
    recordInitTimer: 15,
    recordInitFlag: null,
    recordDom: null,
    localId: null,
    serverIdList: [],
    countdownFlag: null,
    barFlag: null,
    init: function() {
        this.checkConfig();
        this.event();
        $('.recordNum').find('.max-num').html(this.maxRecord);
        $('.cur-num').html($('.record-list').length).parent('i').removeClass('none');
        confirm2();
    },
    checkConfig: function() {
        var me = H.record;
        if (H.jssdk.wxIsReady) {
            $('.comment-box').removeClass('none');
            $('.record-box').removeClass('none');
            $('.btn-submit').removeClass('none');
            clearTimeout(me.recordInitFlag);
            me.recordInitFlag = null;
        } else {
            $('.comment-box').addClass('none');
            $('.record-box').addClass('none');
            if (me.recordInitTimer <= 0) {
                clearTimeout(me.recordInitFlag);
                me.recordInitFlag = null;
                location.href = location.href;
            } else {
                me.recordInitFlag = setTimeout(function() {
                    me.recordInitTimer--;
                    me.checkConfig();
                }, 1e3);
            }
        }
    },
    event: function() {
        var me = this;
        $('.addrecord').click(function(e) {
            e.preventDefault();
            if (me.checkPlayer()) {
                me.addPlayer();
            }
        });
        $('.record-lists').delegate('.btn-record', 'click', function(e) {
            e.preventDefault();
            me.recordDom = $(this).attr('data-id');
            me.startRecord();
        }).delegate('.btn-play', 'click', function(e) {
            e.preventDefault();
            if ($('.' + $(this).attr('data-id')).hasClass('playing')) {
                me.stopVoice();
            } else {
                if ($('.record-list').hasClass('playing')) {
                    showTips('还有正在播放的语音，请先停止');
                } else {
                    me.recordDom = $(this).attr('data-id');
                    me.playVoice();
                }
            }
        }).delegate('.btn-del', 'click', function(e) {
            e.preventDefault();
            me.recordDom = $(this).attr('data-id');
            me.stopVoice();
            $('.' + me.recordDom).remove();
            $('.cur-num').html($('.cur-num').text() * 1 - 1);
        }).delegate('.btn-ok', 'click', function(e) {
            e.preventDefault();
            me.recordDom = $(this).attr('data-id');
            clearInterval(me.countdownFlag);
            me.stopRecord();
        });
    },
    checkPlayer: function() {
        var me = this,
            len = $('.record-list').length;
        if (len != 0) {
            if (len >= me.maxRecord) {
                showTips('最大只能创建' + me.maxRecord + '个录音');
                return false;
            }
            if ($('.record-list').hasClass('ready')) {
                showTips('先录段语音吧');
                return false;
            }
            if ($('.record-list').hasClass('recording')) {
                showTips('请先将录音停止后再添加');
                return false;
            }
            if ($('.record-list').hasClass('playing')) {
                showTips('请先将播放停止后再添加');
                return false;
            }
            return true;
        }
        return true;
    },
    addPlayer: function() {
        var me = this,
            t = simpleTpl(),
            key = Math.sn(7);
        me.recordDom = key;
        $('.cur-num').html($('.record-list').length + 1).parent('i').removeClass('none');
        t._('<section class="record-list ready ' + key + '">')
            ._('<div class="record-wrapper">')
            ._('<p style="width:0%;"></p>')
            ._('</div>')
            ._('<div class="record-time">')
            ._('<p class="last-time">录音还剩<label>' + me.recordTime + '</label>秒</p>')
            ._('</div>')
            ._('<div class="record-btn">')
            ._('<a href="javascript:void(0);" class="btn btn-record" data-id="' + key + '">点我录音</a>')
            ._('<a href="javascript:void(0);" class="btn btn-play" data-id="' + key + '">播放</a>')
            ._('<a href="javascript:void(0);" class="btn btn-del" data-id="' + key + '">删除</a>')
            ._('<a href="javascript:void(0);" class="btn btn-ok" data-id="' + key + '">我录好了</a>')
            ._('</div>')
            ._('</section>')
        $('.record-lists').append(t.toString());
    },
    startRecord: function() {
        var me = this;
        if (me.localId) wx.stopVoice({
            localId: me.localId
        });
        wx.startRecord({
            success: function() {
                me.onVoiceRecordEnd();
                me.startProgress();
            },
            cancel: function() {
                alert('授权失败，请点击允许录音');
                location.href = location.href;
            },
            fail: function() {
                alert('录音失败，请重试');
                location.href = location.href;
            }
        });
    },
    stopRecord: function() {
        var me = this;
        wx.stopRecord({
            success: function(res) {
                me.localId = res.localId;
                me.uploadVoice();
            }
        });
    },
    onVoiceRecordEnd: function() {
        var me = this;
        wx.onVoiceRecordEnd({
            // 录音时间超过一分钟没有停止的时候会执行 complete 回调
            complete: function(res) {
                me.localId = res.localId;
                me.uploadVoice();
            }
        });
    },
    uploadVoice: function() {
        var me = this;
        showLoading(null, '正在保存录音...');
        wx.uploadVoice({
            localId: me.localId, // 需要上传的音频的本地ID，由stopRecord接口获得
            isShowProgressTips: 0, // 默认为1，显示进度提示
            success: function(res) {
                // alert(JSON.stringify(res));
                // me.serverIdList.push(res.serverId + ':0'); // 返回音频的服务器端ID
                $('.' + me.recordDom).removeClass('ready recording').addClass('recorded').attr({
                    'data-localId': me.localId,
                    'data-serverId': res.serverId
                });
                hideLoading();
            },
            fail: function() {
                me.uploadVoice();
            }
        });
    },
    playVoice: function() {
        var me = this;
        wx.playVoice({
            localId: $('.' + me.recordDom).attr('data-localId') // 需要播放的音频的本地ID，由stopRecord接口获得
        });
        me.onVoicePlayEnd();
        $('.' + me.recordDom).removeClass('ready recording').addClass('playing');
        $('.' + me.recordDom).find('.btn-play').html('停止');
    },
    pauseVoice: function() {
        var me = this;
        wx.pauseVoice({
            localId: $('.' + me.recordDom).attr('data-localId') // 需要暂停的音频的本地ID，由stopRecord接口获得
        });
        $('.' + me.recordDom).removeClass('playing');
        $('.' + me.recordDom).find('.btn-play').html('播放');
    },
    stopVoice: function() {
        var me = this;
        wx.stopVoice({
            localId: $('.' + me.recordDom).attr('data-localId') // 需要停止的音频的本地ID，由stopRecord接口获得
        });
        $('.' + me.recordDom).removeClass('playing');
        $('.' + me.recordDom).find('.btn-play').html('播放');
    },
    onVoicePlayEnd: function() {
        var me = this;
        wx.onVoicePlayEnd({
            success: function(res) {
                $('.' + me.recordDom).removeClass('playing');
                $('.' + me.recordDom).find('.btn-play').html('播放');
            }
        });
    },
    downloadVoice: function() {
        var me = this;
        wx.downloadVoice({
            serverId: '', // 需要下载的音频的服务器端ID，由uploadVoice接口获得
            isShowProgressTips: 1, // 默认为1，显示进度提示
            success: function(res) {
                var localId = res.localId; // 返回音频的本地ID
            }
        });
    },
    translateVoice: function() {
        var me = this;
        wx.translateVoice({
            localId: '', // 需要识别的音频的本地Id，由录音相关接口获得
            isShowProgressTips: 1, // 默认为1，显示进度提示
            success: function(res) {
                alert(res.translateResult); // 语音识别的结果
            }
        });
    },
    startProgress: function() {
        var me = this,
            barStep = (100 / me.recordTime).toFixed(2),
            timeStep = 1,
            i = 0;
        $('.' + me.recordDom).removeClass('ready').addClass('recording');
        if ($('.' + me.recordDom + ' .last-time label').text() > 0) {
            $('.' + me.recordDom + ' .record-wrapper p').css('width', ++i * barStep + '%');
            $('.' + me.recordDom + ' .last-time label').html($('.' + me.recordDom + ' .last-time label').text() * 1 - timeStep);
        } else {
            $('.' + me.recordDom + ' .last-time label').html('0');
            $('.' + me.recordDom + ' .record-wrapper p').css('width', '100%');
            clearInterval(me.countdownFlag);
            me.stopRecord();
        }
        me.countdownFlag = setInterval(function() {
            if ($('.' + me.recordDom + ' .last-time label').text() > 0) {
                $('.' + me.recordDom + ' .record-wrapper p').css('width', ++i * barStep + '%');
                $('.' + me.recordDom + ' .last-time label').html($('.' + me.recordDom + ' .last-time label').text() * 1 - timeStep);
            } else {
                $('.' + me.recordDom + ' .last-time label').html('0');
                $('.' + me.recordDom + ' .record-wrapper p').css('width', '100%');
                clearInterval(me.countdownFlag);
                me.stopRecord();
            }
        }, 1e3);
    },
    stopProgress: function() {}
};

H.index = {
    ts: getQueryString('ts') || '',
    per: getQueryString('per') || '',
    uid: getQueryString('uid') || '',
    stuid: getQueryString('stuid') || '',
    pname: getQueryString('pname') || '',
    ruid: getQueryString('ruid') || '', //复习内容ID
    reuid: getQueryString('reuid') || '', //复习记录ID
    froms: getQueryString('froms') || '',
    playList: [],
    mp3List: [],
    wxLocalList: [],
    wxServerList: [],
    playDom: null,
    playFlag: 0,
    playID: 0,
    recordInitTimer: 15,
    recordInitFlag: null,
    audio: null,
    init: function() {
        this.event();
        this.safeKeyLost();
        if (this.froms == 'history') $('body').addClass('history');
    },
    safeKeyLost: function() {
        if (!this.uid || !this.stuid || !this.reuid || !this.ruid) {
            $('#pre-detail').addClass('none');
            showNewLoading($('body'), '关键参数丢失，3秒后返回上一页');
            setTimeout(function() {
                toUrl('review-index.html');
            }, 3e3);
        } else {
            this.userGettypePort();
        }
    },
    userGettypePort: function() {
        showLoading(null, '请稍等...');
        getResultEdu("user/gettype", {
            openid: openid,
            eduid: eduData[getQueryString('kfrom')].uid
        }, "callBackMobileGetTypekHandler");
    },
    event: function() {
        var me = this;
        $('.btn-back').click(function(e) {
            e.preventDefault();
            // toUrl('review-index.html');
            window.history.go(-1);
        });
        $('.btn-submit').click(function(e) {
            e.preventDefault();
            if ($.trim($('textarea').val()).length == 0 && $('.recorded').length == 0) {
                showTips('请至少选择一项点评方式');
            } else {
                me.reviewRecordCommentPort();
            }
        });
        $('.content').delegate('.voice', 'click', function(e) {
            e.preventDefault();
            if (me.playDom && me.playDom[0] != $(this)[0]) {
                $('.voice').removeClass('play');
                me.stopRecord();
            }
            me.playDom = $(this);
            if ($(this).hasClass('play')) {
                me.stopRecord();
                $(this).removeClass('play');
            } else {
                me.preRecord($(this).attr('data-list'));
            }
        });
        
        $('.switch').click(function(e) {
            e.preventDefault();
            location.href = location.href.replace('review-ac.html', 'review-ac7.html');
        });
    },
    reviewRecordDetailPort: function(data) {
        getResult('review/record/detail', {
            uuid: this.reuid
        }, 'callBackreviewRecordDetailHandler');
    },
    reviewInfoPort: function(data) {
        getResult('review/info/list', {
            cuid: this.uid,
            stuid: this.stuid
        }, 'callBackreviewInfoListHandler');
    },
    checkConfig: function(data) {
        var me = this;
        if (H.jssdk.wxIsReady) {
            me.checkComment(data);
            $('.btn-back').removeClass('none');
            clearTimeout(me.recordInitFlag);
            me.recordInitFlag = null;
            hideLoading();
        } else {
            if (me.recordInitTimer <= 0) {
                clearTimeout(me.recordInitFlag);
                me.recordInitFlag = null;
                location.href = location.href;
            } else {
                me.recordInitFlag = setTimeout(function() {
                    me.recordInitTimer--;
                    me.checkConfig(data);
                }, 1e3);
            }
        }
    },
    reviewRecordCommentPort: function() {
        showLoading(null, '提交中...');
        H.record.serverIdList = [];
        $('.record-list').each(function(i, e) {
            if ($(this).attr('data-serverId')) H.record.serverIdList.push($(this).attr('data-serverId') + ':0');
        });
        getResult('review/record/comment', {
            uuid: this.reuid,
            teacherUuid: this.stuid,
            teacherAudio: H.record.serverIdList.join(','),
            teacherDesc: encodeURIComponent($.trim($('textarea').val()))
        }, 'callBackreviewRecordCommentHandler');
    },
    checkComment: function(data) {
        var me = this;
        if (me.froms == 'history') {
            if (data.desc) $('.content-title').append('<p class="des">' + data.desc + '</p>').removeClass('none');
            if (data.video) $('.content-title').append('<video x-webkit-airplay="true" webkit-playsinline="yes" id="video" class="video video-js vjs-default-skin" controls preload="auto" data-setup="{}"><source src="' + data.video + '" type="video/mp4" /></video>');
        }
        if (data.cna) $('h6 .pname').removeClass('none').find('label').html(data.cna || me.pname);
        if (data.per) $('h6 .per').removeClass('none').find('label').html(data.per || me.per);
        if (data.stuna) $('h3').removeClass('none').find('label').html(data.stuna);
        if (me.ts == 0) {
            if (data.sitem.length == 0) {
                $('#re-ac').addClass('none');
                if (data.stuna)
                    showNewLoading(null, data.stuna + '同学还未提交作业');
                else
                    showNewLoading(null, '该同学还未提交作业');
            } else {
                me.fillSContent(data);
                if (data.titem.length == 0) {
                    $('.no-repeat').removeClass('none');
                } else {
                    $('.no-repeat').remove();
                    me.fillTContent(data);
                }
            }
            $('.btn-submit').remove();
            $('.comment-box').remove();
        } else {
            if (data.sitem.length == 0) {
                $('#re-ac').addClass('none');
                if (data.stuna)
                    showNewLoading(null, data.stuna + '同学还未提交作业');
                else
                    showNewLoading(null, '该同学还未提交作业');
            } else {
                me.fillSContent(data);
                if (data.titem.length == 0 && !data.tede) {
                    if (me.froms != 'history') H.record.init();
                } else {
                    $('.btn-submit').remove();
                    $('.comment-box').remove();
                    $('.no-repeat').remove();
                    me.fillTContent(data);
                }
            }
        }
    },
    fillSContent: function(data) {
        if (data.sitem.length > 0) {
            var ramdomColor = '#' + ('00000' + (Math.random() * 0x1000000 << 0).toString(16)).slice(-6);
            var playList = this.getPlayList(data.sitem);
            if (data.stuimg) {
                $('.content').append('<p class="voice stu-voice" data-list="' + playList + '"><span class="avatar-box"><img src="' + data.stuimg + '"></span><i class="icon-voice"></i><em></em></p>');
            } else {
                $('.content').append('<p class="voice stu-voice" data-list="' + playList + '"><span class="avatar-box" style="background:' + ramdomColor + ';text-align:center;"><i class="key-name">' + data.stuna.substring(0, 1) + '</i></span><i class="icon-voice"></i><em></em></p>');
            }
        }
    },
    fillTContent: function(data) {
        if (data.titem.length > 0) {
            var playList = this.getPlayList(data.titem);
            $('.content').append('<p class="voice right stu-voice" data-list="' + playList + '"><span class="avatar-box"><img src="' + (data.teaimg || '../../images/avatar.jpg') + '"></span><i class="icon-voice"></i><em></em></p>');
        }
        if (data.tede && data.tede.length != '') {
            $('.content').append('<p class="words right"><span class="avatar-box"><img src="' + (data.teaimg || '../../images/avatar.jpg') + '"></span>' + data.tede + '</p>');
        }
    },
    getPlayList: function(data) {
        var items = data || [],
            wxList = [],
            lcList = [],
            lcNum = 0;
        for (var i = 0; i < items.length; i++) {
            wxList.push(items[i].wurl);
            lcList.push(items[i].lurl);
            if (items[i].status == 1) lcNum++;
        };
        // 暂时先都用微信语音播放_toFix
        if (lcNum < items.length)
            return '0~' + wxList.join(',');
        else
            return '1~' + lcList.join(',');
    },
    preRecord: function(lists) {
        var me = this;
        if (lists) {
            me.playList = lists.split('~')[1].split(',');
            me.mp3List = lists.split('~')[1].split(',');
            me.wxServerList = lists.split('~')[1].split(',');
            if (lists.split('~')[0] == '0') {
                // 微信
                if (me.playDom.attr('play-list')) {
                    me.wxLocalList = me.playDom.attr('play-list').split(',');
                    me.playDom.addClass('play');
                    // me.wxPlay(me.wxLocalList, 0);
                    me.playRecord(me.wxLocalList, 0);
                } else {
                    me.downloadWXVoice(me.wxServerList, 0, true);
                }
                me.playFlag = 0;
            } else {
                // mp3
                if (me.playDom.attr('play-list')) {
                    me.playDom.addClass('play');
                    me.playRecord(me.playDom.attr('play-list').split(','), 0);
                } else {
                    me.downloadMP3(0);
                }
                me.playFlag = 1;
            }
        } else {
            showTips('网络错误，请刷新页面后重试...');
        }
    },
    stopRecord: function() {
        var me = this;
        if (me.playFlag == 0) {
            // 微信语音停止播放
            wx.stopVoice({
                localId: me.wxLocalList[me.playID] // 需要停止的音频的本地ID，由stopRecord接口获得
            });
            if (me.wxLocalList.length >= me.playID + 1) {
                wx.stopVoice({
                    localId: me.wxLocalList[me.playID] // 需要停止的音频的本地ID，由stopRecord接口获得
                });
                wx.stopVoice({
                    localId: me.wxLocalList[me.playID + 1] // 需要停止的音频的本地ID，由stopRecord接口获得
                });
                me.playDom.removeClass('play');
            } else {
                wx.stopVoice({
                    localId: me.wxLocalList[me.playID] // 需要停止的音频的本地ID，由stopRecord接口获得
                });
                me.playDom.removeClass('play');
            }
        } else {
            // 本地语音停止播放
            if (me.audio) {
                me.audio.pause();
                me.playID = 0;
            }
        }
    },
    playRecord: function(wxLocalList, i) {
        var me = this;
        if (me.playFlag == 0) {
            // 微信
            if (i > me.wxLocalList.length) return;
            me.playID = i;
            wx.playVoice({
                localId: me.wxLocalList[me.playID] // 需要播放的音频的本地ID，由stopRecord接口获得
            });
            wx.onVoicePlayEnd({
                success: function(res) {
                    me.playID++;
                    if (me.wxLocalList.length > me.playID) {
                        // me.wxPlay(me.wxLocalList, me.playID);
                        me.playRecord(me.wxLocalList, me.playID);
                    } else {
                        me.playDom.removeClass('play');
                        me.playID = 0;
                        me.wxLocalList = [];
                    }
                }
            });
        } else {
            // mp3
            if (wxLocalList.length < i) return;
            me.playID = i;
            $('#mp3vip').remove();
            $('body').append('<audio id="mp3vip" class="mp3vip preload" src="' + wxLocalList[me.playID] + '"></audio>');
            me.audio = document.getElementById('mp3vip');
            me.audio.play();
            me.audio.addEventListener('ended', function() {
                me.playID++;
                if (wxLocalList.length > me.playID) {
                    me.playRecord(wxLocalList, me.playID);
                } else {
                    me.playDom.removeClass('play');
                    me.playID = 0;
                    wxLocalList = [];
                    $('.ktips').html('播放结束');
                }
            }, true);
            $('.ktips').html('正在播放第 ' + (i + 1) + ' 段语音，共 ' + wxLocalList.length + ' 段');
        }
    },
    wxPlay: function(wxLocalList, i) {
        var me = this;
        if (i > me.wxLocalList.length) return;
        me.playID = i;
        wx.playVoice({
            localId: me.wxLocalList[me.playID] // 需要播放的音频的本地ID，由stopRecord接口获得
        });
        wx.onVoicePlayEnd({
            success: function(res) {
                me.playID++;
                if (me.wxLocalList.length > me.playID) {
                    me.wxPlay(me.wxLocalList, me.playID);
                } else {
                    me.playDom.removeClass('play');
                    me.playID = 0;
                    me.wxLocalList = [];
                }
            }
        });
    },
    lcPlay: function(wxLocalList, i) {
        var me = this;
        if (wxLocalList.length < i) return;
        me.playID = i;
        me.audio = document.getElementById(wxLocalList[me.playID]);
        me.audio.play();
        if (!$('#' + wxLocalList[me.playID]).hasClass('zc')) {
            $('#' + wxLocalList[me.playID]).addClass('zc');
            me.audio.addEventListener('ended', function() {
                me.playID++;
                if (wxLocalList.length > me.playID) {
                    me.lcPlay(wxLocalList, me.playID);
                } else {
                    me.playDom.removeClass('play');
                    me.playID = 0;
                    wxLocalList = [];
                    $('.ktips').html('播放结束');
                }
            }, false);
        }
        $('.ktips').html('正在播放第 ' + (i + 1) + ' 段语音，共 ' + wxLocalList.length + ' 段');
    },
    downloadWXVoice: function(wxServerList, i, flag) {
        var me = this;
        showLoading(null, '下载中...');
        if (flag) me.wxLocalList = [];
        me.playID = i;
        wx.downloadVoice({
            serverId: me.wxServerList[me.playID], // 需要下载的音频的服务器端ID，由uploadVoice接口获得
            isShowProgressTips: 0, // 默认为1，显示进度提示
            success: function(res) {
                // alert(JSON.stringify(res));
                me.wxLocalList.push(res.localId);
                // me.wxServerList.shift();
                me.playID++;
                if (me.wxServerList.length > me.playID) {
                    me.downloadWXVoice(me.wxServerList, me.playID, false);
                } else {
                    hideLoading();
                    me.playID = 0;
                    me.playDom.addClass('play').attr('play-list', me.wxLocalList);
                    // me.wxPlay(me.wxLocalList, 0);
                    me.playRecord(me.wxLocalList, 0);
                }
            },
            fail: function(e) {
                hideLoading();
                swal('微信语音服务不可用');
            }
        });
    },
    downloadMP3: function(i) {
        var me = this;
        if (!me.playDom.attr('play-list')) me.playDom.attr('play-list', me.mp3List);
        showLoading(null, '正在下载音频 ' + (i + 1) + '/' + me.mp3List.length);
        $('.ktips').html('正在下载第 ' + (i + 1) + ' 个语音');
        try {
            var audio = new Audio(me.mp3List[i]);
            audio.onloadedmetadata = function() {
                console.log('第 ' + (i + 1) + ' 个语音下载完毕');
                i++;
                if (i < me.mp3List.length) {
                    me.downloadMP3(i);
                } else {
                    hideLoading();
                    me.playDom.addClass('play').attr('mp3load', 'true');
                    me.playRecord(me.mp3List, 0);
                }
            };
        } catch(e) {
            hideLoading();
            showTips('error');
        };
    },
    fillItemInfo: function(data) {
        if (data.des) $('.content-title').append('<p class="des">' + data.des + '</p>').removeClass('none');
        if (data.vi) $('.content-title').append('<video x-webkit-airplay="true" webkit-playsinline="yes" id="video" class="video video-js vjs-default-skin" controls preload="auto" data-setup="{}"><source src="' + data.vi + '" type="video/mp4" /></video>');
    }
};

W.callBackMobileGetTypekHandler = function(data) {
    var me = H.index;
    if (data.result) {
        if (!me.ts) me.ts = data.type;
        // if (me.froms == 'history') me.reviewInfoPort();
        me.reviewRecordDetailPort();
        bindOpendid(data);
    } else {
        toUrl("../../infor/register.html?ref=review");
    }
};

W.callBackreviewRecordDetailHandler = function(data) {
    var me = H.index;
    if (data.result) {
        me.checkConfig(data);
    } else {
        $('#re-ac').addClass('none');
        showNewLoading(null, '该同学还未提交作业');
        hideLoading();
    }
};

W.callBackreviewInfoListHandler = function(data) {
    var me = H.index;
    if (data.result) {
        me.fillItemInfo(data);
    } else {
    }
};

W.callBackreviewRecordCommentHandler = function(data) {
    var me = H.index;
    if (data.result) {
        deConfirm2();
        showTips('提交成功，3秒后跳至列表页', null, 2e3);
        setTimeout(function() {
            toUrl('review-list.html?uid=' + me.uid + '&stuid=' + me.stuid + '&pname=' + encodeURIComponent(me.pname) + '&ruid=' + me.ruid + '&ts=' + me.ts + '&per=' + me.per);
        }, 3e3);
    } else {
        showTips('提交失败，请重试');
    }
    hideLoading();
};

$(function() {
    H.jssdk.init('off');
    H.index.init();
});