var YDom = YAHOO.util.Dom;
var YEvent = YAHOO.util.Event;


/**
 * WcmAssetsFolder
 * A root level folder is a configurable folder element that can be based at any
 * point along a wcm path.
 */

CStudioAuthoring.ContextualNav.WcmAssetsFolder = CStudioAuthoring.ContextualNav.WcmAssetsFolder || {

    ROOT_OPEN: "open",
    ROOT_CLOSED: "closed",
    ROOT_TOGGLE: "toggle",
    treePaths: [],
    storage: CStudioAuthoring.Storage,
    customIcons: {},

    /**
     * initialize module
     */
    initialize: function(config) {

        var WcmAssets = CStudioAuthoring.ContextualNav.WcmAssetsFolder;

        if(config.name == "wcm-assets-folder") {

            var instance = new CStudioAuthoring.ContextualNav.WcmAssetsFolderInstance(config);

            instance.openArray = {};

            var latestStored = CStudioAuthoring.ContextualNav.WcmAssetsFolder.storage.read( this.getStoredPathKey(instance) );
            if(latestStored){
                if(latestStored.indexOf(',')!=-1 || latestStored.indexOf('[')!=-1 || latestStored.indexOf('{')!=-1){
                    instance.openArray = JSON.parse(latestStored);
                }else{
                    instance.openArray = [];
                    instance.openArray.push(latestStored);
                }
            }

            var key = config.params.label;
            key = key.replace(/\s/g,'');
            WcmAssets.customIcons[key] = {};


            if(config.params['child-icon-closed']) {
                WcmAssets.customIcons[key].childIcons  = {
                    open: config.params['child-icon-open'] ? config.params['child-icon-open'] : config.params['child-icon-closed'],
                    closed: config.params['child-icon-closed']
                };
            }

            if(config.params['module-icon-closed']) {
                WcmAssets.customIcons[key].moduleIcons  = {
                    open: config.params['module-icon-open'] ? config.params['module-icon-open'] : config.params['module-icon-closed'],
                    closed: config.params['module-icon-closed']
                };
            }

            this.addContentTreeRootFolder(instance);

            window.setTimeout(function() {
                CStudioAuthoring.ContextualNav.WcmAssetsFolder.openLatest(instance);
            }, 1000);
        }
    },

    /**
     * add a root level folder to the content drop down
     */
    addContentTreeRootFolder: function(instance) {
        var folderListEl =  instance.config.containerEl;
        var WcmAssets = CStudioAuthoring.ContextualNav.WcmAssetsFolder;

        var parentFolderEl = document.createElement("div");

        var parentFolderLinkEl = document.createElement("a");
        parentFolderLinkEl.id = instance.label.toLowerCase() + "-tree";

        var label = instance.label.toLowerCase();
        label = label.replace(/ /g, '');
        var labelLangBundle = CMgs.format(siteDropdownLangBundle, (label));
        label = labelLangBundle == label ?
            instance.label : labelLangBundle;

        parentFolderLinkEl.innerHTML = label;
        parentFolderLinkEl.onclick = CStudioAuthoring.ContextualNav.WcmAssetsFolder.onRootFolderClick;
        parentFolderLinkEl.componentInstance = instance;

        var treeEl =  document.createElement("div");
        folderListEl.appendChild(parentFolderEl);
        parentFolderEl.appendChild(parentFolderLinkEl);
        parentFolderEl.appendChild(treeEl);

        //add custom icon class
        var key = instance.label;
        key = key.replace(/\s/g,'');

        if(WcmAssets.customIcons[key] && WcmAssets.customIcons[key].moduleIcons){
            YDom.addClass(parentFolderLinkEl, "custom-icon");
            YDom.addClass(parentFolderLinkEl, WcmAssets.customIcons[key].moduleIcons.closed);
        }

        YDom.addClass(parentFolderLinkEl, "acn-parent-folder");

        YDom.addClass(parentFolderEl, "acn-parent " + instance.label.toLowerCase() + "-tree");

        parentFolderLinkEl.rootFolderEl = treeEl;
        parentFolderLinkEl.parentControl = this;
        treeEl.rootFolderSite = CStudioAuthoringContext.site;
        treeEl.rootFolderPath = instance.path;

        instance.rootFolderEl = treeEl;
    },

    /**
     * initialize the content tree for the dropdown.
     * There are many methods involved, but it all starts here.
     */
    initializeContentTree: function(treeEl, path, instance) {
        var site = treeEl.rootFolderSite;
        var rootPath = treeEl.rootFolderPath;
        var pathToOpen = (path != undefined) ? path : null;

        var tree = new YAHOO.widget.TreeView(treeEl);
        Self.myTree = tree;
        tree.setDynamicLoad(this.onLoadNodeDataOnClick);
        tree.FOCUS_CLASS_NAME = null;

        var label = treeEl.previousElementSibling;
        YDom.addClass(label, "loading");

        CStudioAuthoring.Service.lookupSiteContent(site, rootPath, 1, "default", {
            openToPath: pathToOpen,
            success: function(treeData) {

                var items = treeData.item.children;

                if(instance.showRootItem) {
                    items = new Array(treeData.item);
                }

                CStudioAuthoring.ContextualNav.WcmAssetsFolder.drawTree(items, tree, path, instance);

                //add hover effect to nodes
                CStudioAuthoring.ContextualNav.WcmAssetsFolder.nodeHoverEffects(this);

                YDom.removeClass(label, "loading");
            },
            failure: function() {
                YDom.removeClass(label, "loading");
            }
        });
    },

    getStoredPathKey: function(instance) {
        return (CStudioAuthoringContext.site + "-"+ instance.label.replace(" ", "").toLowerCase() + '-opened');
    },

    /**
     * render function called on root level elements
     */
    drawTree: function(treeItems, tree, pathToOpenTo, instance, uniquePath) {

        var treeNodes = new Array();
        var treeNodesLabels = new Array();
        var currentLevelPath = null;
        var remainingPath = null;
        var nodeToOpen = null;
        var contextMenuPrefix = "ContextMenu-";
        var contextMenuId = contextMenuPrefix + tree.id;

        if(pathToOpenTo != null && pathToOpenTo != undefined) {
            var pathParts = pathToOpenTo.split("/");

            if(pathParts.length >= 2) {
                currentLevelPath = "/"+pathParts[1];
                remainingPath = pathToOpenTo.substring(currentLevelPath.length+1);
            }
        }

        for (var i=0; i<treeItems.length; i++) {
            var treeNodeTO = this.createTreeNodeTransferObject(treeItems[i]);

            if (treeNodeTO.isContainer == true) {
                treeNodeTO.style = "acn-parent-folder";
            }

            if(!treeItems[i].hideInAuthoring){
                var treeNode = this.drawTreeItem(treeNodeTO, tree.getRoot(), instance);
                treeNode.instance = instance;

                if(pathToOpenTo != null && treeNode != null) {
                    if(treeNodeTO.pathSegment == "index.xml") {
                        if(CStudioAuthoring.Utils.endsWith(treeNodeTO.path, currentLevelPath)) {
                            nodeToOpen = treeNode;
                        }
                    }
                }

                treeNodes.push(treeNode);
                treeNodesLabels.push(tree.root.children[i].labelElId);
            }
        }

        tree.subscribe('clickEvent', function(args) {
            CStudioAuthoring.ContextualNav.WcmAssetsFolder.onTreeNodeClick(args.node);
        });

        tree.subscribe("dblClickEvent", function(node) {
            return false;
        });

        tree.subscribe("expand", function(node) {
            var id = node.labelElId;
            var nodeId = YDom.get(id);

            if(nodeId != null) {
                var expandedNodeStyle = nodeId.className;
                expandedNodeStyle = expandedNodeStyle.replace(" acn-collapsed-tree-node-label","");
                nodeId.className = expandedNodeStyle + " acn-expanded-tree-node-label";
            }

            CStudioAuthoring.ContextualNav.WcmAssetsFolder.expandTree(node);

            if (Object.prototype.toString.call(instance.path) === '[object Array]') {
                var treeChild = tree.getEl().querySelectorAll(".acn-parent > div > div > .ygtvchildren > .ygtvitem");
                for (var i = 0; i < treeChild.length; i++) {
                    treeChild[i].setAttribute("num", instance.path[i].replace(/\//g, "").toLowerCase());
                }
            }else{
                var treeChild = tree.getEl().querySelectorAll(".acn-parent > div > div > .ygtvchildren > .ygtvitem");
                treeChild[0].setAttribute("num", instance.path.replace(/\//g, "").toLowerCase());
            }

            return true;
        });



        tree.subscribe("collapse", function(node) {
            var id = node.labelElId;
            var nodeId = YDom.get(id);
            var collapsedNodeStyle = nodeId.className;
            collapsedNodeStyle = collapsedNodeStyle.replace(" acn-expanded-tree-node-label","");
            nodeId.className = collapsedNodeStyle + " acn-collapsed-tree-node-label";

            CStudioAuthoring.ContextualNav.WcmAssetsFolder.collapseTree(node);

            if (Object.prototype.toString.call(instance.path) === '[object Array]') {
                var treeChild = tree.getEl().querySelectorAll(".acn-parent > div > div > .ygtvchildren > .ygtvitem");
                for (var i = 0; i < treeChild.length; i++) {
                    treeChild[i].setAttribute("num", instance.path[i].replace(/\//g, "").toLowerCase());
                }
            }else{
                var treeChild = tree.getEl().querySelectorAll(".acn-parent > div > div > .ygtvchildren > .ygtvitem");
                treeChild[0].setAttribute("num", instance.path.replace(/\//g, "").toLowerCase());
            }

            return true;
        });

        var contextMenu = new YAHOO.widget.ContextMenu(
            contextMenuId,
            {
                container: "acn-context-menu",
                trigger: "acn-dropdown-menu-wrapper",
                shadow: false,
                lazyload: true,
                zIndex: 100000
            }
        );

        contextMenu.subscribe('beforeShow', function() {
            CStudioAuthoring.ContextualNav.WcmAssetsFolder.onTriggerContextMenu(tree, this, contextMenuId);
        }, tree, false);

        //if(uniquePath) {
            var WcmAssetsFolder = CStudioAuthoring.ContextualNav.WcmAssetsFolder;
            nodeOpen = true;
            WcmAssetsFolder.treePaths.push(tree.id);
            (function (t, inst) {
                document.addEventListener('crafter.refresh', function (e) {
                    document.dispatchEvent(eventCM);
                    try {
                        if(e.data && e.data.length) {
                            for (var i = 0; i < e.data.length; i++){
                                Self.refreshNodes(e.data[i] ? e.data[i] : (oCurrentTextNode != null ? oCurrentTextNode : CStudioAuthoring.SelectedContent.getSelectedContent()[0]), true, e.parent == false? false : true, t, inst, e.changeStructure, e.typeAction);
                            }
                        }else{
                            Self.refreshNodes(e.data ? e.data : (oCurrentTextNode != null ? oCurrentTextNode : CStudioAuthoring.SelectedContent.getSelectedContent()[0]), true, e.parent == false? false : true, t, inst, e.changeStructure, e.typeAction);
                        }
                    } catch (er) {
                        if (CStudioAuthoring.SelectedContent.getSelectedContent()[0]) {
                            Self.refreshNodes(CStudioAuthoring.SelectedContent.getSelectedContent()[0], true, e.parent == false? false : true, t, inst, e.changeStructure, e.typeAction);
                        }
                    }

                    Self.refreshAllDashboards();

                }, false);

            })(tree, instance);
        //}

        contextMenu.subscribe('show', function() {
            if (!YDom.isAncestor(tree.id, this.contextEventTarget)) {
                this.hide();
            }
            var idTree = tree.id.toString().replace(/-/g,'');
            Self.myTree = Self.myTreePages[idTree];
        }, tree, false);

        tree.draw();

        if (Object.prototype.toString.call(instance.path) === '[object Array]') {
            var treeChild = tree.getEl().querySelectorAll(".acn-parent > div > div > .ygtvchildren > .ygtvitem");
            for (var i = 0; i < treeChild.length; i++) {
                treeChild[i].setAttribute("num", instance.path[i].replace(/\//g, "").toLowerCase());
            }
        }else{
            var treeChild = tree.getEl().querySelectorAll(".acn-parent > div > div > .ygtvchildren > .ygtvitem");
            treeChild[0].setAttribute("num", instance.path.replace(/\//g, "").toLowerCase());
        }

        if(nodeToOpen != null) {
            // opening to a specific path
            nodeToOpen.expand();
            nodeToOpen.openToPath = remainingPath;
        }

        var treeId = tree.id.toString().replace(/-/g,'');
        Self.myTreePages[treeId] = tree
    },

    /**
     * render method called on sub root level elements
     */
    drawSubtree: function(treeItems, root, pathToOpenTo, instance) {
        var treeNodes = new Array();
        var treeNodesLabels = new Array();
        var nodeToOpen = null;
        var currentLevelPath = null;
        var remainingPath = null;
        var replaceAllChildFolders = false;

        if(pathToOpenTo) {
            var pathParts = pathToOpenTo.split("/");

            if(pathParts.length >= 2) {
                currentLevelPath = "/"+pathParts[0];
                remainingPath = pathToOpenTo.substring(currentLevelPath.length);
            }
        }

        for (var i=0; i<treeItems.length; i++) {
            var treeNodeTO = this.createTreeNodeTransferObject(treeItems[i]);

            if(treeNodeTO.isContainer) {
                treeNodeTO.style = "acn-parent-folder no-preview";
            }

            if(!treeItems[i].hideInAuthoring){
                var treeNode = this.drawTreeItem(treeNodeTO, root, instance);
                treeNode.instance = instance;

                if(pathToOpenTo != null && treeNode != null) {
                    if(CStudioAuthoring.Utils.endsWith(treeNodeTO.path, currentLevelPath)) {
                        nodeToOpen = treeNode;
                    }
                }

                treeNodes.push(treeNode);
                if(root.children[i]) {
                    treeNodesLabels.push(root.children[i].labelElId);
                } else {
                    treeNodesLabels.push(treeNode.labelElId);
                }
            }
        }

        if(nodeToOpen) {
            nodeToOpen.expand();
            //nodeToOpen.openToPath = remainingPath;
        }
    },

    /**
     * render a tree item
     */
    drawTreeItem: function(treeNodeTO, root, instance) {
        var WcmAssets = CStudioAuthoring.ContextualNav.WcmAssetsFolder;

        if (treeNodeTO.container == true || treeNodeTO.name != 'index.xml') {

            if (treeNodeTO.style.match(/\bfolder\b/)) {
                var key = instance.label;
                key = key.replace(/\s/g,'');

                if(WcmAssets.customIcons[key] && WcmAssets.customIcons[key].childIcons){
                    treeNodeTO.style += ' custom-icon';
                    treeNodeTO.style += ' ' + WcmAssets.customIcons[key].childIcons.closed;
                }
            }

            var treeNode = new YAHOO.widget.TextNode(treeNodeTO, root, false);
            if(!Self.treeNodes)
                Self.treeNodes = [];

            Self.treeNodes[""+treeNode.labelElId] = treeNodeTO;
            treeNode.labelStyle = treeNodeTO.style;

            if(treeNodeTO.previewable == false) {
                treeNode.labelStyle += " no-preview";
            }else{
                treeNode.labelStyle += " preview";
            }
            treeNode.labelStyle+= "  yui-resize-label";
            treeNode.nodeType = "CONTENT";
            treeNode.treeNodeTO = treeNodeTO;
            treeNode.renderHidden = true;
            treeNode.nowrap = true;

            if(!treeNodeTO.isContainer) {
                treeNode.isLeaf = true;
            }
        }

        return treeNode;
    },

    /**
     * method fired when user clicks on the root level folder
     */
    onRootFolderClick: function() {
        var WcmAssetsFolder = CStudioAuthoring.ContextualNav.WcmAssetsFolder;

        WcmAssetsFolder.toggleFolderState(this.componentInstance, WcmAssetsFolder.ROOT_TOGGLE);
    },

    /**
     * toggle folder state
     */
    toggleFolderState: function(instance, forceState, path) {
        var WcmAssetsFolder = CStudioAuthoring.ContextualNav.WcmAssetsFolder;

        if(forceState != null && forceState != WcmAssetsFolder.ROOT_TOGGLE) {
            // force
            if(forceState == WcmAssetsFolder.ROOT_OPEN) {
                instance.rootFolderEl.style.display = 'block';
                instance.state = WcmAssetsFolder.ROOT_OPEN;
                this.initializeContentTree(instance.rootFolderEl, path, instance);
                this.save(instance, WcmAssetsFolder.ROOT_OPENED, null, "root-folder");

                //add custom icon class
                var key = instance.label;
                key = key.replace(/\s/g,'');
                if(WcmAssetsFolder.customIcons[key] && WcmAssetsFolder.customIcons[key].moduleIcons){
                    var openClass = WcmAssetsFolder.customIcons[key].moduleIcons.open;
                    var closedClass = WcmAssetsFolder.customIcons[key].moduleIcons.closed;
                    var $el = $('#' + instance.rootFolderEl.id).parent().find('>a');

                    $el.removeClass(closedClass);
                    $el.addClass(openClass);

                }
            }
            else {
                instance.rootFolderEl.style.display = 'none';
                instance.state = WcmAssetsFolder.ROOT_CLOSED;
                WcmAssetsFolder.storage.eliminate( Self.getStoredPathKey(instance) );

                //add custom icon class
                var key = instance.label;
                key = key.replace(/\s/g,'');
                if(WcmAssetsFolder.customIcons[key] && WcmAssetsFolder.customIcons[key].moduleIcons){
                    var openClass = WcmAssetsFolder.customIcons[key].moduleIcons.open;
                    var closedClass = WcmAssetsFolder.customIcons[key].moduleIcons.closed;
                    var $el = $('#' + instance.rootFolderEl.id).parent().find('>a');

                    $el.removeClass(openClass);
                    $el.addClass(closedClass);

                }
            }
        }
        else {

            // toggle
            if(instance.state == WcmAssetsFolder.ROOT_OPEN) {
                this.toggleFolderState(instance,  WcmAssetsFolder.ROOT_CLOSED, path);
            }
            else {
                this.toggleFolderState(instance,  WcmAssetsFolder.ROOT_OPEN, path);
            }
        }
    },

    /**
     * method fired when tree node is expanded for first time
     */
    onLoadNodeDataOnClick: function(node, fnLoadComplete)  {

        var path = encodeURI(node.treeNodeTO.path);
        var site = node.treeNodeTO.site;
        var pathToOpenTo = node.openToPath;

        CStudioAuthoring.Service.lookupSiteContent(site, path, 1, "default", {
            success: function(treeData, args) {
                CStudioAuthoring.ContextualNav.WcmAssetsFolder.drawSubtree(treeData.item.children, node, args.pathToOpenTo, args.instance);

                args.fnLoadComplete();

                //add hove effect to nodes
                CStudioAuthoring.ContextualNav.WcmAssetsFolder.nodeHoverEffects(this);
            },

            failure: function(err, args) {
                args.fnLoadComplete();
            },

            argument: {
                "node": node,
                "instance": node.instance,
                "fnLoadComplete": fnLoadComplete,
                pathToOpenTo: pathToOpenTo
            }
        });
    },

    /**
     * method fired when tree item is clicked
     */
    onTreeNodeClick: function(node)	{
        if (node.data.previewable == true) {
            if (!node.data.isLevelDescriptor && !node.data.isContainer) {
                CStudioAuthoring.Operations.openPreview(node.data, "", false, false);
            }
        }

        return false;
    },

    expandTree: function(node, fnLoadComplete) {
        if(node) {
            var iniPath;
            try {
                iniPath = node.treeNodeTO.path;
            } catch (er) {
                iniPath = node.path;
            }
            var fileName = iniPath.split('/')[node.treeNodeTO.path.split('/').length - 1],
                roothpath = iniPath.replace("/" + fileName, ""),
                plainpath = iniPath,
                el = node.getEl(),
                num = el.getAttribute('num');
            plainpath = roothpath == '/site' ? "root-folder" : plainpath;
            if (!num) {
                while ((el = el.parentElement) && !el.hasAttribute("num"));
            }
            if(el) {
                CStudioAuthoring.ContextualNav.WcmAssetsFolder.save(node.instance, plainpath, null, el.getAttribute('num') ? el.getAttribute('num') : "root-folder", "expand");
            }

            var WcmAssets = CStudioAuthoring.ContextualNav.WcmAssetsFolder;
            var id = node.labelElId,
                key = node.instance.label;
            key = key.replace(/\s/g,'');

            if(WcmAssets.customIcons[key] && WcmAssets.customIcons[key].childIcons && node.data.style.match(/\bfolder\b/)){
                var openClass = WcmAssets.customIcons[key].childIcons.open;
                var closedClass = WcmAssets.customIcons[key].childIcons.closed;

                $('#' + id).removeClass(closedClass);
                $('#' + id).addClass(openClass);
            }
        }
    },

    collapseTree: function(node, fnLoadComplete) {
        var iniPath;
        try{
            iniPath = node.treeNodeTO.path;
        }catch(er){
            iniPath = node.path;
        }
        var path = iniPath.replace(/\//g, "").toLowerCase();
        fileName = iniPath.split('/')[node.treeNodeTO.path.split('/').length - 1],
            plainpath = iniPath.replace("/" + fileName, ""),
            el = node.getEl(),
            num = el.getAttribute('num');
        plainpath = (plainpath == '/site') || path == num ? "root-folder" : plainpath;
        if(!num){
            while ((el = el.parentElement) && !el.hasAttribute("num"));
        }
        //Self.remove(node.instance, plainpath);
        CStudioAuthoring.ContextualNav.WcmAssetsFolder.save(node.instance, plainpath, fileName, el.getAttribute('num') ? el.getAttribute('num') : "root-folder", "collapse");

        var WcmAssets = CStudioAuthoring.ContextualNav.WcmAssetsFolder;
        var id = node.labelElId,
            key = node.instance.label;
        key = key.replace(/\s/g,'');

        if(WcmAssets.customIcons[key] && WcmAssets.customIcons[key].childIcons && node.data.style.match(/\bfolder\b/)){
            var openClass = WcmAssets.customIcons[key].childIcons.open;
            var closedClass = WcmAssets.customIcons[key].childIcons.closed;

            $('#' + id).removeClass(openClass);
            $('#' + id).addClass(closedClass);
        }
    },

    save: function(instance, path, fileName, num, mode) {
        var flag = true;
        if(!instance.openArray[num]){
            instance.openArray[num] = [];
        }
        for(var i=0; i < instance.openArray[num].length; i++){
            if(instance.openArray[num][i] && path.indexOf(instance.openArray[num][i]) > -1){
                instance.openArray[num].splice(i, 1);
                i--;
                continue;
            }else{
                var aux = path;
                if(fileName){aux = aux + '/' + fileName;}
                if(instance.openArray[num][i] && instance.openArray[num][i].indexOf(aux) > -1){
                    instance.openArray[num].splice(i, 1);
                    i--;
                    continue;
                }
                if(instance.openArray[num].length > 0 && instance.openArray[num][i]){
                    if(instance.openArray[num][i] && instance.openArray[num][i].indexOf(path) > -1)
                        flag = false;
                }
            }
        }
        if(flag) {
            if(path == "root-folder"){
                instance.openArray[num] = [];
            }
            instance.openArray[num].push(path);
        }
        for(var i=0; i < instance.openArray[num].length; i++){

            if (instance.openArray[num].length > 1 &&
                (instance.openArray[num][i] && instance.openArray[num][i].indexOf("root-folder") > -1)) {
                instance.openArray[num].splice(i, 1);
            }

            if (instance.openArray[num].length < 2 &&
                (instance.openArray[num][i] && instance.openArray[num][i].indexOf("root-folder") > -1) &&
                num != "root-folder" && mode != "expand") {
                delete instance.openArray[num];
                break;
            }
        }
        //storage.write(Self.getStoredPathKey(instance, path), path, 360);
        CStudioAuthoring.ContextualNav.WcmAssetsFolder.storage.write(Self.getStoredPathKey(instance), JSON.stringify(instance.openArray), 360);
    },

    openLatest: function(instance){

        var latestStored = instance.openArray;
        var index = instance.indexPath;

        if(Object.keys(latestStored).length >= 1){
            var pathFlag = true;
            var treeEl = instance.rootFolderEl,
                site = treeEl.rootFolderSite,
                rootPath = treeEl.rootFolderPath,
                tree = instance.tree = new YAHOO.widget.TreeView(treeEl),
                paths = {},
                counter = {},
                recursiveCalls = {},
                tmp = {},
                k = {},
                pathTrace = {},
                rooth = {},
                updatePathTrace = function(j, key){
                    var appendedPath = (paths[key] && paths[key][j]) ? paths[key][j][counter[key][j]++] : "";
                    appendedPath = (appendedPath !== "") ? ("/" + appendedPath) : "";
                    return (pathTrace[key][j] = (pathTrace[key][j] + appendedPath));
                },
                nextPathTrace = function(j, key){
                    var cont = j == 0 ? 0 : counter[key][j] + 1;
                    return (pathTrace[key][j] + "/" + paths[key][j][counter[key][j]]); }
            YSelector = YAHOO.util.Selector.query;
            var label = instance.rootFolderEl.previousElementSibling;
            YDom.addClass(label, "loading");
            var doCall = function(n, j, key){
                CStudioAuthoring.ContextualNav.WcmAssetsFolder.onLoadNodeDataOnClick(n, function(){
                    n.loadComplete();

                    var WcmAssets = CStudioAuthoring.ContextualNav.WcmAssetsFolder;

                    if(n.expanded && n.data.style.match(/\bfolder\b/)){
                        var iconsKey = n.instance.label;
                        iconsKey = iconsKey.replace(/\s/g,'');

                        if(WcmAssets.customIcons[iconsKey] && WcmAssets.customIcons[iconsKey].childIcons){
                            var openClass = WcmAssets.customIcons[iconsKey].childIcons.open;
                            var closedClass = WcmAssets.customIcons[iconsKey].childIcons.closed;

                            $('#' + n.labelElId).removeClass(closedClass);
                            $('#' + n.labelElId).addClass(openClass);
                        }
                    }

                    if (counter[key][j] < recursiveCalls[key][j]) {
                        updatePathTrace(j, key);
                        var node = tree.getNodesByProperty("path", pathTrace[key][j]);
                        if (node != null) {
                            Self.getNumKey(node, key, function(currentNode) {
                                var loadEl = YSelector(".ygtvtp", currentNode.getEl(), true);
                                loadEl == null && (loadEl = YSelector(".ygtvlp", currentNode.getEl(), true));
                                YDom.addClass(loadEl, "ygtvloading");
                                doCall(currentNode, j, key);
                            });

                        } else {
                            YDom.removeClass(label, "loading");
                            YDom.removeClass(YSelector(".ygtvloading", treeEl), "ygtvloading");
                            // Add hover effect to nodes
                            Self.nodeHoverEffects(this);
                            Self.firePathLoaded(instance);
                        }
                    } else {
                        k[key]++;
                        if (latestStored[key].length > k[key]) {
                            pathTrace[key][k[key]] = rooth[key];
                            counter[key][k[key]] = 0;
                            (function () {
                                tmp[key][k[key]] = latestStored[key][k[key]].replace(rooth[key], "");
                                paths[key][k[key]] = tmp[key][k[key]].length ? (tmp[key][k[key]].charAt(0) == "/" ? tmp[key][k[key]].substr(1) : tmp[key][k[key]]).split("/") : null;
                                recursiveCalls[key][k[key]] = tmp[key][k[key]].length ? paths[key][k[key]].length : 0;
                            })();
                            var node, loadEl;
                            for (var i = 0; recursiveCalls[key][k[key]] > i; i++) {
                                if (tree.getNodeByProperty("path", nextPathTrace(k[key], key)) != null) {
                                    updatePathTrace(k[key], key);
                                }
                            }
                            node = tree.getNodesByProperty("path", pathTrace[key][k[key]]);
                            if (node == null) {
                                node = tree.getNodesByProperty("path", updatePathTrace(k[key], key));
                            }

                            if (node != null) {
                                Self.getNumKey(node, key, function(currentNode) {
                                    var loadEl = YSelector(".ygtvtp", currentNode.getEl(), true);
                                    loadEl == null && (loadEl = YSelector(".ygtvlp", currentNode.getEl(), true));
                                    YDom.addClass(loadEl, "ygtvloading");
                                    doCall(currentNode, k[key], key);
                                });
                            }
                        } else {
                            //YDom.removeClass(label, "loading");
                            //Self.firePathLoaded(instance);
                        }

                        YDom.removeClass(label, "loading");
                        YDom.removeClass(YSelector(".ygtvloading", treeEl), "ygtvloading");
                        // Add hover effect to nodes
                        Self.nodeHoverEffects(this);
                        Self.firePathLoaded(instance);
                    }
                });
            }
            tree.setDynamicLoad(this.onLoadNodeDataOnClick);
            if (Self.pathOnlyHasCannedSearch(rootPath, instance)) {
                var dummy = new Object();
                dummy.path = rootPath;
                var items = new Array();
                items.push(dummy);
                CStudioAuthoring.ContextualNav.WcmAssetsFolder.drawTree(items, tree, null, instance, pathFlag);
                YDom.removeClass(label, "loading");
                Self.firePathLoaded(instance);
            } else {
                var ind=0;
                var servPath;
                if (Object.prototype.toString.call(rootPath) === '[object Array]') {
                    servPath = rootPath[ind];
                } else {
                    servPath = rootPath;
                }

                (function (ind) {
                    function treePrint(servPath){
                        CStudioAuthoring.Service.lookupSiteContent(site, servPath, 1, "default", {
                            success: function (treeData) {
                                var key = treeData.item.path.replace(/\//g, "").toLowerCase();
                                paths[key] = [],
                                    counter[key] = [],
                                    recursiveCalls[key] = [],
                                    tmp[key] = {}
                                k[key] = 0,
                                    pathTrace[key] = [],
                                    rooth[key] = treeData.item.path;

                                //if(servPath == "/site/website")
                                window.treeData = treeData;

                                var items = treeData.item.children;
                                if (instance.showRootItem) {
                                    items = new Array(treeData.item);

                                    //add custom icon class
                                    var WcmAssets = CStudioAuthoring.ContextualNav.WcmAssetsFolder;
                                    var key = instance.label;
                                    key = key.replace(/\s/g,'');

                                    if(WcmAssets.customIcons[key] && WcmAssets.customIcons[key].moduleIcons){
                                        var openClass = WcmAssets.customIcons[key].moduleIcons.open;
                                        var closedClass = WcmAssets.customIcons[key].moduleIcons.closed;
                                        var $el = $('#' + instance.rootFolderEl.id).parent().find('>a');

                                        $el.removeClass(closedClass);
                                        $el.addClass(openClass);

                                    }
                                }
                                instance.state = Self.ROOT_OPEN;
                                CStudioAuthoring.ContextualNav.WcmAssetsFolder.drawTree(items, tree, null, instance, pathFlag);
                                pathFlag = false;

                                if (latestStored[key] && latestStored[key][[key]] != Self.ROOT_OPENED) {
                                    pathTrace[key][k[key]] = treeData.item.path;
                                    counter[key][k[key]] = 0;
                                    (function () {
                                        tmp[key][k[key]] = latestStored[key][k[key]].replace(treeData.item.path, "");
                                        paths[key][k[key]] = tmp[key][k[key]].length ? (tmp[key][k[key]].charAt(0) == "/" ? tmp[key][k[key]].substr(1) : tmp[key][k[key]]).split("/") : null;
                                        recursiveCalls[key][k[key]] = tmp[key][k[key]].length ? paths[key][k[key]].length : 0;
                                    })();
                                    var nodes, node, loadEl;
                                    nodes = tree.getNodesByProperty("path", treeData.item.path);
                                    if (nodes != null) {
                                        Self.getNumKey(nodes, key, function(currentNode) {
                                            node = currentNode;
                                        });
                                    }
                                    if (node == null) {
                                        node = tree.getNodeByProperty("path", updatePathTrace(k[key], key));
                                        if (node != null) {
                                            loadEl = YAHOO.util.Selector.query(".ygtvtp", node.getEl(), true);
                                        }
                                    } else {
                                        loadEl = YAHOO.util.Selector.query(".ygtvlp", node.getEl(), true);
                                    }
                                    if (node == null) {
                                        YDom.removeClass(label, "loading");
                                        Self.firePathLoaded(instance);
                                    } else {
                                        YDom.addClass(loadEl, "ygtvloading");
                                        //YDom.setAttribute ( node , "index" ,instance.pathNumber  );
                                        doCall(node, k[key], key);
                                    }
                                } else {
                                    YDom.removeClass(label, "loading");
                                    Self.firePathLoaded(instance);
                                }
                                index = instance.indexPath++;

                                ind++;
                                if (Object.prototype.toString.call(rootPath) === '[object Array]') {
                                    servPath = rootPath[ind];
                                } else {
                                    servPath = rootPath;
                                }
                                if(servPath && Object.prototype.toString.call(rootPath) === '[object Array]'){
                                    treePrint(servPath);
                                }
                            },
                            failure: function () {
                            }
                        })

                    }
                    treePrint(servPath);
                })(ind);

            }
        } else {
            Self.firePathLoaded(instance);
        }
    },

    /**
     * create a transfer object for a node
     */
    createTreeNodeTransferObject: function(treeItem) {

        var retTransferObj = new Object();
        retTransferObj.site = CStudioAuthoringContext.site;
        retTransferObj.internalName = treeItem.internalName;
        retTransferObj.sandboxId = treeItem.sandboxId;
        retTransferObj.link="/NOTSET";
        retTransferObj.path = treeItem.path;
        retTransferObj.uri = treeItem.uri;
        retTransferObj.browserUri = treeItem.browserUri;
        retTransferObj.nodeRef = treeItem.nodeRef;
        retTransferObj.formId = treeItem.form;
        retTransferObj.formPagePath = treeItem.formPagePath;
        retTransferObj.isContainer = treeItem.container;
        retTransferObj.isComponent = true;
        retTransferObj.isLevelDescriptor = treeItem.levelDescriptor;
        retTransferObj.editedDate = "";
        retTransferObj.modifier = "";
        retTransferObj.pathSegment = treeItem.name;
        retTransferObj.sandboxLockOwner = treeItem.sandboxLockOwner;
        retTransferObj.sandboxLockStore = treeItem.sandboxLockStore;
        retTransferObj.scheduledDate = treeItem.scheduledDate;
        retTransferObj.previewable = treeItem.previewable;

        treeItem.component = true;

        retTransferObj.status = CStudioAuthoring.Utils.getContentItemStatus(treeItem);
        retTransferObj.style = CStudioAuthoring.Utils.getContentItemClassName(treeItem);//, treeItem.container

        if(retTransferObj.internalName == "") {
            retTransferObj.internalName = treeItem.name;
        }

        if(retTransferObj.internalName == "crafter-level-descriptor.level.xml") {
            retTransferObj.internalName = "Section Defaults";
        }

        if(treeItem.isNew) {
            retTransferObj.label = retTransferObj.internalName + " *";
        }
        else {
            retTransferObj.label = retTransferObj.internalName;
        }

        if(treeItem.container == true) {
            retTransferObj.fileName = treeItem.name;
        }
        else {
            retTransferObj.fileName = "";
        }

        if (treeItem.userFirstName != undefined && treeItem.userLastName != undefined) {
            retTransferObj.modifier = treeItem.userFirstName + " " + treeItem.userLastName;
        }

        if(treeItem.eventDate != "" && treeItem.eventDate != undefined) {
            var formattedEditDate = CStudioAuthoring.Utils.formatDateFromString(treeItem.eventDate);
            retTransferObj.editedDate = formattedEditDate;
        }

        return retTransferObj;
    },

    onTriggerContextMenu: function(tree, p_aArgs, contextMenuId)	{

        target = p_aArgs.contextEventTarget;
        var aMenuItems;
        var menuWidth = "80px";
        var menuItems = {
            "assetsFolderMenu" : [
                { text: CMgs.format(siteDropdownLangBundle, "upload"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.uploadAsset, obj:tree } },
                { text: CMgs.format(siteDropdownLangBundle, "createFolder"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.createContainer, obj:tree } },
                { text: CMgs.format(siteDropdownLangBundle, "delete"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.deleteContainer, obj:tree } }
            ],
            "assetsFolderMenuNoDelete" : [
                { text: CMgs.format(siteDropdownLangBundle, "upload"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.uploadAsset, obj:tree } },
                { text: CMgs.format(siteDropdownLangBundle, "createFolder"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.createContainer, obj:tree } }
            ],
            "assetsFolderMenuNoCreateFolder" : [
                { text: CMgs.format(siteDropdownLangBundle, "upload"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.uploadAsset, obj:tree } },
                { text: CMgs.format(siteDropdownLangBundle, "delete"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.deleteContainer, obj:tree } }
            ],
            "assetsFolderMenuNoDeleteNoCreateFolder" : [
                { text: CMgs.format(siteDropdownLangBundle, "upload"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.uploadAsset, obj:tree } }
            ],
            "assetsMenu" : [
                { text: CMgs.format(siteDropdownLangBundle, "upload"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.overwriteAsset, obj:tree } },
                { text: CMgs.format(siteDropdownLangBundle, "delete"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.deleteContent, obj:tree } }
            ],
            "assetsMenuNoDelete" : [
                { text: CMgs.format(siteDropdownLangBundle, "upload"), onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.overwriteAsset, obj:tree } }
            ],
            "assetsFolderMenuRead" : [
                { text: CMgs.format(siteDropdownLangBundle, "noActionsAvailable"), disabled: true, onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.uploadAsset, obj:tree } }
            ],

            "assetsFolderTemplate" : [
                { text: CMgs.format(siteDropdownLangBundle, "createTemplate"), disabled: false, onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.createNewTemplate, obj:tree } }
            ],


            "assetsFolderScript" : [
                { text: CMgs.format(siteDropdownLangBundle, "createController"), disabled: false, onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.createNewScript, obj:tree } }
            ],

            "assetsMenuRead" : [
                { text: CMgs.format(siteDropdownLangBundle, "upload"), disabled: true, onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.overwriteAsset, obj:tree } },
                { text: CMgs.format(siteDropdownLangBundle, "delete"), disabled: true, onclick: { fn: CStudioAuthoring.ContextualNav.WcmAssetsFolder.deleteContent, obj:tree } }
            ]
        };

        var targetNode = tree.getNodeByElement(target);

        if ( targetNode != null && YDom.isAncestor(tree.id, p_aArgs.contextEventTarget) ) {
            // Get the TextNode instance that that triggered the display of the ContextMenu instance.
            oCurrentTextNode = targetNode;

            var CSA = CStudioAuthoring;
            var formPath = oCurrentTextNode.data.formPagePath;
            var isContainer = oCurrentTextNode.data.isContainer;
            var isComponent = oCurrentTextNode.data.isComponent;
            var isLevelDescriptor = oCurrentTextNode.data.isLevelDescriptor;
            var menuId = YDom.get(contextMenuId);
            var isAssetsFolder = (oCurrentTextNode.instance.type == "wcm-assets-folder")? true : false;
            p_aArgs.clearContent();

            //Get user permissions to get read write operations
            var checkPermissionsCb = {
                success: function(results) {
                    var perms = results.permissions,
                        isWrite = CSA.Service.isWrite(perms),
                        isDeleteAllowed = CSA.Service.isDeleteAllowed(perms),
                        isCreateFolder = CSA.Service.isCreateFolder(perms);

                    if (isWrite == true) {
                        if (this.isContainer) {
                            this.menuWidth = "130px";
                            if (isDeleteAllowed) {
                                if (isCreateFolder) {
                                    this.aMenuItems = this.menuItems["assetsFolderMenu"].slice();
                                } else {
                                    this.aMenuItems = this.menuItems["assetsFolderMenuNoCreateFolder"].slice();
                                }
                            } else {
                                if (isCreateFolder) {
                                    this.aMenuItems = this.menuItems["assetsFolderMenuNoDelete"].slice();
                                } else {
                                    this.aMenuItems = this.menuItems["assetsFolderMenuNoDeleteNoCreateFolder"].slice();
                                }
                            }
                        } else {
                            this.menuWidth = "130px";
                            if (isDeleteAllowed) {
                                this.aMenuItems = this.menuItems["assetsMenu"].slice();
                            } else {
                                this.aMenuItems = this.menuItems["assetsMenuNoDelete"].slice();
                            }
                        }

                        if(oCurrentTextNode.data.uri.indexOf("/templates") != -1) {
                            this.aMenuItems.push(this.menuItems["assetsFolderTemplate"]);
                        }

                        if(oCurrentTextNode.data.uri.indexOf("/scripts") != -1) {
                            this.aMenuItems.push(this.menuItems["assetsFolderScript"]);
                        }

                        if(oCurrentTextNode.data.uri.indexOf(".ftl") != -1
                            ||  oCurrentTextNode.data.uri.indexOf(".js") != -1
                            ||  oCurrentTextNode.data.uri.indexOf(".css") != -1
                            ||  oCurrentTextNode.data.uri.indexOf(".groovy") != -1
                            ||  oCurrentTextNode.data.uri.indexOf(".html") != -1
                            ||  oCurrentTextNode.data.uri.indexOf(".hbs") != -1
                            ||  oCurrentTextNode.data.uri.indexOf(".xml") != -1) {
                            // item is a template

                            this.aMenuItems.push(
                                { text: CMgs.format(siteDropdownLangBundle, "edit"), disabled: false, onclick: { fn: CSA.ContextualNav.WcmAssetsFolder.editTemplate } });
                        }

                    } else {
                        if (this.isContainer) {
                            this.menuWidth = "130px";
                            this.aMenuItems = this.menuItems["assetsFolderMenuRead"].slice();
                        } else {
                            this.menuWidth = "100px";
                            this.aMenuItems = this.menuItems["assetsMenuRead"].slice();
                        }
                    }

                    if (CSA.Utils.hasPerm(CSA.Constants.PERMISSION_WRITE, perms)){
                        this.aMenuItems.push({
                            text: CMgs.format(siteDropdownLangBundle, "bulkUploadAssets"),
                            onclick: { fn: CSA.ContextualNav.WcmAssetsFolder.bulkUpload }
                        });
                    }

                    var isRelevant = (!(oCurrentTextNode.data.status.toLowerCase().indexOf("live") !== -1));
                    var isAssetsFolder = !oCurrentTextNode.isLeaf;

                    if(isRelevant && !isAssetsFolder) {

                        if(CStudioAuthoring.Service.isPublishAllowed(perms)) {
                            this.aMenuItems.push({
                                text: CMgs.format(siteDropdownLangBundle, "wcmContentApprove"),
                                onclick: { fn: function(){
                                    var callback = {
                                        success: function(contentTO) {
                                            var selectedContent = [];
                                            selectedContent.push(contentTO.item);

                                            CStudioAuthoring.Operations.approveCommon(
                                                CStudioAuthoringContext.site,
                                                selectedContent,
                                                false
                                            );
                                        },
                                        failure: function() {

                                        }
                                    }

                                    CStudioAuthoring.Service.lookupContentItem(CStudioAuthoringContext.site, oCurrentTextNode.data.uri, callback, false, false);

                                } }
                            });
                        }else {
                            this.aMenuItems.push({
                                text: CMgs.format(siteDropdownLangBundle, "wcmContentSubmit"),
                                onclick: { fn: function(){
                                    var callback = {
                                        success: function(contentTO) {
                                            var selectedContent = [];
                                            selectedContent.push(contentTO.item);

                                            CStudioAuthoring.Operations.submitContent(
                                                CStudioAuthoringContext.site,
                                                selectedContent
                                            );
                                        },
                                        failure: function() {

                                        }
                                    }

                                    CStudioAuthoring.Service.lookupContentItem(CStudioAuthoringContext.site, oCurrentTextNode.data.uri, callback, false, false);
                                } }
                            });
                        }

                    }

                    this.aMenuItems.push({
                        text: CMgs.format(siteDropdownLangBundle, "wcmContentDependencies"),
                        onclick: { fn: function(){
                            var callback = {
                                success: function(contentTO) {
                                    var selectedContent = [];
                                    selectedContent.push(contentTO.item);

                                    CStudioAuthoring.Operations.viewDependencies(
                                        CStudioAuthoringContext.site,
                                        selectedContent,
                                        false
                                    );
                                },
                                failure: function() {

                                }
                            };

                            CStudioAuthoring.Service.lookupContentItem(CStudioAuthoringContext.site, oCurrentTextNode.data.uri, callback, false, false);

                        } }
                    });

                    var checkClipboardCb = {
                        success: function(collection) {

                            if(collection.count > 0) {
                                if (isWrite == true) {
                                    this.menuItems.push(
                                        { text: CMgs.format(siteDropdownLangBundle, "paste"), onclick: { fn: CSA.ContextualNav.WcmAssetsFolder.pasteContent } });
                                } else {
                                    this.menuItems.push(
                                        { text: CMgs.format(siteDropdownLangBundle, "paste"), disabled: true, onclick: { fn: CSA.ContextualNav.WcmAssetsFolder.pasteContent } });
                                }
                            }

                            this.args.addItems(this.menuItems);
                            this.menuEl.style.display = "block";
                            this.menuEl.style.width = this.menuWidth;
                            this.args.render();
                            this.args.show();
                        },

                        failure: function() {
                        },

                        args: this.p_aArgs,
                        menuItems: this.aMenuItems,
                        menuEl: this.menuId,
                        menuWidth: this.menuWidth
                    };

                    CSA.Clipboard.getClipboardContent(checkClipboardCb);

                },
                failure: function() { }
            };
            checkPermissionsCb.menuItems = menuItems;
            checkPermissionsCb.aMenuItems = aMenuItems;
            checkPermissionsCb.menuWidth = menuWidth;
            checkPermissionsCb.menuId = menuId;
            checkPermissionsCb.p_aArgs = p_aArgs;
            checkPermissionsCb.oCurrentTextNode = oCurrentTextNode;
            checkPermissionsCb.isContainer = isContainer;
            CSA.Service.getUserPermissions(CStudioAuthoringContext.site, oCurrentTextNode.data.uri, checkPermissionsCb);

        }

    },

    /**
     * Creates new container, Opens a dialog box to enter folder name
     */
    createContainer: function() {
        var createCb = {
            success: function() {
                Self.refreshNodes(this.tree,false, false, null, null, true);

            },

            failure: function() {
            },

            callingWindow: window,
            tree: oCurrentTextNode
        };

        CStudioAuthoring.Operations.createFolder(
            CStudioAuthoringContext.site,
            oCurrentTextNode.data.uri,
            window,
            createCb);
    },

    /**
     * Edits the label of the TextNode that was the target of the
     * "contextmenu" event that triggered the display of the
     * ContextMenu instance.
     */
    editContent: function(contentTO, editorId, name, value, draft) {
        var path = (oCurrentTextNode.data.uri);

        var editCb = {
            success: function() {
                if(CStudioAuthoringContext.isPreview){
                    try{
                        CStudioAuthoring.Operations.refreshPreview();
                    }catch(err) {
                        if(!draft) {
                            this.callingWindow.location.reload(true);
                        }
                    }
                }
                else {
                    if(!draft) {
                        this.callingWindow.location.reload(true);
                    }
                }
                eventNS.data = oCurrentTextNode;
                eventNS.typeAction = "";
                document.dispatchEvent(eventNS);
            },

            failure: function() {
            },

            callingWindow: window
        };


        CStudioAuthoring.Operations.editContent(
            oCurrentTextNode.data.formId, CStudioAuthoringContext.site,
            path, oCurrentTextNode.data.nodeRef, path, false, editCb);
    },

    editTemplate: function() {
        var path = (oCurrentTextNode.data.uri);

        this.element.firstChild.style.pointerEvents = "none";
        if (typeof CStudioAuthoring.editDisabled === 'undefined') {
            CStudioAuthoring.editDisabled = []
        }
        CStudioAuthoring.editDisabled.push(this.element.firstChild);

        var editCb = {
            success: function() {
                if(CStudioAuthoringContext.isPreview){
                     try{
                         CStudioAuthoring.Operations.refreshPreview();
                     }catch(err) {
                         this.callingWindow.location.reload(true);
                     }
                }
                else {
                    this.callingWindow.location.reload(true);
                }
            },

            failure: function() {
            },

            callingWindow: window
        };

        //CStudioAuthoring.Operations.openTemplateEditor(path, "default", editCb);
        CStudioAuthoring.Operations.editContent(
            oCurrentTextNode.data.formId,
            CStudioAuthoringContext.site,path,
            oCurrentTextNode.data.nodeRef, path, false, editCb);
    },

    createNewTemplate: function() {
        CStudioAuthoring.Operations.createNewTemplate(oCurrentTextNode.data.uri, {
            success: function(templatePath) {
                Self.refreshNodes(this.tree,false, false, null, null, true);
            }, 
            failure: function() {
                //this.callingWindow.location.reload(true);
            },

            callingWindow: window,
            tree: oCurrentTextNode
        });
    },

    createNewScript: function() {
        CStudioAuthoring.Operations.createNewScript( oCurrentTextNode.data.uri, { 
            success: function(templatePath) {
                Self.refreshNodes(this.tree,false, false, null, null, true);
            }, 
            failure: function() {

            },
            tree: oCurrentTextNode
        });


    },

    /**
     *	upload an asset to the target folder if it's a new asset
     */
    uploadAsset: function() {
        var uploadCb = {
            success: function() {
                CStudioAuthoring.Operations.refreshPreview();
                Self.refreshNodes(this.tree,false, false, null, null, true);
            },

            failure: function() {
            },

            callingWindow: window,
            tree: oCurrentTextNode
        };

        CStudioAuthoring.Operations.uploadAsset(
            CStudioAuthoringContext.site,
            oCurrentTextNode.data.uri,
            "upload",
            uploadCb);
    },

    bulkUpload: function () {

        var CSA = CStudioAuthoring,
            CSAC = CStudioAuthoringContext,

            fmt = CSA.StringUtils.format;

        CSA.Env.Loader.use('component-dropbox', 'dialog-bulkupload', function () {

            var view = new CSA.Dialogs.BulkUpload(),
                Dropbox = CSA.Component.Dropbox,
                treeNode = oCurrentTextNode;

            document.body.appendChild(view.element);
            var serviceUrl = CStudioAuthoring.Service.createServiceUri(
                CStudioAuthoring.Service.createWriteServiceUrl(
                    treeNode.data.uri, 
                    treeNode.data.filename, 
                    null,
                    treeNode.data.contentType, 
                    CSAC.site, 
                    true, 
                    false, 
                    false, 
                    true));

            var dropbox = new Dropbox({
                element: view.element,
                display: fmt(
                    '#{0} .file-display-container .pad',
                    view.id),
                progress: '.progress .bar',
                target: serviceUrl,
                uploadPostKey: 'file',
                formData: {
                    site: CSAC.site,
                    path: oCurrentTextNode.data.uri
                },
                template: fmt('template_{0}', view.id),
                newOnTop: true
            });

            dropbox.showUploadProgress = function (elem, progress) {
                elem.style.width = progress + '%';
            }

            dropbox.on(Dropbox.UPLOAD_SUCCESS_EVENT, function (data) {
                if (treeNode.expanded){
                    CSA.ContextualNav.WcmAssetsFolder.refreshNodes(treeNode,false, false, null, null, true);
                }
            });

        });
    },

    /**
     *	upload an asset to the target folder if it's a new asset
     */
    overwriteAsset: function() {
        var uploadCb = {
            success: function() {
                Self.refreshNodes(this.tree,false, false, null, null, true);

            },

            failure: function() {
            },

            callingWindow: window,
            tree: oCurrentTextNode
        };

        CStudioAuthoring.Operations.uploadAsset(
            CStudioAuthoringContext.site,
            oCurrentTextNode.data.uri,
            "overwrite",
            uploadCb);
    },

    /**
     * Deletes the TextNode that was the target of the "contextmenu"
     * event that triggered the display of the ContextMenu instance.
     */
    deleteContent: function(p_sType, p_aArgs, tree) {
        CStudioAuthoring.Operations.deleteContent([oCurrentTextNode.data]);
    },

    /**
     *	Deletes a folder and contents in the target folder
     */
    deleteContainer: function(p_sType, p_aArgs, tree) {
        CStudioAuthoring.ContextualNav.WcmAssetsFolder.deleteContent(p_sType, p_aArgs, tree);
    },

    nodeHoverEffects: function(e) {
        var YDom = YAHOO.util.Dom,
            highlightWrpClass = "highlight-wrapper",
            highlightColor = "#e2e2e2",
            overSetClass = "over-effect-set",
            spanNodes = YAHOO.util.Selector.query("span.yui-resize-label:not(." + overSetClass + ")", "acn-dropdown-menu-wrapper"),
            moverFn = function(evt) {

                var el = this,
                    wrapEl = function(table) {
                        var wrp = document.createElement('div');
                        wrp.setAttribute('style', 'background-color:' + highlightColor);
                        wrp.setAttribute('class', highlightWrpClass);
                        YDom.insertBefore(wrp, table);
                        wrp.appendChild(table);
                        return wrp;
                    };
                if (YDom.hasClass(el, highlightWrpClass)) {
                    YDom.setStyle(el, 'background-color', highlightColor)
                } else if (YDom.hasClass(el, 'ygtvitem')) {
                    var firstChild = YDom.getFirstChild(el);
                    YDom.hasClass(firstChild, highlightWrpClass)
                        ? YDom.setStyle(firstChild, 'background-color', highlightColor)
                        : wrapEl(firstChild)
                } else {
                    var parent = el.parentNode;
                    YDom.hasClass(parent, highlightWrpClass)
                        ? YDom.setStyle(parent, 'background-color', highlightColor)
                        : wrapEl(el);
                }
                if(Self.lastSelectedTextNode != null) {
                    var currentlySelectedTextNode = el
                    if(currentlySelectedTextNode == Self.lastSelectedTextNode) return;
                    (YDom.hasClass(Self.lastSelectedTextNode, highlightWrpClass)
                        ? Self.lastSelectedTextNode
                        : (YDom.hasClass(Self.lastSelectedTextNode, 'ygtvitem')
                        ? YDom.getFirstChild(Self.lastSelectedTextNode)
                        : Self.lastSelectedTextNode.parentNode))
                        .style.backgroundColor = "";

                    Self.lastSelectedTextNode = null;
                }

                var nodeId = (""+el.id).replace("table","label");
                var node = Self.treeNodes[nodeId];

                if( node.isContainer == false){

                    // remove this preview
                    // var reportContainerEl = document.getElementById("cstudioPreviewAnalyticsOverlay");

                    // if(reportContainerEl) {
                    //     document.body.removeChild(reportContainerEl);
                    // }

                    // var reportContainerEl = document.createElement("div");
                    // reportContainerEl.id = "cstudioPreviewAnalyticsOverlay";
                    // YAHOO.util.Dom.addClass(reportContainerEl, "cstudio-analytics-overlay");

                    // reportContainerEl.style.position = "fixed";
                    // reportContainerEl.style.width = "800px";
                    // reportContainerEl.style.top = "100px";

                    // var x = (window.innerWidth / 2) - (reportContainerEl.offsetWidth / 2) - 400;
                    // reportContainerEl.style.left = x+"px";


                    // document.body.appendChild(reportContainerEl);
                    // reportContainerEl.innerHTML =
                    //     "<div style='line-height: 111px; text-align: center;'><img src='"+CStudioAuthoringContext.baseUri + "/static-assets/themes/cstudioTheme/images/wait.gif'/></div>";


                    // var url = CStudioAuthoringContext.authoringAppBaseUri + "/page/site/" + CStudioAuthoringContext.site + "/cstudio-itempreview-overlay?nodeRef="+node.nodeRef;
                    // reportContainerEl.innerHTML = "<iframe id='cstudioPreviewAnalyticsOverlayFrame' style='border: none; margin-left: 100px; width: 600px; height:400px; margin-top:25px; margin-bottom: 25px;' src='"+ url + "' />";
                    // var iframe = document.getElementById("cstudioPreviewAnalyticsOverlayFrame");
                    // var iframeBody = iframe.contentDocument.getElementsByTagName('body')[0]
                    // iframeBody.style = "background: none transparent !important;";
                }
            },
            moutFn = function(evt) {
                if(Self.lastSelectedTextNode != null) return;
                var el = this;
                (YDom.hasClass(el, highlightWrpClass)
                    ? el
                    : (YDom.hasClass(el, 'ygtvitem')
                    ? YDom.getFirstChild(el)
                    : el.parentNode))
                    .style.backgroundColor = "";

                var reportContainerEl = document.getElementById("cstudioPreviewAnalyticsOverlay");

                if(reportContainerEl) {
                    document.body.removeChild(reportContainerEl);
                }

            };
        for (var i = 0,
                 l = spanNodes.length,
                 span = spanNodes[0],
                 barItem;
             i < l;
             i++,span = spanNodes[i]
            ) {
            // span -> td -> tr -> tbody -> table
            barItem = span.parentNode.parentNode.parentNode.parentNode;
            if (barItem) {
                YEvent.addListener(barItem, "mouseover", moverFn);
                YEvent.addListener(barItem, "mouseout", moutFn);
                YDom.addClass(span, overSetClass);
            }
        }
    },
};

/**
 * instance object
 * CStudioAuthoring.ContextualNav.WcmAssetsFolder is static
 */
CStudioAuthoring.ContextualNav.WcmAssetsFolderInstance = function(config) {

    this._self = this;
    this._toggleState = CStudioAuthoring.ContextualNav.WcmAssetsFolder.ROOT_CLOSED;
    this.rootFolderEl = null;

    this.type = config.name;
    this.label = config.params["label"];
    this.path = config.params["path"];
    this.showRootItem = (config.params["showRootItem"]) ? config.params["showRootItem"] : false;
    this.onClickAction = (config.params["onClick"]) ? config.params["onClick"] : "";
    this.config = config;

};

CStudioAuthoring.Module.moduleLoaded("wcm-assets-folder", CStudioAuthoring.ContextualNav.WcmAssetsFolder);
