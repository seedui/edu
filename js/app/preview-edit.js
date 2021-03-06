var $progress = $('.progress'),
    $bar = $('.progress__bar'),
    $text = $('.progress__text'),
    percent = 0,
    update, resetColors, speed = 200,
    orange = 30,
    yellow = 55,
    green = 85,
    timer;
var upload = function() {
    var formData = new FormData(),
        target = event.target || event.srcElement;
    // alert(JSON.stringify(target.files[0]));
    if (is_android()) {
        if (target.files[0].type != 'video/mp4') {
            showTips('视频只能是MP4格式！');
            clearUpload();
            return false;
        }
    }
    if (target.files[0].size > 1024 * 1024 * 20) {
        showTips('视频不能超过20M，试试压缩下再传');
        clearUpload();
        return false;
    }

    formData.append('file', target.files[0]);

    $.ajax({
        url: business_url + 'file/upload/video',
        type: "POST",
        data: formData,
        dataType: 'json',
        processData: false,
        contentType: false,
        cache: false,
        timeout: 100000000,
        beforeSend: function() {
            $('#video').addClass('none');
            $('.btn-upload').addClass('loading');
            $('.progress-box').removeClass('none');
            $('.upload-tips').remove();
            $progress.addClass('progress--active');
        },
        xhr: function() {
            var xhr = $.ajaxSettings.xhr();
            if (xhr.upload) {
                xhr.upload.addEventListener('progress', function(event) {
                    var total = event.total,
                        position = event.loaded || event.position;
                    percent = 0;
                    if (event.lengthComputable) percent = Math.ceil(position / total * 100);
                    H.index.loadingUpdate();
                }, false);
            }
            return xhr;
        },
        success: function(data, status, jXhr) {
            // $text.text('正在验证视频：70%');
            // setTimeout(function(){$text.text('正在验证视频：78%');}, 1e3);
            // setTimeout(function(){$text.text('正在验证视频：84%');}, 1700);
            // setTimeout(function(){$text.text('正在验证视频：86%');}, 2e3);
            // setTimeout(function(){$text.text('正在验证视频：92%');}, 3e3);
            // setTimeout(function(){$text.text('正在验证视频：98%');}, 3500);
            if (data.result) {
                $('#video, .upload-tips').remove();
                setTimeout(function() {
                    // $text.text('视频上传完成');
                    $('.progress-box').addClass('none');
                    H.index.resetColors();
                    H.index.videoUrl = data.filePath;
                    $('.btn-upload').after('<section class="upload-tips">视频上传成功。验证和转化视频需要一些时间，您可以点击确认按钮后再查看。</section>');
                    $('.btn-upload').addClass('repeat');
                    // <video x-webkit-airplay="true" webkit-playsinline="yes" id="video" class="video video-js vjs-default-skin" controls preload="auto" data-setup="{}"><source src="' + data.filePath + '" type="video/mp4" /></video>
                }, 1e3);
            } else {
                showTips('很抱歉！上传错误，请重试');
                $('.progress-box').addClass('none');
                H.index.resetColors();
            }
        },
        error: function(jXhr, status, error) {
            showTips('很抱歉！上传错误，请重试');
            $('.progress-box').addClass('none');
            H.index.resetColors();
        }
    });

    if (target.files[0].size) $('.video-size').text(parseFloat(target.files[0].size / 1024 / 1024).toFixed(2));
};
var clearUpload = function() {
    var file = $('#file-upload');
    file.after(file.clone().val(''));
    file.remove();
};

H.index = {
    ts: getQueryString('ts') || '',
    uid: getQueryString('uid') || '',
    pname: getQueryString('pname') || '',
    stuid: getQueryString('stuid') || '',
    oldPer: 1,
    videoUrl: '',
    init: function() {
        this.event();
        this.safeKeyLost();
    },
    safeKeyLost: function() {
        if (!this.uid || !this.stuid) {
            $('#pre-edit').addClass('none');
            showNewLoading($('body'), '关键参数丢失，3秒后返回预习首页');
            setTimeout(function() {
                toUrl('preview-index.html');
            }, 3e3);
        } else {
            this.userGettypePort();
        }
    },
    event: function() {
        var me = this;
        $(".btn-submit").click(function(e) {
            e.preventDefault();
            if (me.checkInfo()) me.prepareInfoAddPort();
        });
        $(".btn-cancel").click(function(e) {
            e.preventDefault();
            toUrl('preview-index.html');
        });
        $(".btn-upload").click(function(e) {
            e.preventDefault();
            $('#file-upload').trigger('click');
        });
    },
    userGettypePort: function() {
        showLoading(null, '请稍等...');
        getResultEdu("user/gettype", {
            openid: openid,
            eduid: eduData[getQueryString('kfrom')].uid
        }, "callBackMobileGetTypekHandler");
    },
    prepareInfoPort: function(data) {
        getResult('prepare/info/list', {
            cuid: this.uid
        }, 'callBackprepareInfoListHandler');
    },
    prepareInfoAddPort: function(data) {
        showLoading(null, '提交中...');
        getResult('prepare/info/add', {
            eduUuid: eduData[getQueryString('kfrom')].uid,
            courseUuid: this.uid,
            period: encodeURIComponent($.trim($('input[name="per"]').val())),
            title: '',
            infoDesc: encodeURIComponent($.trim($('textarea').val())),
            infoVideo: this.videoUrl,
            infoAudio: ''
        }, 'callBackprepareInfoAddHandler');
    },
    fillItemInfo: function(data) {
        var me = this;
        if (data.per) {
            me.oldPer = data.per;
            $('input[name="per"]').val(data.per);
        }
        if (me.pname) $('h6').removeClass('none').find('label').html(me.pname);
        if (data.des) $('.desc textarea').val(data.des);
        if (data.vi) {
            me.videoUrl = data.vi;
            $('.btn-upload').addClass('repeat');
            $('.btn-upload').after('<video x-webkit-airplay="true" webkit-playsinline="yes" id="video" class="video video-js vjs-default-skin" controls preload="auto" data-setup="{}"><source src="' + data.vi + '" type="video/mp4" /></video>');
        }
    },
    checkInfo: function() {
        var me = this,
            per = $.trim($('input[name="per"]').val()),
            title = $.trim($('input[name="title"]').val()),
            desc = $.trim($('textarea').val()),
            video = $('video').attr('uri');
        if (!isNaN(per) && per > 0) {} else {
            $('input[name="per"]').val(me.oldPer);
            showTips('请输入正整数');
            return false;
        }
        if (!per || per.length == 0 || parseInt(per) < parseInt(me.oldPer)) {
            showTips('课时数必须大于等于当前课时数');
            $('input[name="per"]').val(me.oldPer);
            return false;
        }
        if (desc.length == 0 || desc.length > 300) {
            showTips('请输入不多于300字的文字说明');
            $('textarea');
            return false;
        }
        return true;
    },
    loadingUpdate: function() {
        percent += Math.random() * 1.8;
        percent = parseFloat(percent.toFixed(1));
        $text.find('em').text(percent + '%');
        if (percent >= 100) {
            percent = 100;
            $progress.addClass('progress--complete');
            $bar.addClass('progress__bar--blue');
            $text.text('视频上传完成，请稍后');
            // setTimeout(function(){$text.text('验证视频会花上点时间');}, 2e3);
            // setTimeout(function(){$text.text('请您耐心等待');}, 5e3);
        } else {
            if (percent >= green) {
                $bar.addClass('progress__bar--green');
                $text.addClass('white');
            } else if (percent >= yellow) {
                $bar.addClass('progress__bar--yellow');
            } else if (percent >= orange) {
                $bar.addClass('progress__bar--orange');
            }
        }
        $bar.css({
            width: percent + '%'
        });
    },
    resetColors: function() {
        clearUpload();
        $text.html('上传进度：<em>0%</em>');
        $bar.removeClass('progress__bar--green').removeClass('progress__bar--yellow').removeClass('progress__bar--orange').removeClass('progress__bar--blue');
        $progress.removeClass('progress--complete');
        $bar.removeAttr('style');
        $('.btn-upload').removeClass('loading');
        $('#video').removeClass('none');
    }
};

W.callBackMobileGetTypekHandler = function(data) {
    var me = H.index;
    if (data.result) {
        if (!me.ts) me.ts = data.type;
        if (me.ts == 1 || me.ts == 2) {
            me.prepareInfoPort();
        } else {
            $('#pre-edit').addClass('none');
            hideLoading();
            setTimeout(function() {
                toUrl('preview-index.html');
            }, 5e3);
            showNewLoading($('body'), '您还不是老师！5秒后返回预习首页');
        }
        bindOpendid(data);
    } else {
        toUrl("../../infor/register.html?ref=preview");
    }
};

W.callBackprepareInfoListHandler = function(data) {
    var me = H.index;
    if (data.result) {
        me.fillItemInfo(data);
    }
    hideLoading();
};

W.callBackprepareInfoAddHandler = function(data) {
    var me = H.index;
    if (data.result) {
        showTips('提交成功，3秒后跳至预习页', null, 2e3);
        setTimeout(function() {
            toUrl('preview-detail.html?uid=' + me.uid + '&stuid=' + me.stuid + '&pname=' + encodeURIComponent(me.pname) + '&ts=' + me.ts);
        }, 3e3);
    } else {
        showTips('提交失败，请重试！');
    }
    hideLoading();
};

$(function() {
    H.jssdk.init('off');
    H.index.init();
});