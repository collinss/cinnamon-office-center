const Cinnamon = imports.gi.Cinnamon;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GMenu = imports.gi.GMenu;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const St = imports.gi.St;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;

const Util = imports.misc.util;
const Lang = imports.lang;

const MENU_ITEM_TEXT_LENGTH = 25;

let menu_item_icon_size;


function AboutDialog(metadata) {
    this._init(metadata);
}

AboutDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,
    
    _init: function(metadata) {
        try {
            ModalDialog.ModalDialog.prototype._init.call(this, {  });
            
            let contentBox = new St.BoxLayout({ vertical: true, style_class: "about-content" });
            this.contentLayout.add_actor(contentBox);
            
            let topBox = new St.BoxLayout();
            contentBox.add_actor(topBox);
            
            //icon
            let icon;
            if ( metadata.icon ) icon = new St.Icon({ icon_name: metadata.icon, icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
            else {
                let file = Gio.file_new_for_path(metadata.path + "/icon.png");
                if ( file.query_exists(null) ) {
                    let gicon = new Gio.FileIcon({ file: file });
                    icon = new St.Icon({ gicon: gicon, icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
                }
                else {
                    icon = new St.Icon({ icon_name: "applets", icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
                }
            }
            topBox.add_actor(icon);
            
            let topTextBox = new St.BoxLayout({ vertical: true });
            topBox.add_actor(topTextBox);
            
            /*title*/
            let titleBox = new St.BoxLayout();
            topTextBox.add_actor(titleBox);
            
            let title = new St.Label({ text: metadata.name, style_class: "about-title" });
            titleBox.add_actor(title);
            
            if ( metadata.version ) {
                let versionBin = new St.Bin({ x_align: St.Align.START, y_align: St.Align.END});
                titleBox.add_actor(versionBin);
                let version = new St.Label({ text: "v " + metadata.version, style_class: "about-version" });
                versionBin.add_actor(version);
            }
            
            //uuid
            let uuid = new St.Label({ text: metadata.uuid, style_class: "about-uuid" });
            topTextBox.add_actor(uuid);
            
            //description
            let desc = new St.Label({ text: metadata.description, style_class: "about-description" });
            let dText = desc.clutter_text;
            topTextBox.add_actor(desc);
            
            /*description and comments*/
            let scrollBox = new St.ScrollView({ style_class: "about-scrollBox" });
            contentBox.add_actor(scrollBox);
            let infoBox = new St.BoxLayout({ vertical: true, style_class: "about-scrollBox-innerBox" });
            scrollBox.add_actor(infoBox);
            
            //comments
            if ( metadata.comments ) {
                let comments = new St.Label({ text: "Comments:\n\t" + metadata.comments });
                let cText = comments.clutter_text;
                cText.ellipsize = Pango.EllipsizeMode.NONE;
                cText.line_wrap = true;
                cText.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                infoBox.add_actor(comments);
            }
            
            //website
            if ( metadata.website ) {
                let wsBox = new St.BoxLayout({ vertical: true });
                infoBox.add_actor(wsBox);
                
                let wLabel = new St.Label({ text: "Website:" });
                wsBox.add_actor(wLabel);
                
                let wsButton = new St.Button({ x_align: St.Align.START, style_class: "cinnamon-link", name: "about-website" });
                wsBox.add_actor(wsButton);
                let website = new St.Label({ text: metadata.website });
                let wtext = website.clutter_text;
                wtext.ellipsize = Pango.EllipsizeMode.NONE;
                wtext.line_wrap = true;
                wtext.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                wsButton.add_actor(website);
                wsButton.connect("clicked", Lang.bind(this, this.launchSite, metadata.website));
            }
            
            //contributors
            if ( metadata.contributors ) {
                let list = metadata.contributors.split(",").join("\n\t");
                let contributors = new St.Label({ text: "Contributors:\n\t" + list });
                infoBox.add_actor(contributors);
            }
            
            //dialog close button
            this.setButtons([
                { label: "Close", key: "", focus: true, action: Lang.bind(this, this._onOk) }
            ]);
            
            this.open(global.get_current_time());
        } catch(e) {
            global.log(e);
        }
    },
    
    _onOk: function() {
        this.close(global.get_current_time());
    },
    
    launchSite: function(a, b, site) {
        Util.spawnCommandLine("xdg-open " + site);
        this.close(global.get_current_time());
    }
}


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
            this.bindSettings();
            
            //set up panel
            this.setPanelIcon();
            this.setPanelText();
            this.set_applet_tooltip(_("Office"));
            
            this._applet_context_menu.addMenuItem(new Applet.MenuItem(_("About..."), "dialog-question", Lang.bind(this, this.openAbout)));
            
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.appSys = Cinnamon.AppSystem.get_default();
            let dirMonitor = Gio.file_new_for_path(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS))
                                .monitor_directory(Gio.FileMonitorFlags.SEND_MOVED, null);
            this.recentManager = new Gtk.RecentManager();
            
            //listen for changes
            this.appSys.connect("installed-changed", Lang.bind(this, this.buildLaunchersSection));
            dirMonitor.connect("changed", Lang.bind(this, this.buildDocumentsSection));
            this.recentManager.connect("changed", Lang.bind(this, this.buildRecentDocumentsSection));
            
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
    
    openAbout: function() {
        new AboutDialog(this.metadata);
    },
    
    openMenu: function(){
        this.menu.open();
    },
    
    bindSettings: function() {
        this.settings = new Settings.AppletSettings(this, this.metadata["uuid"], this.instanceId);
        this.settings.bindProperty(Settings.BindingDirection.IN, "panelIcon", "panelIcon", this.setPanelIcon);
        this.settings.bindProperty(Settings.BindingDirection.IN, "panelText", "panelText", this.setPanelText);
        this.settings.bindProperty(Settings.BindingDirection.IN, "iconSize", "iconSize", this.buildMenu);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showDocuments", "showDocuments", this.buildMenu);
        this.settings.bindProperty(Settings.BindingDirection.IN, "altDir", "altDir", this.buildDocumentsSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "recurseDocuments", "recurseDocuments", this.buildDocumentsSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showRecentDocuments", "showRecentDocuments", this.buildMenu);
        this.settings.bindProperty(Settings.BindingDirection.IN, "recentSizeLimit", "recentSizeLimit", this.buildRecentDocumentsSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "keyOpen", "keyOpen", this.setKeybinding);
        this.setKeybinding();
    },
    
    setKeybinding: function() {
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
            let mainBox = new St.BoxLayout({ style_class: "xCenter-mainBox", vertical: false });
            section.actor.add_actor(mainBox);
            
            //launchers section
            let launchersPaneBox = new St.BoxLayout({ style_class: "xCenter-pane" });
            mainBox.add_actor(launchersPaneBox);
            let launchersPane = new PopupMenu.PopupMenuSection();
            launchersPaneBox.add_actor(launchersPane.actor);
            
            let launchersTitle = new PopupMenu.PopupMenuItem(_("LAUNCHERS") , { style_class: "xCenter-title", reactive: false });
            launchersPane.addMenuItem(launchersTitle);
            this.launchersSection = new PopupMenu.PopupMenuSection();
            launchersPane.addMenuItem(this.launchersSection);
            
            this.buildLaunchersSection();
            
            //documents section
            if ( this.showDocuments ) {
                let documentPaneBox = new St.BoxLayout({ style_class: "xCenter-pane" });
                mainBox.add_actor(documentPaneBox);
                let documentPane = new PopupMenu.PopupMenuSection();
                documentPaneBox.add_actor(documentPane.actor);
                
                let documentTitle = new PopupMenu.PopupBaseMenuItem({ style_class: "xCenter-title", reactive: false });
                documentTitle.addActor(new St.Label({ text: _("DOCUMENTS") }));
                documentPane.addMenuItem(documentTitle);
                
                //add link to documents folder
                let linkButton = new St.Button();
                documentTitle.addActor(linkButton);
                let file = Gio.file_new_for_path(this.metadata.path + "/link-symbolic.svg");
                let gicon = new Gio.FileIcon({ file: file });
                let image = new St.Icon({ gicon: gicon, icon_size: 10, icon_type: St.IconType.SYMBOLIC });
                linkButton.add_actor(image);
                linkButton.connect("clicked", Lang.bind(this, this.openDocumentsFolder));
                new Tooltips.Tooltip(linkButton, _("Open folder"));
                
                let documentScrollBox = new St.ScrollView({ style_class: "xCenter-scrollBox", x_fill: true, y_fill: false, y_align: St.Align.START });
                documentPane.actor.add_actor(documentScrollBox);
                documentScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
                let vscroll = documentScrollBox.get_vscroll_bar();
                vscroll.connect("scroll-start", Lang.bind(this, function() { this.menu.passEvents = true; }));
                vscroll.connect("scroll-stop", Lang.bind(this, function() { this.menu.passEvents = false; }));
                
                this.documentSection = new PopupMenu.PopupMenuSection();
                documentScrollBox.add_actor(this.documentSection.actor);
                
                this.buildDocumentsSection();
            }
            
            //recent documents section
            if ( this.showRecentDocuments ) {
                let recentPaneBox = new St.BoxLayout({ style_class: "xCenter-pane" });
                mainBox.add_actor(recentPaneBox);
                let recentPane = new PopupMenu.PopupMenuSection();
                recentPaneBox.add_actor(recentPane.actor);
                
                let recentTitle = new PopupMenu.PopupMenuItem(_("RECENT DOCUMENTS"), { style_class: "xCenter-title", reactive: false });
                recentPane.addMenuItem(recentTitle);
                
                let recentScrollBox = new St.ScrollView({ style_class: "xCenter-scrollBox", x_fill: true, y_fill: false, y_align: St.Align.START });
                recentPane.actor.add_actor(recentScrollBox);
                recentScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
                let vscroll = recentScrollBox.get_vscroll_bar();
                vscroll.connect("scroll-start", Lang.bind(this, function() { this.menu.passEvents = true; }));
                vscroll.connect("scroll-stop", Lang.bind(this, function() { this.menu.passEvents = false; }));
                
                this.recentSection = new PopupMenu.PopupMenuSection();
                recentScrollBox.add_actor(this.recentSection.actor);
                
                let clearRecent = new ClearRecentMenuItem(this.menu, this.recentManager);
                recentPane.addMenuItem(clearRecent);
                
                this.buildRecentDocumentsSection();
            }
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    buildLaunchersSection: function() {
        
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
                    let dirIter = dir.iter();
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
    
    buildDocumentsSection: function() {
        
        this.documentSection.removeAll();
        
        if ( this.altDir == "" ) this.documentPath = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        else this.documentPath = this.altDir;
        let dir = Gio.file_new_for_path(this.documentPath);
        let documents = this.getDocuments(dir);
        for ( let i = 0; i < documents.length; i++ ) {
            let document = documents[i];
            let documentItem = new DocumentMenuItem(this.menu, document);
            this.documentSection.addMenuItem(documentItem);
        }
        
    },
    
    getDocuments: function(dir) {
        
        let documents = [];
        let gEnum = dir.enumerate_children("*", Gio.FileQueryInfoFlags.NONE, null);
        
        let info;
        while ( (info = gEnum.next_file(null)) != null ) {
            if ( info.get_is_hidden() ) continue;
            if ( info.get_file_type() == Gio.FileType.DIRECTORY && this.recurseDocuments ) {
                let childDir = dir.get_child(info.get_name());
                documents = documents.concat(this.getDocuments(childDir));
            }
            else documents.push(dir.get_child(info.get_name()));
        }
        return documents;
        
    },
    
    buildRecentDocumentsSection: function() {
        
        if ( !this.showRecentDocuments ) return;
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
    
    setPanelIcon: function() {
        if ( this.panelIcon == "" ||
           ( GLib.path_is_absolute(this.panelIcon) &&
             GLib.file_test(this.panelIcon, GLib.FileTest.EXISTS) ) ) {
            if ( this.panelIcon.search("-symbolic.svg") == -1 ) this.set_applet_icon_path(this.panelIcon);
            else this.set_applet_icon_symbolic_path(this.panelIcon);
        }
        else if ( Gtk.IconTheme.get_default().has_icon(this.panelIcon) ) {
            if ( this.panelIcon.search("-symbolic") != -1 ) this.set_applet_icon_symbolic_name(this.panelIcon);
            else this.set_applet_icon_name(this.panelIcon);
        }
        else this.set_applet_icon_name("applications-office");
    },
    
    setPanelText: function() {
        if ( this.panelText ) this.set_applet_label(this.panelText);
        else this.set_applet_label("");
    },
    
    set_applet_icon_symbolic_path: function(icon_path) {
        if (this._applet_icon_box.child) this._applet_icon_box.child.destroy();
        
        if (icon_path){
            let file = Gio.file_new_for_path(icon_path);
            let gicon = new Gio.FileIcon({ file: file });
            if (this._scaleMode) {
                let height = (this._panelHeight / DEFAULT_PANEL_HEIGHT) * PANEL_SYMBOLIC_ICON_DEFAULT_HEIGHT;
                this._applet_icon = new St.Icon({gicon: gicon, icon_size: height,
                                                icon_type: St.IconType.SYMBOLIC, reactive: true, track_hover: true, style_class: "applet-icon" });
            } else {
                this._applet_icon = new St.Icon({gicon: gicon, icon_size: 22, icon_type: St.IconType.FULLCOLOR, reactive: true, track_hover: true, style_class: "applet-icon" });
            }
            this._applet_icon_box.child = this._applet_icon;
        }
        this.__icon_type = -1;
        this.__icon_name = icon_path;
    }
};


function main(metadata, orientation, panel_height, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panel_height, instanceId);
    return myApplet;
}
