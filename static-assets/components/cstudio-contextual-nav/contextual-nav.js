var YDom = YAHOO.util.Dom;
var YEvent = YAHOO.util.Event;

/**
 * contextual nav
 */
CStudioAuthoring.ContextualNav = CStudioAuthoring.ContextualNav || {

	initialized: false,

	/**
	 * call out to the authoring environment for the nav content and overlay it
	 * on success.
	 */
	hookNavOverlayFromAuthoring: function() {
		if(!this.initialized) {
			this.initialized = true;
			this.updateContextualNavOverlay()
		}
	},

	/**
	 * Add the contextual navigation overlay / authoring support over 
	 * top of the existing page
	 * @param content to overlay
	 */
	updateContextualNavOverlay: function(context) {
		var me = this;

		context = (context) ? context : CStudioAuthoringContext.navContext;
		CStudioAuthoring.Service.retrieveContextualNavContent(context, {
			success: function(navContent) {
				CStudioAuthoring.ContextualNav.addNavContent(navContent);
				YAHOO.util.Event.onAvailable("authoringContextNavHeader", function() {
                    document.domain = CStudioAuthoringContext.cookieDomain;
					CStudioAuthoring.Events.contextNavReady.fire();
					me.getNavBarContent()
				}, this);
			},
			failure: function() {
				YAHOO.log("Failed to hook context nav", "error", "authoring nav callback");
			}
		});
	},	

	/**
	 * add the contextual nav to the page - first time call
	 */
	addNavContent: function(navHtmlContent) {

		var bar = document.createElement("div");

		bar.id = "controls-overlay";
		bar.innerHTML = navHtmlContent;

		CStudioAuthoring.Service.retrieveContextNavConfiguration("default", {
			success: function(config) {
				var me = this;
				var $ = jQuery || function(fn) { fn() };
				$(function () {
					document.body.appendChild(bar);
					if(CStudioAuthoringContext.role != "admin"){
						$('#studioBar .navbar-right .users-link').hide();
					}
					me.context.buildModules(config, bar);
				});

                CStudioAuthoring.Operations.createNavBarDropDown("help");

			},
			failure: function() {},
			context: this
		});
	},

	getNavBarContent: function() {
		var callback = {
			success: function(results) {
				document.getElementById('nav-user-email').innerHTML = results.email;
				document.getElementById('account-dropdown').childNodes[0].nodeValue = results.username;
			},
			failure: function(response) {

			}
		};

		CStudioAuthoring.Service.getUserInfo(callback);
		document.getElementById('account-dropdown').childNodes[0].nodeValue = CStudioAuthoringContext.user;
	},

    /**
     * given a dropdown configuration, build the nav
     */
    buildModules: function(navConfig, barEl) {

		var c = navConfig;
		if (c.left && c.left.menuItem && c.left.menuItem.item) {
			this.showLeftModules(c.left.menuItem.item, barEl);
		}
		if (c.right && c.right.menuItem && c.right.menuItem.item) {
			this.showRightModules(c.right.menuItem.item, barEl);
		}

		if(navConfig.modules.module.length) {
			for(var i=0; i<navConfig.modules.module.length; i++) {
				var module = navConfig.modules.module[i];
				 
				var cb = {
					moduleLoaded: function(moduleName, moduleClass, moduleConfig) {
						try {
						    moduleClass.initialize(moduleConfig);
						} catch (e) {
						    // in preview, this function undefined raises error -- unlike dashboard.
						    // I agree, not a good solution!
						}
					}
				};
				
                CStudioAuthoring.Module.requireModule(
                    module.moduleName,
                    '/static-assets/components/cstudio-contextual-nav/' + module.moduleName + ".js",
                    0,
                    cb
                );
			}
		}
    },

	/**
     * Hides/Disables first all the modules, so then when looping configuration, they are shown again
	 * 
     */
	preProcessModules: function(modulesMap, $barEl, onItem) { 
		for (var key in modulesMap) {
			if (modulesMap.hasOwnProperty(key)) {
				$barEl.find(modulesMap[key]).addClass('hidden');
				onItem(key, modulesMap[key]);
			}
		};
	},

	/**
     * Shown left context nav modules based on configuration
     */
	showLeftModules: function(modules, barEl) {
		var modulesMap = CStudioAuthoring.ContextualNav.LeftModulesMap;
		this.showModules(modulesMap, modules, barEl);
	},

	/**
     * Shown right context nav modules based on configuration
     */
	showRightModules: function(modules, barEl) {
		var modulesMap = CStudioAuthoring.ContextualNav.RightModulesMap;
		this.showModules(modulesMap, modules, barEl);
	},

	/**
     * Generic show modules stuff
     */
	showModules: function(modulesMap, modules, barEl) {
		var PREVIEW_CONTAINERS = '.studio-preview, .site-dashboard';
		var DISABLED = 'disabled-wcm-dropdown';
		
		var $barEl = $(barEl);

		this.preProcessModules(modulesMap, $barEl, function(key) {
			if (key === 'wcm_dropdown') {
				$(PREVIEW_CONTAINERS).addClass(DISABLED);
			}
		});

		for (var i = 0; i < modules.length; i++) {
			var name = modules[i].modulehook;
			$barEl.find(modulesMap[name]).removeClass('hidden');
			
			if (name === 'wcm_dropdown') {
				$(PREVIEW_CONTAINERS).removeClass(DISABLED);
			}

		};
	}
};

CStudioAuthoring.ContextualNav.LeftModulesMap = {
	'wcm_logo': '.navbar-brand',
	'wcm_dropdown': '#acn-dropdown-wrapper',
	'wcm_content': '#activeContentActions',
	'admin_console': '#acn-admin-console'
};

CStudioAuthoring.ContextualNav.RightModulesMap = {
	'ice_tools': '#acn-ice-tools',
	'preview_tools': '#acn-preview-tools',
	'persona': '#acn-persona',
	'search': '[role="search"]',
	'logout': '#acn-logout-link'
};

CStudioAuthoring.Events.contextNavLoaded.fire();
