/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * An internal window based on qooxdoo widgets
 *
 * More information can be found in the package description {@link qx.ui.window}.
 *
 * @state active
 * @state maximized This state is active if the window is maximized
 *
 * @appearance window The main window object
 * @appearance window-resize-frame {qx.ui.basic.Terminator}
 * @appearance window-pane {qx.ui.container.Composite}
 * @appearance window-captionbar-icon {qx.ui.basic.Image}
 * @appearance window-captionbar-title {qx.ui.basic.Label} The label of the caption bar
 * @appearance window-captionbar-minimize-button {qx.ui.form.Button}
 * @appearance window-captionbar-restore-button {qx.ui.form.Button}
 * @appearance window-captionbar-maximize-button {qx.ui.form.Button}
 * @appearance window-captionbar-close-button {qx.ui.form.Button}
 * @appearance window-statusbar {qx.ui.layout.HorizontalBoxLayout}
 * @appearance window-statusbar-text {qx.ui.basic.Label}
 *
 * @appearance window-captionbar {qx.ui.layout.HorizontalBoxLayout}
 * @state active {window-captionbar}
 */
qx.Class.define("qx.ui.window.Window",
{
  extend : qx.ui.core.Widget,

  include :
  [
    qx.ui.core.MRemoteChildrenHandling,
    qx.ui.core.MRemoteLayoutHandling,
    qx.ui.resizer.MResizable
  ],





  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function(caption, icon, manager)
  {
    this.base(arguments);

    // initialize window manager
    this.setManager(manager || qx.ui.window.Window.getDefaultWindowManager());

    // configure internal layout
    this._setLayout(new qx.ui.layout.VBox());

    // force creation of captionbar
    this._createChildControl("captionbar");
    this._createChildControl("pane");

    // apply constructor parameters
    if (icon != null) {
      this.setIcon(icon);
    }

    if (caption != null) {
      this.setCaption(caption);
    }

    // update captionbar
    this._updateCaptionBar();

    // register window events
    this.addListener("mousedown", this._onWindowEventStop);
    this.addListener("mouseup", this._onWindowEventStop);
    this.addListener("click", this._onWindowEventStop);

    this.addListener("mousedown", this._onWindowMouseDown, this, true);
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /*
    ---------------------------------------------------------------------------
      MANAGER HANDLING
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the default window manager. If no exists a new instance of
     * the manager is created.
     *
     * @type static
     * @return {qx.ui.window.Manager} window manager instance
     */
    getDefaultWindowManager : function()
    {
      var Window = qx.ui.window.Window;
      if (!Window._defaultWindowManager) {
        Window._defaultWindowManager = new qx.ui.window.Manager;
      }

      return Window._defaultWindowManager;
    }
  },





  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  events :
  {
    /**
     * Fired before the window is closed.
     *
     * The close action can be prevented by calling
     * {@link qx.event.type.Event#preventDefault} on the event object
     */
    "beforeClose" : "qx.event.type.Event",

    /** Fired if the window is closed */
    "close" : "qx.event.type.Event",

    /**
     * Fired before the window is minimize.
     *
     * The minimize action can be prevented by calling
     * {@link qx.event.type.Event#preventDefault} on the event object
     */
    "beforeMinimize" : "qx.event.type.Event",

    /** Fired if the window is minimized */
    "minimize" : "qx.event.type.Event",

    /**
     * Fired before the window is maximize.
     *
     * The maximize action can be prevented by calling
     * {@link qx.event.type.Event#preventDefault} on the event object
     */
    "beforeMaximize" : "qx.event.type.Event",

    /** Fired if the window is maximized */
    "maximize" : "qx.event.type.Event",

    /**
     * Fired before the window is restored from a minimized or maximized state.
     *
     * The restored action can be prevented by calling
     * {@link qx.event.type.Event#preventDefault} on the event object
     */
    "beforeRestore" : "qx.event.type.Event",

    /** Fired if the window is restored from a minimized or maximized state */
    "restore" : "qx.event.type.Event"
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /*
    ---------------------------------------------------------------------------
      INTERNAL OPTIONS
    ---------------------------------------------------------------------------
    */

    // overridden
    appearance :
    {
      refine : true,
      init : "window"
    },


    // overridden
    visibility :
    {
      refine : true,
      init : "excluded"
    },


    /** The manager to use for. */
    manager :
    {
      check : "qx.ui.window.Manager",
      event : "changeManager"
    },


    /**
     * If the window is active, only one window in a single qx.ui.window.Manager could
     *  have set this to true at the same time.
     */
    active :
    {
      check : "Boolean",
      init : false,
      apply : "_applyActive",
      event : "changeActive"
    },







    /*
    ---------------------------------------------------------------------------
      BASIC OPTIONS
    ---------------------------------------------------------------------------
    */

    /** Should be window be modal (this disable minimize and maximize buttons) */
    modal :
    {
      check : "Boolean",
      init : false,
      apply : "_applyModal",
      event : "changeModal"
    },


    /** The text of the caption */
    caption :
    {
      apply : "_applyCaption",
      event : "changeCaption",
      nullable : true
    },


    /** The icon of the caption */
    icon :
    {
      check : "String",
      nullable : true,
      apply : "_applyIcon",
      event : "changeIcon",
      themeable : true
    },


    /** The text of the statusbar */
    status :
    {
      check : "String",
      nullable : true,
      apply : "_applyStatus",
      event :"changeStatus"
    },




    /*
    ---------------------------------------------------------------------------
      HIDE CAPTIONBAR FEATURES
    ---------------------------------------------------------------------------
    */

    /** Should the close button be shown */
    showClose :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange",
      themeable : true
    },


    /** Should the maximize button be shown */
    showMaximize :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange",
      themeable : true
    },


    /** Should the minimize button be shown */
    showMinimize :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange",
      themeable : true
    },




    /*
    ---------------------------------------------------------------------------
      DISABLE CAPTIONBAR FEATURES
    ---------------------------------------------------------------------------
    */

    /** Should the user have the ability to close the window */
    allowClose :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange"
    },


    /** Should the user have the ability to maximize the window */
    allowMaximize :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange"
    },


    /** Should the user have the ability to minimize the window */
    allowMinimize :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange"
    },




    /*
    ---------------------------------------------------------------------------
      STATUSBAR CONFIG
    ---------------------------------------------------------------------------
    */

    /** Should the statusbar be shown */
    showStatusbar :
    {
      check : "Boolean",
      init : true,
      apply : "_applyShowStatusbar"
    },




    /*
    ---------------------------------------------------------------------------
      MOVE CONFIG
    ---------------------------------------------------------------------------
    */

    /** If the window is moveable */
    moveable :
    {
      check : "Boolean",
      init : true,
      event : "changeMoveable"
    },


    /** The move method to use */
    moveMethod :
    {
      check : [ "opaque", "frame", "translucent" ],
      init : "opaque",
      event : "changeMoveMethod",
      themeable : true
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    /**
     * The children container needed by the {@link qx.ui.core.MRemoteChildrenHandling}
     * mixin
     *
     * @type member
     * @return {qx.ui.container.Composite} pane sub widget
     */
    getChildrenContainer : function() {
      return this._getChildControl("pane");
    },


    // overridden
    _getStyleTarget : function() {
      return this._getChildControl("pane");
    },


    // overridden
    _forwardStates :
    {
      active : true,
      maximized : true
    },


    // overridden
    _createChildControlImpl : function(id)
    {
      var control;

      switch(id)
      {
        case "statusbar":
          control = new qx.ui.container.Composite(new qx.ui.layout.HBox());
          this._add(control);
          control.add(this._getChildControl("statusbar-text"));
          break;

        case "statusbar-text":
          control = new qx.ui.basic.Label();
          control.setContent(this.getStatus());
          break;

        case "pane":
          control = new qx.ui.container.Composite();
          this._add(control, {flex: 1});
          break;

        case "captionbar":
          // captionbar
          var layout = new qx.ui.layout.Grid();
          layout.setColumnFlex(2, 1);
          control = new qx.ui.container.Composite(layout);
          this._add(control);

          // captionbar events
          control.addListener("mousedown", this._onCaptionMouseDown, this);
          control.addListener("mouseup", this._onCaptionMouseUp, this);
          control.addListener("mousemove", this._onCaptionMouseMove, this);
          control.addListener("dblclick", this._onCaptionMouseDblClick, this);
          break;

        case "icon":
          control = new qx.ui.basic.Image(this.getIcon());
          this._getChildControl("captionbar").add(control, {row: 0, column:0});
          break;

        case "title":
          control = new qx.ui.basic.Label(this.getCaption());
          this._getChildControl("captionbar").add(control, {row: 0, column:1});
          break;

        case "spacer":
          control = new qx.ui.core.Spacer();
          this._getChildControl("captionbar").add(control, {row: 0, column:2});
          break;

        case "minimize-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.addListener("execute", this._onMinimizeButtonClick, this);

          this._getChildControl("captionbar").add(control, {row: 0, column:3});
          break;

        case "restore-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.addListener("execute", this._onRestoreButtonClick, this);

          this._getChildControl("captionbar").add(control, {row: 0, column:4});
          break;

        case "maximize-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.addListener("execute", this._onMaximizeButtonClick, this);

          this._getChildControl("captionbar").add(control, {row: 0, column:5});
          break;

        case "close-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.addListener("execute", this._onCloseButtonClick, this);

          this._getChildControl("captionbar").add(control, {row: 0, column:6});
          break;
      }

      return control || this.base(arguments, id);
    },





    /*
    ---------------------------------------------------------------------------
      CAPTIONBAR INTERNALS
    ---------------------------------------------------------------------------
    */

    /**
     * Updates the status and the visibility of each element of the captionbar.
     */
    _updateCaptionBar : function()
    {
      if (this.getIcon()) {
        this._showChildControl("icon");
      } else {
        this._excludeChildControl("icon");
      }

      if (this.getCaption()) {
        this._showChildControl("title");
      } else {
        this._excludeChildControl("title");
      }

      if (this.getShowMinimize())
      {
        this._showChildControl("minimize-button");

        var btn = this._getChildControl("minimize-button");
        this.getAllowMinimize() ? btn.resetEnabled() : btn.setEnabled(false);
      }
      else
      {
        this._excludeChildControl("minimize-button");
      }

      if (this.getShowMaximize())
      {
        this._showChildControl("maximize-button");
        this._showChildControl("maximize-button");

        var btn = this._getChildControl("maximize-button");
        this.getAllowMaximize() ? btn.resetEnabled() : btn.setEnabled(false);
      }
      else
      {
        this._excludeChildControl("maximize-button");
        this._excludeChildControl("restore-button");
      }

      if (this.getShowClose())
      {
        this._showChildControl("close-button");

        var btn = this._getChildControl("close-button");
        this.getAllowClose() ? btn.resetEnabled() : btn.setEnabled(false);
      }
      else
      {
        this._excludeChildControl("close-button");
      }
    },





    /*
    ---------------------------------------------------------------------------
      USER API
    ---------------------------------------------------------------------------
    */

    /**
     * Closes the current window instance.
     * Technically calls the {@link qx.ui.core.Widget#hide} method.
     *
     * @type member
     * @return {void}
     */
    close : function()
    {
      if (this.fireNonBubblingEvent("beforeClose", qx.event.type.Event, [false, true]))
      {
        this.hide();
        this.fireEvent("close");
      };
    },


    /**
     * Opens the window.
     *
     * Sets the opener property (if available) and centers
     * the window if the property {@link #centered} is enabled.
     *
     * @type member
     * @return {void}
     */
    open : function() {
      this.show();
    },


    /**
     * Maximize the window by setting the property {@link mode} to <code>maximized</code>
     *
     * @type member
     * @return {void}
     */
    maximize : function()
    {
      if (!this.fireNonBubblingEvent("beforeMaximize", qx.event.type.Event, [false, true])) {
        this.fireEvent("maximize");
      };
    },


    /**
     * Maximize the window by setting the property {@link mode} to <code>minimized</code>
     *
     * @type member
     * @return {void}
     */
    minimize : function()
    {
      if (!this.fireNonBubblingEvent("beforeMinimize", qx.event.type.Event, [false, true]))
      {
        this.hide();
        this.fireEvent("minimize");
      };
    },


    /**
     * Maximize the window by setting the property {@link mode} to <code>null</code>
     *
     * @type member
     * @return {void}
     */
    restore : function()
    {
      if (this.fireNonBubblingEvent("beforeRestore", qx.event.type.Event, [false, true])) {
        this.fireEvent("restore");
      };
    },


    /**
     * Set the window's position relative to its parent
     *
     * @param left {Integer} The left position
     * @param top {Integer} The top position
     */
    moveTo : function(left, top)
    {
      if (this.isMaximized()) {
        return;
      }

      this.setLayoutProperties({
        left : left,
        top : top
      });
    },




    /*
    ---------------------------------------------------------------------------
      ZIndex Positioning
    ---------------------------------------------------------------------------
    */

    /**
     * Bring the window to front (if possible)
     *
     * @type member
     * @return {void}
     */
    bringToFront : function() {
      this.getManager().bringToFront(this);
    },


    /**
     * Send the window to the back (if possible)
     *
     * @type member
     * @return {void}
     */
    sendToBack : function() {
      this.getManager().sendToBack(this);
    },




    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // overridden
    _applyVisibility : function(value, old)
    {
      this.base(arguments, value, old);

      if (value == "visible") {
        this.getManager().add(this);
      } else {
        this.getManager().remove(this);
      }
    },


    // property apply
    _applyActive : function(value, old)
    {
      var mgr = this.getManager();
      if (old)
      {
        if (mgr.getActiveWindow() == this) {
          mgr.setActiveWindow(null);
        }

        this.removeState("active");
      }
      else
      {
        mgr.setActiveWindow(this);
        this.addState("active");
      }
    },


    // property apply
    _applyModal : function(value, old)
    {
      // TODO
      this.debug("Modal support still missing!");
    },


    // property apply
    _applyShowStatusbar : function(value, old)
    {
      if (value) {
        this._showChildControl("statusbar");
      } else {
        this._excludeChildControl("statusbar");
      }
    },


    // property apply
    _applyCaptionBarChange : function(value, old) {
      this._updateCaptionBar();
    },


    // property apply
    _applyStatus : function(value, old)
    {
      var label = this._getChildControl("statusbar-text", true);
      if (label) {
        label.setContent(value);
      }
    },


    // property apply
    _applyResizable : function(value, old) {
      this._updateCaptionBar();
    },


    // property apply
    _applyCaption : function(value, old) {
      this._getChildControl("title").setContent(value);
    },


    // property apply
    _applyIcon : function(value, old) {
      this._getChildControl("icon").setSource(value);
    },






    /*
    ---------------------------------------------------------------------------
      STATE LAYOUT IMPLEMENTATION
    ---------------------------------------------------------------------------
    */

    /**
     * Maximizes the window.<br/>
     * Stores the current dimension and location and setups up
     * the new ones. Adds the state <code>maximized</code> and toggles
     * the buttons in the caption bar.
     *
     * @type member
     * @return {void}
     */
    _maximize : function()
    {
      if (this.hasState("maximized")) {
        return;
      }

      // store current dimension and location
      var props = this.getLayoutProperties();
      this.__previousLayoutProps = {
        left: props.left || 0,
        right: props.right || null,
        bottom: props.bottom || null,
        top: props.top || 0
      };

      // setup new dimension and location
      this.setLayoutProperties({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      })

      // update state
      this.addState("maximized");

      // toggle button
      if (this.getShowMaximize())
      {
        this._showChildControl("restore-button");
        this._excludeChildControl("maximize-button");
      }

      // finally focus the window
      this.setActive(true);
    },






    /*
    ---------------------------------------------------------------------------
      BASIC EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Stops every event
     *
     * @type member
     * @param e {qx.event.type.Event} any event
     * @return {void}
     */
    _onWindowEventStop : function(e) {
      e.stopPropagation();
    },


    /**
     * Focuses the window instance.
     *
     * @type member
     * @param e {qx.event.type.MouseEvent} mouse down event
     * @return {void}
     */
    _onWindowMouseDown : function(e) {
      this.setActive(true);
    },


    /**
     * Maximizes the window or restores it if it is already
     * maximized.
     *
     * @type member
     * @param e {qx.event.type.MouseEvent} double click event
     * @return {void}
     */
    _onCaptionMouseDblClick : function(e)
    {
      if (this.getAllowMaximize()) {
        this.isMaximized() ? this.restore() : this.maximize();
      }
    },




    /*
    ---------------------------------------------------------------------------
      EVENTS FOR CAPTIONBAR BUTTONS
    ---------------------------------------------------------------------------
    */

    /**
     * Minmizes the window, removes all states from the minimize button and
     * stops the further propagation of the event (calling {@link qx.event.type.Event#stopPropagation}).
     *
     * @param e {qx.event.type.MouseEvent} mouse click event
     * @return {void}
     */
    _onMinimizeButtonClick : function(e)
    {
      this.minimize();
      this._getChildControl("minimize-button").reset();
    },


    /**
     * Restores the window, removes all states from the restore button and
     * stops the further propagation of the event (calling {@link qx.event.type.Event#stopPropagation}).
     *
     * @param e {qx.event.type.MouseEvent} mouse click event
     * @return {void}
     */
    _onRestoreButtonClick : function(e)
    {
      this.restore();
      this._getChildControl("restore-button").reset();
    },


    /**
     * Maximizes the window, removes all states from the maximize button and
     * stops the further propagation of the event (calling {@link qx.event.type.Event#stopPropagation}).
     *
     * @param e {qx.event.type.MouseEvent} mouse click event
     * @return {void}
     */
    _onMaximizeButtonClick : function(e)
    {
      this.maximize();
      this._getChildControl("maximize-button").reset();
    },


    /**
     * Closes the window, removes all states from the close button and
     * stops the further propagation of the event (calling {@link qx.event.type.Event#stopPropagation}).
     *
     * @param e {qx.event.type.MouseEvent} mouse click event
     * @return {void}
     */
    _onCloseButtonClick : function(e)
    {
      this.close();
      this._getChildControl("close-button").reset();
    },




    /*
    ---------------------------------------------------------------------------
      EVENTS FOR WINDOW MOVING
    ---------------------------------------------------------------------------
    */

    /**
     * Enables the capturing of the caption bar and prepares the drag session and the
     * appearance (translucent, frame or opaque) for the moving of the window.
     *
     * @type member
     * @param e {qx.event.type.MouseEvent} mouse down event
     * @return {void}
     */
    _onCaptionMouseDown : function(e)
    {
      if (!this.getMoveable()) {
        return;
      }

      // enable capturing
      this._getChildControl("captionbar").capture();

      // measuring and caching of values for drag session
      var pl = this.getLayoutParent().getContainerElement().getDomElement();

      // compute locations
      var paLoc = qx.bom.element.Location.get(pl, "scroll");
      var location = qx.bom.element.Location.get(this.getContainerElement().getDomElement());
      var bounds = this.getBounds();

      this._dragSession =
      {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,

        elementLocation: location,

        parentAvailableAreaLeft : paLoc.left + 5,
        parentAvailableAreaTop : paLoc.top + 5,
        parentAvailableAreaRight : paLoc.right - 5,
        parentAvailableAreaBottom : paLoc.bottom - 5,

        mouseStartLeft: e.getDocumentLeft(),
        mouseStartTop: e.getDocumentTop()
      };


      // handle frame and translucently
      switch(this.getMoveMethod())
      {
        case "translucent":
          this.setOpacity(0.5);
          break;

        case "frame":
          var frame = this._getFrame();
          frame.show();
          frame.setUserBounds(
            location.left,
            location.top,
            location.right-location.left,
            location.bottom - location.top
          );
          frame.setZIndex(this.getZIndex() + 1);
          break;
      }
    },


    /**
     * Disables the capturing of the caption bar and moves the window
     * to the last position of the drag session. Also restores the appearance
     * of the window.
     *
     * @type member
     * @param e {qx.event.type.MouseEvent} mouse up event
     * @return {void}
     */
    _onCaptionMouseUp : function(e)
    {
      var s = this._dragSession;

      if (!s) {
        return;
      }

      // disable capturing
      this._getChildControl("captionbar").releaseCapture();
      this.resetUserBounds();

      // move window to last position
      if (s.lastX != null) {
        this.setLayoutProperties({left: s.lastX});
      }

      if (s.lastY != null) {
        this.setLayoutProperties({top: s.lastY});
      }

      // handle frame and translucently
      switch(this.getMoveMethod())
      {
        case "translucent":
          this.setOpacity(null);
          break;

        case "frame":
          this._getFrame().hide();
          break;
      }

      // cleanup session
      delete this._dragSession;
    },


    /**
     * Does the moving of the window by rendering the position
     * of the window (or frame) at runtime using direct dom methods.
     *
     * @type member
     * @param e {qx.event.type.Event} mouse move event
     * @return {void}
     */
    _onCaptionMouseMove : function(e)
    {
      var s = this._dragSession;

      var s = this._dragSession;
      if (!s) {
        return;
      }

      // pre check if we go out of the available area
      // pre check if we go out of the available area
      if (
        !qx.lang.Number.isBetweenRange(e.getViewportLeft(), s.parentAvailableAreaLeft, s.parentAvailableAreaRight) ||
        !qx.lang.Number.isBetweenRange(e.getViewportTop(), s.parentAvailableAreaTop, s.parentAvailableAreaBottom)
      ) {
        return;
      }

      var dragOffsetLeft = e.getDocumentLeft() - s.mouseStartLeft;
      var dragOffsetTop = e.getDocumentTop() - s.mouseStartTop;

      s.lastX = s.left + dragOffsetLeft;
      s.lastY = s.top + dragOffsetTop;

      // handle frame and translucently
      switch(this.getMoveMethod())
      {
        case "translucent":
        case "opaque":
          this.setUserBounds(
            s.lastX,
            s.lastY,
            s.width,
            s.height
          );
          break;

        case "frame":
          this._getFrame().setUserBounds(
            s.elementLocation.left + dragOffsetLeft,
            s.elementLocation.top + dragOffsetTop,
            s.width,
            s.height
          );
          break;
      }
    }
  }
});
