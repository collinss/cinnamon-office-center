const Cinnamon = imports.gi.Cinnamon;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GMenu = imports.gi.GMenu;
const Gtk = imports.gi.Gtk;
const St = imports.gi.St;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;

const Util = imports.misc.util;
const Lang = imports.lang;

const UUID = "officeCenter@scollins"
const MENU_ITEM_TEXT_LENGTH = 25;
const MENU_PADDING_WIDTH = 25;

let menu_item_icon_size;


function MenuItem(title, icon){
    this._init(title, icon);
}

MenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,
    
    _init: function(title, icon, params){
        try{
            
            PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);
            if ( icon != null ) this.addActor(icon);
            
            if ( title.length > MENU_ITEM_TEXT_LENGTH ) {
                let tooltip = new Tooltips.Tooltip(this.actor, title);
                title = title.slice(0,MENU_ITEM_TEXT_LENGTH-3) + "...";
            }
            let label = new St.Label({ text: title });
            this.addActor(label);
            this.actor._delegate = this;
            
        } catch (e){
            global.logError(e);
        }
    }
}


function LauncherMenuItem(menu, app) {
    this._init(menu, app);
}

LauncherMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, app) {
        try {
            
            this.menu = menu;
            this.app = app;
            
            let title = app.get_name();
            let icon = app.create_icon_texture(menu_item_icon_size);
            MenuItem.prototype._init.call(this, title, icon);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function() {
        try {
            
            this.menu.close();
            this.app.open_new_window(-1);
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function DocumentMenuItem(menu, file) {
    this._init(menu, file);
}

DocumentMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, file) {
        try {
            
            this.menu = menu;
            let fileInfo = file.query_info("*", Gio.FileQueryInfoFlags.NONE, null);
            this.uri = file.get_uri();
            
            let icon = fileInfo.get_icon();
            MenuItem.prototype._init.call(this, fileInfo.get_name(), St.TextureCache.get_default().load_gicon(null, icon, menu_item_icon_size));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function(event) {
        try {
            
            this.menu.close();
            Gio.app_info_launch_default_for_uri(this.uri, global.create_app_launch_context());
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function RecentMenuItem(menu, title, iName, file) {
    this._init(menu, title, iName, file);
}

RecentMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, title, iName, file) {
        try {
            
            this.menu = menu;
            this.file = file;
            
            let icon = new St.Icon({icon_name: iName, icon_size: menu_item_icon_size, icon_type: St.IconType.FULLCOLOR});
            MenuItem.prototype._init.call(this, title, icon);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function(event) {
        try {
            
            this.menu.close();
            Gio.app_info_launch_default_for_uri(this.file, global.create_app_launch_context());
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function ClearRecentMenuItem(menu, recentManager) {
    this._init(menu, recentManager);
}

ClearRecentMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, recentManager) {
        try {
            
            this.menu = menu;
            this.recentManager = recentManager;
            
            let icon = new St.Icon({icon_name: "edit-clear", icon_size: menu_item_icon_size, icon_type: St.IconType.FULLCOLOR});
            MenuItem.prototype._init.call(this, _("Clear"), icon);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function(event) {
        try {
            
            this.menu.close();
            this.recentManager.purge_items();
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function MyApplet(metadata, orientation, panel_height, instanceId) {
    this._init(metadata, orientation, panel_height, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.TextIconApplet.prototype,
    
    _init: function(metadata, orientation, panel_height, instanceId) {
        try {
            
            this.metadata = metadata;
            this.instanceId = instanceId;
            this.orientation = orientation;
            Applet.TextIconApplet.prototype._init.call(this, this.orientation, panel_height);
            
            //initiate settings
            this._bindSettings();
            
            //set up panel
            this._set_panel_icon();
            this._set_panel_text();
            this.set_applet_tooltip(_("Office"));
            
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.appSys = Cinnamon.AppSystem.get_default();
            let dirMonitor = Gio.file_new_for_path(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS))
                                .monitor_directory(Gio.FileMonitorFlags.SEND_MOVED, null);
            this.recentManager = new Gtk.RecentManager();
            
            //listen for changes
            this.appSys.connect("installed-changed", Lang.bind(this, this._build_launchers_section));
            dirMonitor.connect("changed", Lang.bind(this, this._build_documents_section));
            this.recentManager.connect("changed", Lang.bind(this, this._build_recent_documents_section));
            
            this.buildMenu();
            
        } catch (e) {
            global.logError(e);
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();
    },
    
    on_applet_removed_from_panel: function() {
        if ( this.keyId ) Main.keybindingManager.removeHotKey(this.keyId);
    },
    
    openMenu: function(){
        this.menu.open();
    },
    
    _bindSettings: function() {
        this.settings = new Settings.AppletSettings(this, this.metadata["uuid"], this.instanceId);
        this.settings.bindProperty(Settings.BindingDirection.IN, "panelIcon", "panelIcon", this._set_panel_icon);
        this.settings.bindProperty(Settings.BindingDirection.IN, "panelText", "panelText", this._set_panel_text);
        this.settings.bindProperty(Settings.BindingDirection.IN, "iconSize", "iconSize", this.buildMenu);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showDocuments", "showDocuments", this.buildMenu);
        this.settings.bindProperty(Settings.BindingDirection.IN, "altDir", "altDir", this._build_documents_section);
        this.settings.bindProperty(Settings.BindingDirection.IN, "recurseDocuments", "recurseDocuments", this._build_documents_section);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showRecentDocuments", "showRecentDocuments", this.buildMenu);
        this.settings.bindProperty(Settings.BindingDirection.IN, "recentSizeLimit", "recentSizeLimit", this._build_recent_documents_section);
        this.settings.bindProperty(Settings.BindingDirection.IN, "keyOpen", "keyOpen", this._setKeybinding);
        this._setKeybinding();
    },
    
    _setKeybinding: function() {
        if ( this.keyId ) Main.keybindingManager.removeHotKey(this.keyId);
        if ( this.keyOpen == "" ) return;
        this.keyId = "officeCenter-open";
        Main.keybindingManager.addHotKey(this.keyId, this.keyOpen, Lang.bind(this, this.openMenu));
    },
    
    buildMenu: function() {
        try {
            
            if ( this.menu ) this.menu.destroy();
            
            menu_item_icon_size = this.iconSize;
            
            this.menu = new Applet.AppletPopupMenu(this, this.orientation);
            this.menuManager.addMenu(this.menu);
            let section = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(section);
            let mainBox = new St.BoxLayout({ style_class: 'menu-applications-box', vertical: false });
            section.actor.add_actor(mainBox);
            
            //launchers section
            let launchersPane = new PopupMenu.PopupMenuSection();
            let title = new PopupMenu.PopupMenuItem(_("LAUNCHERS") , { reactive: false });
            launchersPane.addMenuItem(title);
            
            this.launchersSection = new PopupMenu.PopupMenuSection();
            launchersPane.addMenuItem(this.launchersSection);
            
            mainBox.add_actor(launchersPane.actor, { span: 1 });
            this._build_launchers_section();
            
            let paddingBox = new St.BoxLayout();
            paddingBox.set_width(MENU_PADDING_WIDTH);
            mainBox.add_actor(paddingBox);
            
            //documents section
            if ( this.showDocuments ) {
                
                let documentPane = new PopupMenu.PopupMenuSection();
                mainBox.add_actor(documentPane.actor, { span: 1 });
                let title = new PopupMenu.PopupBaseMenuItem({ reactive: false });
                title.addActor(new St.Label({ text: _("DOCUMENTS") }));
                documentPane.addMenuItem(title);
                
                //add link to documents folder
                let linkButton = new St.Button();
                title.addActor(linkButton);
                let file = Gio.file_new_for_path(this.metadata.path + "/link-symbolic.svg");
                let gicon = new Gio.FileIcon({ file: file });
                let image = new St.Icon({ gicon: gicon, icon_size: 16, icon_type: St.IconType.SYMBOLIC });
                linkButton.add_actor(image);
                linkButton.connect("clicked", Lang.bind(this, this.openDocumentsFolder));
                new Tooltips.Tooltip(linkButton, _("Open folder"));
                
                let documentScrollBox = new St.ScrollView({ x_fill: true, y_fill: false, y_align: St.Align.START });
                documentPane.actor.add_actor(documentScrollBox);
                documentScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
                let vscroll = documentScrollBox.get_vscroll_bar();
                vscroll.connect('scroll-start', Lang.bind(this, function() { this.menu.passEvents = true; }));
                vscroll.connect('scroll-stop', Lang.bind(this, function() { this.menu.passEvents = false; }));
                
                this.documentSection = new PopupMenu.PopupMenuSection();
                documentScrollBox.add_actor(this.documentSection.actor);
                
                this._build_documents_section();
                
                let paddingBox = new St.BoxLayout();
                paddingBox.set_width(MENU_PADDING_WIDTH);
                mainBox.add_actor(paddingBox);
                
            }
            
            //recent documents section
            if ( this.showRecentDocuments ) {
                
                let recentPane = new PopupMenu.PopupMenuSection();
                mainBox.add_actor(recentPane.actor, { span: 1 });
                
                let title = new PopupMenu.PopupMenuItem(_("RECENT DOCUMENTS"), { reactive: false });
                recentPane.addMenuItem(title);
                
                let recentScrollBox = new St.ScrollView({ x_fill: true, y_fill: false, y_align: St.Align.START });
                recentPane.actor.add_actor(recentScrollBox);
                recentScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
                let vscroll = recentScrollBox.get_vscroll_bar();
                vscroll.connect('scroll-start', Lang.bind(this, function() { this.menu.passEvents = true; }));
                vscroll.connect('scroll-stop', Lang.bind(this, function() { this.menu.passEvents = false; }));
                
                this.recentSection = new PopupMenu.PopupMenuSection();
                recentScrollBox.add_actor(this.recentSection.actor);
                
                let clearRecent = new ClearRecentMenuItem(this.menu, this.recentManager);
                recentPane.addMenuItem(clearRecent);
                
                this._build_recent_documents_section();
                
            }
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    _build_launchers_section: function() {
        
        this.launchersSection.removeAll();
        
        let apps = [];
        let tree = this.appSys.get_tree();
        let root = tree.get_root_directory();
        let iter = root.iter();
        let nextType;
        while ( (nextType = iter.next()) != GMenu.TreeItemType.INVALID ) {
            if ( nextType == GMenu.TreeItemType.DIRECTORY ) {
                let dir = iter.get_directory();
                if ( dir.get_menu_id() == _("Office") ) {
                    dirIter = dir.iter();
                    while (( nextType = dirIter.next()) != GMenu.TreeItemType.INVALID ) {
                        if ( nextType == GMenu.TreeItemType.ENTRY ) {
                            let entry = dirIter.get_entry();
                            if (!entry.get_app_info().get_nodisplay()) {
                                var app = this.appSys.lookup_app_by_tree_entry(entry);
                                let launcherItem = new LauncherMenuItem(this.menu, app);
                                this.launchersSection.addMenuItem(launcherItem);
                            }
                        }
                    }
                }
            }
        }
        
    },
    
    _build_documents_section: function() {
        
        this.documentSection.removeAll();
        
        if ( this.altDir == "" ) this.documentPath = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        else this.documentPath = this.altDir;
        let dir = Gio.file_new_for_path(this.documentPath);
        let documents = this._get_documents(dir);
        for ( let i = 0; i < documents.length; i++ ) {
            let document = documents[i];
            let documentItem = new DocumentMenuItem(this.menu, document);
            this.documentSection.addMenuItem(documentItem);
        }
        
    },
    
    _get_documents: function(dir) {
        
        let documents = [];
        let gEnum = dir.enumerate_children("*", Gio.FileQueryInfoFlags.NONE, null);
        while ( (info = gEnum.next_file(null)) != null ) {
            if ( info.get_is_hidden() ) continue;
            if ( info.get_file_type() == Gio.FileType.DIRECTORY && this.recurseDocuments ) {
                let childDir = dir.get_child(info.get_name());
                documents = documents.concat(this._get_documents(childDir));
            }
            else documents.push(dir.get_child(info.get_name()));
        }
        return documents;
        
    },
    
    _build_recent_documents_section: function() {
        
        this.recentSection.removeAll();
        
        let recentDocuments = this.recentManager.get_items();
        
        let showCount;
        if ( this.recentSizeLimit == 0 ) showCount = recentDocuments.length;
        else showCount = ( this.recentSizeLimit < recentDocuments.length ) ? this.recentSizeLimit : recentDocuments.length;
        for ( let i = 0; i < showCount; i++ ) {
            let recentInfo = recentDocuments[i];
            let mimeType = recentInfo.get_mime_type().replace("\/","-");
            let recentItem = new RecentMenuItem(this.menu, recentInfo.get_display_name(), mimeType, recentInfo.get_uri());
            this.recentSection.addMenuItem(recentItem);
        }
        
    },
    
    openDocumentsFolder: function() {
        this.menu.close();
        Gio.app_info_launch_default_for_uri("file://" + this.documentPath, global.create_app_launch_context());
    },
    
    _set_panel_icon: function() {
        if ( this.panelIcon.split("/").length > 1 ) this.set_applet_icon_path(this.panelIcon);
        else this.set_applet_icon_name(this.panelIcon);
    },
    
    _set_panel_text: function() {
        if ( this.panelText ) this.set_applet_label(this.panelText);
        else this.set_applet_label("");
    }
};


function main(metadata, orientation, panel_height, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panel_height, instanceId);
    return myApplet;
}