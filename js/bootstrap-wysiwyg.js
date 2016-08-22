/* 
* @Author: lime
* @Date:   2014-05-01 15:16:06
* @Last Modified by:   lime
* @Last Modified time: 2014-05-30 11:44:04
*/

(function ($) {
    'use strict';
    var readFileIntoDataUrl = function (fileInfo) {
        var loader = $.Deferred(),
            fReader = new FileReader();
        fReader.onload = function (e) {
            loader.resolve(e.target.result);
        };
        fReader.onerror = loader.reject;
        fReader.onprogress = loader.notify;
        fReader.readAsDataURL(fileInfo);
        return loader.promise();
    };
    $.fn.cleanHtml = function () {
        var html = $(this).html();
        return html && html.replace(/(<br>|\s|<div><br><\/div>|&nbsp;)*$/, '');
    };
    $.fn.getHtml = function () {
        var html = $(this).html();
        // return html && html.replace("<", '&lt;').replace(">", "&gt;");
        return html;
    };
    $.fn.wysiwyg = function (userOptions) {
        var editor = this,
            selectedRange,
            options,
            toolbarBtnSelector,
            updateToolbar = function () {
                if (options.activeToolbarClass) {
                    $(options.toolbarSelector).find(toolbarBtnSelector).each(function () {
                        var command = $(this).data(options.commandRole);
                        if (document.queryCommandState(command)) {
                            $(this).addClass(options.activeToolbarClass);
                        } else {
                            $(this).removeClass(options.activeToolbarClass);
                        }
                    });
                }
            },
            execCommand = function (commandWithArgs, valueArg) {
                var commandArr = commandWithArgs.split(' '),
                    command = commandArr.shift(),
                    args = commandArr.join(' ') + (valueArg || '');
                document.execCommand(command, 0, args);
                updateToolbar();
            },
            bindHotkeys = function (hotKeys) {
                $.each(hotKeys, function (hotkey, command) {
                    editor.keydown(hotkey, function (e) {
                        if (editor.attr('contenteditable') && editor.is(':visible')) {
                            e.preventDefault();
                            e.stopPropagation();
                            execCommand(command);
                        }
                    }).keyup(hotkey, function (e) {
                        if (editor.attr('contenteditable') && editor.is(':visible')) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    });
                });
            },
            getCurrentRange = function () {
                var sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    return sel.getRangeAt(0);
                }
            },
            saveSelection = function () {
                selectedRange = getCurrentRange();
            },
            restoreSelection = function () {
                var selection = window.getSelection();
                if (selectedRange) {
                    try {
                        selection.removeAllRanges();
                    } catch (ex) {
                        document.body.createTextRange().select();
                        document.selection.empty();
                    }

                    selection.addRange(selectedRange);
                }
            },
            insertFiles = function (files) {
                editor.focus();
                $.each(files, function (idx, fileInfo) {
                    if (/^image\//.test(fileInfo.type)) {
                        $.when(readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
                            execCommand('insertimage', dataUrl);
                        }).fail(function (e) {
                            options.fileUploadError("file-reader", e);
                        });
                    } else {
                        options.fileUploadError("unsupported-file-type", fileInfo.type);
                    }
                });
            },
            markSelection = function (input, color) {
                restoreSelection();
                if (document.queryCommandSupported('hiliteColor')) {
                    document.execCommand('hiliteColor', 0, color || 'transparent');
                }
                saveSelection();
                input.data(options.selectionMarker, color);
            },
            bindToolbar = function (toolbar, options) {
                toolbar.find(toolbarBtnSelector).click(function () {
                    restoreSelection();
                    editor.focus();
                    execCommand($(this).data(options.commandRole));
                    saveSelection();
                });
                toolbar.find('[data-toggle=dropdown]').click(restoreSelection);

                toolbar.find('input[type=text][data-' + options.commandRole + ']').on('webkitspeechchange change', function () {
                    var newValue = this.value; /* ugly but prevents fake double-calls due to selection restoration */
                    this.value = '';
                    restoreSelection();
                    if (newValue) {
                        editor.focus();
                        execCommand($(this).data(options.commandRole), newValue);
                    }
                    saveSelection();
                }).on('focus', function () {
                    var input = $(this);
                    if (!input.data(options.selectionMarker)) {
                        markSelection(input, options.selectionColor);
                        input.focus();
                    }
                }).on('blur', function () {
                    var input = $(this);
                    if (input.data(options.selectionMarker)) {
                        markSelection(input, false);
                    }
                });
                toolbar.find('input[type=file][data-' + options.commandRole + ']').change(function () {
                    restoreSelection();
                    if (this.type === 'file' && this.files && this.files.length > 0) {
                        insertFiles(this.files);
                    }
                    saveSelection();
                    this.value = '';
                });
            },
            initFileDrops = function () {
                editor.on('dragenter dragover', false)
                    .on('drop', function (e) {
                        var dataTransfer = e.originalEvent.dataTransfer;
                        e.stopPropagation();
                        e.preventDefault();
                        if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
                            insertFiles(dataTransfer.files);
                        }
                    });
            };

        options = $.extend({}, $.fn.wysiwyg.defaults, userOptions);
        toolbarBtnSelector = 'a[data-' + options.commandRole + '],button[data-' + options.commandRole + '],input[type=button][data-' + options.commandRole + ']';
        bindHotkeys(options.hotKeys);
        if (options.dragAndDropImages) {
            initFileDrops();
        }
        bindToolbar($(options.toolbarSelector), options);
        editor.attr('contenteditable', true)
            .on('mouseup keyup mouseout', function () {
                saveSelection();
                updateToolbar();
            });
        $(window).bind('touchend', function (e) {
            var isInside = (editor.is(e.target) || editor.has(e.target).length > 0),
                currentRange = getCurrentRange(),
                clear = currentRange && (currentRange.startContainer === currentRange.endContainer && currentRange.startOffset === currentRange.endOffset);
            if (!clear || isInside) {
                saveSelection();
                updateToolbar();
            }
        });

        try{
            MathJax.Hub.Config({
                showMathMenu: false,
                showMathMenuMSIE: false,
                messageStyle: "none",
                displayAlign: "left",
                delayStartupUntil: "onload",
                extensions: ["tex2jax.js"],
                jax: ["input/TeX", "output/HTML-CSS"],
                tex2jax: {
                    inlineMath: [
                        ["$", "$"],
                        ["\\(", "\\)"]
                    ]
                }
            });
            MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
        }
        catch(e){}

        try{
            $("input").iCheck({
                checkboxClass: 'icheckbox_minimal',
                radioClass: 'iradio_minimal',
            });
        }
        catch(e){}
        
        
        /******link*******/
        $(".command-InsertLink").click(function(event) {
            $("#insert-link-modal").modal({
                backdrop: false,
                keyboard: false
            });
        });
        $("#cancel-insert-link-button").click(function(event) {
            $("#insert-link-modal").modal('hide');
        });
        $("#do-insert-link-button").click(function(event) {
            var link = $("input[name='insert-link-input']").val();
            var text = $("input[name='insert-link-text']").val();
            if (!is_null(link)) {
                if (is_null(text)) {
                    text = link;
                }
                editor.append(sprintf("<a href='%s'>%s</a>", link, text));
            }
            $("#insert-link-modal").modal('hide');
        });
        $("#insert-link-modal").on('hide', function() {
            $("input[name='insert-link-input']").val('');
            $("input[name='insert-link-text']").val('');
        });
        /**************/


        /*******code*******/
        $(".command-InsertCode").click(function(event) {
            $("#insert-code-modal").modal({
                backdrop: false,
                keyboard: false
            });
        });
        $("#cancel-insert-code-button").click(function(event) {
            $("#insert-code-modal").modal('hide');
        });
        $("#do-insert-code-button").click(function(event) {
            var codes = $("textarea[name='insert-code-textarea']").val();
            if (!is_null(codes)) {
                var html = sprintf("<pre><code>%s</code></pre><br>", codes);
                editor.append(html);
            }
            $("#insert-code-modal").modal('hide');
        });
        $("#insert-code-modal").on('hide', function() {
            $("textarea[name='insert-code-textarea']").val('');
        });
        $("textarea[name='insert-code-textarea']").bind('keydown', 'tab', function() {
            $(this).val(sprintf("%s    ", $(this).val()));
            return false;
        });
        /***********/

        /******math*******/
        $(".command-InsertMath").click(function(event) {
            $("#insert-math-modal").modal({
                backdrop: false,
                keyboard: false
            });
        });
        $("#cancel-insert-math-button").click(function(event) {
            $("#insert-math-modal").modal('hide');
        });
        $("#do-insert-math-button").click(function(event) {
            var math_code = $("textarea[name='insert-math-textarea']").val();
            if(!is_null(math_code)){
                var math_mode;
                if($("input[name='math-mode-inline']").attr("checked")){
                    math_mode = " \\( %s \\) ";
                }
                else{
                    math_mode = "\\begin{align} %s \\end{align}<br><br>";
                }
                editor.append(sprintf(math_mode, math_code));
            }
            $("#insert-math-modal").modal('hide');
        });
        $("#insert-math-modal").on('hide', function() {
            $("textarea[name='insert-math-textarea']").val('');
            $("#math-preview").html('');
            $("input[name='math-mode-inline']").attr("checked", false);
        });

        function math_textarea_change(){
            $("#math-preview").html(sprintf("\\begin{align} %s \\end{align}", 
                                        $("textarea[name='insert-math-textarea']").val()));
            var math = document.getElementById("math-preview");
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, math]);
        };

        $("a[data-latex]").click(function(event) {
            $("textarea[name='insert-math-textarea']").val(
                sprintf("%s%s ", $("textarea[name='insert-math-textarea']").val(), 
                    $(this).data("latex")));
                $("textarea[name='insert-math-textarea']").change();
                $("textarea[name='insert-math-textarea']").focus();
                $("textarea[name='insert-math-textarea']").setCurPos(
                    $("textarea[name='insert-math-textarea']").val().length);
        });

        $("textarea[name='insert-math-textarea']").change(function(){
            math_textarea_change();
        });

        try{
            if ($.browser.msie) {
                $("textarea[name='insert-math-textarea']").get(0).attachEvent(
                        "onpropertychange", function(o) {
                    math_textarea_change();
                });
            } 
            else {
                $("textarea[name='insert-math-textarea']").get(0).addEventListener("input", function(o) {
                    math_textarea_change()
                }, false);
            }
        }
        catch(e){
        }
        /**************/


        /*******image*******/
        $(".command-AddImage").click(function(event) {
            $("#insert-image-modal").modal({
                backdrop: false,
                keyboard: false
            });
        });
        $("#cancel-add-image-button").click(function(event) {
            $("#insert-image-modal").modal('hide');
        });
        $("#do-quote-image-button").click(function(event) {
            var url = $("input[name='quote-image-input']").val();
            if(!is_null(url)){
                editor.append(sprintf("<img src='%s'/><br>", url));
                editor.focus();
            }
            $("#insert-image-modal").modal('hide');
        });

        $("#insert-image-modal").on('hide', function(){
            $("input[name='quote-image-input']").val('');
        });

        try{
            $("#upload-image-input").fileupload({
                dataType: 'json',
                formData: [{
                    name: "_xsrf",
                    value: getCookie("_xsrf")
                }],
                done: function (e, data) {
                    editor.append(sprintf("<img src='%s'/><br>", data.result.files[0].url));
                    editor.focus();
                    $("#insert-image-modal").modal('hide');
                }
            });
        }
        catch(e){}
        
        editor.on('paste', function(event) {
            // return false;
        });
        /***********/
        return editor;
    };

    $.fn.wysiwyg.defaults = {
        hotKeys: {
            'ctrl+b meta+b': 'bold',
            'ctrl+i meta+i': 'italic',
            'ctrl+u meta+u': 'underline',
            'ctrl+z meta+z': 'undo',
            'ctrl+y meta+y meta+shift+z': 'redo',
            'ctrl+l meta+l': 'justifyleft',
            'ctrl+r meta+r': 'justifyright',
            'ctrl+e meta+e': 'justifycenter',
            'ctrl+j meta+j': 'justifyfull',
            'shift+tab': 'outdent',
            'tab': 'indent'
        },
        toolbarSelector: '[data-role=editor-toolbar]',
        commandRole: 'edit',
        activeToolbarClass: 'btn-info',
        selectionMarker: 'edit-focus-marker',
        selectionColor: 'darkgrey',
        dragAndDropImages: true,
        fileUploadError: function (reason, detail) { console.log("File upload error", reason, detail); }
    };
}(window.jQuery));
