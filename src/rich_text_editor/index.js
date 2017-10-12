/**
 * * [add](#add)
 * * [get](#get)
 * * [getAll](#getall)
 * * [getToolbarEl](#gettoolbarel)
 *
 * This module allows to customize the toolbar of the Rich Text Editor and use commands from the HTML Editing APIs.
 * For more info about HTML Editing APIs check here:
 * https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
 *
 * It's highly recommended to keep this toolbar as small as possible, especially from styling commands (eg. 'fontSize')
 * and leave this task to the Style Manager.
 *
 * Before using methods you should get first the module from the editor instance, in this way:
 *
 * ```js
 * var rte = editor.RichTextEditor;
 * ```
 * @module RichTextEditor
 */
import RichTextEditor from './model/RichTextEditor';
import {on, off} from 'utils/mixins'

module.exports = () => {
  let config = {};
  const defaults = require('./config/config');
  let toolbar, actions, lastEl, globalRte;

  return {

    customRte: null,

    /**
     * Name of the module
     * @type {String}
     * @private
     */
    name: 'RichTextEditor',

    /**
     * Initialize module. Automatically called with a new instance of the editor
     * @param {Object} opts Options
     * @private
     */
    init(opts = {}) {
      config = opts;

      for (let name in defaults) {
        if (!(name in config)) {
          config[name] = defaults[name];
        }
      }

      const ppfx = config.pStylePrefix;

      if (ppfx) {
        config.stylePrefix = ppfx + config.stylePrefix;
      }

      this.pfx = config.stylePrefix;
      actions = config.actions || [];
      toolbar = document.createElement('div');
      toolbar.className = `${ppfx}rte-toolbar`;
      globalRte = this.initRte(document.createElement('div'));

      //Avoid closing on toolbar clicking
      on(toolbar, 'mousedown', e => e.stopPropagation());
      return this;
    },


    /**
     * Post render callback
     * @param  {View} ev
     * @private
     */
    postRender(ev) {
      const canvas = ev.model.get('Canvas');
      toolbar.style.pointerEvents = 'all';
      canvas.getToolsEl().appendChild(toolbar);
    },


    /**
     * Init the built-in RTE
     * @param  {HTMLElement} el
     * @return {RichTextEditor}
     * @private
     */
    initRte(el) {
      const pfx = this.pfx;
      const actionbarContainer = toolbar;
      const actionbar = this.actionbar;
      const actions = this.actions || config.actions;
      const classes = {
        actionbar: `${pfx}actionbar`,
        button: `${pfx}action`,
        active: `${pfx}active`,
      };
      const rte = new RichTextEditor({
        el,
        classes,
        actions,
        actionbar,
        actionbarContainer,
      });

      if (rte.actionbar) {
        this.actionbar = rte.actionbar;
      }

      if (rte.actions) {
        this.actions = rte.actions;
      }

      return rte;
    },

    /**
     * Add a new action to the built-in RTE toolbar
     * @param {string} name Action name
     * @param {Object} action Action options
     * @example
     * rte.add('bold', {
     *   icon: '<b>B</b>',
     *   attributes: {title: 'Bold',}
     *   result: rte => rte.exec('bold')
     * });
     * rte.add('link', {
     *   icon: document.getElementById('t'),
     *   event: 'click',
     *   attributes: {title: 'Link',}
     *   result: rte => rte.insertHTML(`<a href="#">${rte.selection()}</a>`)
     * });
     */
    add(name, action = {}) {
      action.name = name;
      globalRte.getActions().push(action);
      globalRte.addAction(action, {sync: 1});
    },

    /**
     * Get the action by its name
     * @param {string} name Action name
     * @return {Object}
     * @example
     * const action = rte.get('bold');
     * // {name: 'bold', ...}
     */
    get(name) {
      let result;
      globalRte.getActions().forEach(action => {
        if (action.name == name) {
          result = action;
        }
      });
      return result;
    },

    /**
     * Get all actions
     * @return {Array}
     */
    getAll() {
      return globalRte.getActions();
    },

    /**
     * Get the toolbar element
     * @return {HTMLElement}
     */
    getToolbarEl() {
      return toolbar;
    },

    /**
     * Triggered when the offset of the editor is changed
     * @private
     */
    udpatePosition() {
      const un = 'px';
      const canvas = config.em.get('Canvas');
      const pos = canvas.getTargetToElementDim(toolbar, lastEl, {
        event: 'rteToolbarPosUpdate',
      });

      if (config.adjustToolbar) {
        // Move the toolbar down when the top canvas edge is reached
        if (pos.top <= pos.canvasTop) {
          pos.top = pos.elementTop + pos.elementHeight;
        }
      }

      const toolbarStyle = toolbar.style;
      toolbarStyle.top = pos.top + un;
      toolbarStyle.left = pos.left + un;
    },

    /**
     * Enable rich text editor on the element
     * @param {View} view Component view
     * @param {Object} rte The instance of already defined RTE
     * @private
     * */
    enable(view, rte) {
      lastEl = view.el;
      const em = config.em;
      const el = view.getChildrenContainer();
      const customRte = this.customRte;

      toolbar.style.display = '';
      rte = customRte ? customRte.enable(el, rte) : this.initRte(el).enable();

      if (em) {
        setTimeout(this.udpatePosition.bind(this), 0);
        const event = 'change:canvasOffset canvasScroll';
        em.off(event, this.udpatePosition, this);
        em.on(event, this.udpatePosition, this);
        em.trigger('rte:enable', view, rte);
      }

      return rte;
    },

    /**
     * Unbind rich text editor from the element
     * @param {View} view
     * @param {Object} rte The instance of already defined RTE
     * @private
     * */
    disable(view, rte) {
      const em = config.em;
      const customRte = this.customRte;
      const style = toolbar.style;
      var el = view.getChildrenContainer();

      if (customRte) {
        customRte.disable(el, rte);
      } else {
        rte.disable();
      }

      style.display = 'none';
      style.top = 0;
      style.left = 0;
      em && em.trigger('rte:disable', view, rte);
    },
  };
};
