function MCTabs(){this.settings=[];
this.onChange=tinyMCEPopup.editor.windowManager.createInstance("tinymce.util.Dispatcher")
}MCTabs.prototype.init=function(a){this.settings=a
};
MCTabs.prototype.getParam=function(b,a){var c=null;
c=(typeof(this.settings[b])=="undefined")?a:this.settings[b];
if(c=="true"||c=="false"){return(c=="true")
}return c
};
MCTabs.prototype.showTab=function(a){a.className="current";
a.setAttribute("aria-selected",true);
a.setAttribute("aria-expanded",true);
a.tabIndex=0
};
MCTabs.prototype.hideTab=function(b){var a=this;
b.className="";
b.setAttribute("aria-selected",false);
b.setAttribute("aria-expanded",false);
b.tabIndex=-1
};
MCTabs.prototype.showPanel=function(a){a.className="current";
a.setAttribute("aria-hidden",false)
};
MCTabs.prototype.hidePanel=function(a){a.className="panel";
a.setAttribute("aria-hidden",true)
};
MCTabs.prototype.getPanelForTab=function(a){return tinyMCEPopup.dom.getAttrib(a,"aria-controls")
};
MCTabs.prototype.displayTab=function(e,b,g){var l,d,c,j,h,a,f,k=this;
c=document.getElementById(e);
if(b===undefined){b=k.getPanelForTab(c)
}l=document.getElementById(b);
d=l?l.parentNode:null;
j=c?c.parentNode:null;
h=k.getParam("selection_class","current");
if(c&&j){a=j.childNodes;
for(f=0;
f<a.length;
f++){if(a[f].nodeName=="LI"){k.hideTab(a[f])
}}k.showTab(c)
}if(l&&d){a=d.childNodes;
for(f=0;
f<a.length;
f++){if(a[f].nodeName=="DIV"){k.hidePanel(a[f])
}}if(!g){c.focus()
}k.showPanel(l)
}};
MCTabs.prototype.getAnchor=function(){var b,a=document.location.href;
if((b=a.lastIndexOf("#"))!=-1){return a.substring(b+1)
}return""
};
var mcTabs=new MCTabs();
tinyMCEPopup.onInit.add(function(){var a=tinyMCEPopup.getWin().tinymce,c=tinyMCEPopup.dom,b=a.each;
b(c.select("div.tabs"),function(g){var d;
c.setAttrib(g,"role","tablist");
var e=tinyMCEPopup.dom.select("li",g);
var f=function(h){mcTabs.displayTab(h,mcTabs.getPanelForTab(h));
mcTabs.onChange.dispatch(h)
};
b(e,function(h){c.setAttrib(h,"role","tab");
c.bind(h,"click",function(i){f(h.id)
})
});
c.bind(c.getRoot(),"keydown",function(h){if(h.keyCode===9&&h.ctrlKey&&!h.altKey){d.moveFocus(h.shiftKey?-1:1);
a.dom.Event.cancel(h)
}});
b(c.select("a",g),function(h){c.setAttrib(h,"tabindex","-1")
});
d=tinyMCEPopup.editor.windowManager.createInstance("tinymce.ui.KeyboardNavigation",{root:g,items:e,onAction:f,actOnFocus:true,enableLeftRight:true,enableUpDown:true},tinyMCEPopup.dom)
})
});