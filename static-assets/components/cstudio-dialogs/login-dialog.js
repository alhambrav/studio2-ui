var YDom = YAHOO.util.Dom;
// YConnect.setDefaultPostHeader(false);
//                YConnect.initHeader("Content-Type", "application/xml; charset=utf-8");
//                YConnect.
var YEvent = YAHOO.util.Event;

CStudioAuthoring.Dialogs = CStudioAuthoring.Dialogs || {};

/**
 * Submit to go live
 */
CStudioAuthoring.Dialogs.LoginDialog = CStudioAuthoring.Dialogs.LoginDialog || {

    /**
     * initialize module
     */
    initialize: function(config) {
    },

    /**
     * show dialog
     */
    showDialog: function(cb) {
        this._self = this;

        this.dialog = this.createDialog(cb);

        this.cb = cb;
        this.dialog.show();

        if(window.frameElement){
            var id = window.frameElement.getAttribute("id").split("-editor-")[1];
            var formSize = parent.getFormSize(id);
            if(formSize < 320){
                parent.setFormSize(320, id);
            }
        }
    },

    /**
     * hide dialog
     */
    closeDialog:function() {
        this.dialog.destroy();
    },

    /**
     * create dialog
     */
    createDialog: function(cb) {

        var CMgs = CStudioAuthoring.Messages;
        var previewLangBundle = CMgs.getBundle("previewTools", CStudioAuthoringContext.lang);

        YDom.removeClass("cstudio-wcm-popup-div", "yui-pe-content");

        var newdiv = YDom.get("cstudio-wcm-popup-div");
        if (newdiv == undefined) {
            newdiv = document.createElement("div");
            document.body.appendChild(newdiv);
        }

        function authRedirect(authConfig) {
            location = "/studio/#/login";
        }

        var divIdName = "cstudio-wcm-popup-div";
        newdiv.setAttribute("id",divIdName);
        newdiv.className= "yui-pe-content";
        newdiv.innerHTML = '<div class="contentTypePopupInner" id="upload-popup-inner">' +
            '<div class="contentTypePopupContent" id="contentTypePopupContent"> ' +
            '<div class="contentTypePopupHeader loginHeader">' +
            CMgs.format(previewLangBundle, 'login') +
            '</div> ' +
            '<div><form id="login_form">' +
                '<div class="contentTypeOuter">'+
                    '<div class="form-group">' +
                        '<label for="username">'+CMgs.format(previewLangBundle, 'emailUsername')+'</label>' +
                        '<input type="text" name="username" id="username" placeholder="john@domain.com" value="'+CStudioAuthoringContext.user+'" disabled/>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label for="password">'+CMgs.format(previewLangBundle, 'password')+'</label>' +
                        '<input type="password" name="pass" id="password" autofocus/>' +
                    '</div>' +
                    '<div class="alert alert-danger hidden" id="loginError">'+

                    '</div>'+
                '</div>' +
                '<div class="contentTypePopupBtn"> ' +
                    '<input type="submit" class="btn btn-primary cstudio-xform-button" id="loginButton" value="'+CMgs.format(previewLangBundle, 'signBackIn')+'" />' +
                    '<input type="button" class="btn btn-default cstudio-xform-button" id="loginCancelButton" value="'+CMgs.format(previewLangBundle, 'doneSignOut')+'"  />' +
                '</div>' +
            '</form></div>' +
            '</div> ' +
            '</div>';

        document.getElementById("upload-popup-inner").style.width = "350px";
        document.getElementById("upload-popup-inner").style.height = "180px";

        // Instantiate the Dialog
        login_dialog = new YAHOO.widget.Dialog("cstudio-wcm-popup-div",
            {   width : "360px",
                height : "311px",
                effect:{
                    effect: YAHOO.widget.ContainerEffect.FADE,
                    duration: 0.25
                },
                fixedcenter : true,
                visible : false,
                modal:true,
                close:false,
                constraintoviewport : true,
                underlay:"none",
                hideaftersubmit:false
            });

        // Render the Dialog
        login_dialog.render();

        var eventParams = {
            self: this
        };

       YAHOO.util.Event.addListener("loginButton", "click", this.loginPopupSubmit, eventParams);
       YAHOO.util.Event.addListener("loginCancelButton", "click", authRedirect);


        return login_dialog;
    },

    /**
     * event fired when the ok is pressed
     */
    loginPopupSubmit: function(event, args) {

        var self = this;
        var username = document.getElementById("username").value;
        var password = document.getElementById("password").value;


        var serviceCallback = {
            success: function(jsonResponse) {
                var response = eval("(" + jsonResponse + ")");
                if(response.username){
                    args.self.loginPopupCancel();
                    args.self.cb.success();
                }else{
                    var loginError = document.getElementById("loginError");
                    var cstudioWcmPopup = document.getElementById("cstudio-wcm-popup-div");
                    loginError.innerHTML = response.message;
                    if(loginError.classList.contains("hidden")){
                        loginError.classList.remove("hidden");
                        $(cstudioWcmPopup).height($(loginError).height() + $(cstudioWcmPopup).height() + 11);
                    }

                }
            },
            failure: function(response) {
            }
        };

        CStudioAuthoring.Service.login(username, password, serviceCallback);
    },

    /**
     * login
     */
    submitLogin: function(args) {

    },

    /**
     * event fired when the ok is pressed
     */
    loginPopupCancel: function(event) {
        CStudioAuthoring.Dialogs.LoginDialog.closeDialog();
        if(window.frameElement){
            var id = window.frameElement.getAttribute("id").split("-editor-")[1];
            if($('#ice-body').length > 0 && $($(".studio-ice-container-"+id,parent.document)[0]).height() > 212){
                $($(".studio-ice-container-"+id,parent.document)[0]).height(212);
            }
        }

    }


};

CStudioAuthoring.Module.moduleLoaded("login-dialog", CStudioAuthoring.Dialogs.LoginDialog);

