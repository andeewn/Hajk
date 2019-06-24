// Copyright (C) 2016 Göteborgs Stad
//
// Denna programvara är fri mjukvara: den är tillåten att distribuera och modifiera
// under villkoren för licensen CC-BY-NC-SA 4.0.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the CC-BY-NC-SA 4.0 licence.
//
// http://creativecommons.org/licenses/by-nc-sa/4.0/
//
// Det är fritt att dela och anpassa programvaran för valfritt syfte
// med förbehåll att följande villkor följs:
// * Copyright till upphovsmannen inte modifieras.
// * Programvaran används i icke-kommersiellt syfte.
// * Licenstypen inte modifieras.
//
// Den här programvaran är öppen i syfte att den skall vara till nytta för andra
// men UTAN NÅGRA GARANTIER; även utan underförstådd garanti för
// SÄLJBARHET eller LÄMPLIGHET FÖR ETT VISST SYFTE.
//
// https://github.com/hajkmap/Hajk

/**
 * @class
 */
var ToolbarView = {
  /**
   * Get initial state.
   * @instance
   * @return {object}
   */
  getInitialState: function () {
    return {};
  },

  componentDidMount: function () {

  },

  /**
   * Triggered before the component mounts.
   * @instance
   */
  componentWillMount: function () {
    this.props.navigationModel.on('change:activePanelType', () => {
      this.setState({
        activeTool: this.props.navigationModel.get('activePanelType')
      });
    });
  },

  /**
   * Render the panel component.
   * @instance
   * @return {external:ReactElement}
   */
  render: function () {
    var layerSwitcherTool = this.props.model
      .filter(t => t.get('toolbar'))
      .filter(tool => tool.get('type') === 'layerswitcher')
      .map((tool, index) => {
        tool.set('toolbar', isMobile ? 'stable' : 'bottom');
      });

    var tools = this.props.model
      .filter(t => t.get('toolbar'))
      .filter(tool => tool.get('toolbar') === 'bottom' || (tool.get('toolbar') === 'stable' && !mobilAnpassningEnabled))
      .map((tool, index) => {
        var a = tool.get('panel').toLowerCase(),
          b = this.state.activeTool,
          c = a === b ? 'btn btn-toolbar btn-primary' : 'btn btn-toolbar btn-default';
        var id = tool.get('Id');

        if (tool.get('active') === false) {
          return null;
        }

        return (
          <button
            id={id}
            type='button'
            className={c}
            onClick={() => {
              tool.clicked();
              if (tool.get('type') !== 'information') {
                this.props.navigationModel.set('r', Math.random());
              }
            }}
            key={index}
            title={tool.get('title')}>
            <i className={tool.get('icon')} />
          </button>
        );
      });

    // stable button
    var stableButton = this.props.model
      .filter(t => t.get('toolbar'))
      .filter(tool => tool.get('toolbar') === 'stable' && mobilAnpassningEnabled)
      .map((tool, index) => {
        var a = tool.get('panel').toLowerCase(),
          b = this.state.activeTool,
          c = a === b ? 'btn btn-toolbar btn-primary' : 'btn btn-toolbar btn-default';
        var id = tool.get('Id');

        if (tool.get('active') === false) {
          return null;
        }

        return (
          <button
            id={id}
            type='button'
            className={c}
            onClick={() => {
              tool.clicked();
              if (tool.get('type') !== 'information') {
                this.props.navigationModel.set('r', Math.random());
              }
            }}
            key={index}
            title={tool.get('title')}>
            <i className={tool.get('icon')} />
          </button>
        );
      });

    var widgets = this.props.model
      .filter(t => t.get('toolbar'))
      .filter(tool => tool.get('toolbar') === 'top-right')
      .map((tool, index) => {
        var className = tool.get('active') ? 'btn btn-toolbar btn-primary' : 'btn btn-toolbar btn-default';
        tool.on('change:active', () => {
          this.forceUpdate();
        });
        return (
          <button
            id={tool.get('Id')}
            type='button'
            className={className}
            onClick={() => {
              tool.clicked();
            }}
            key={index}
            title={tool.get('title')}>
            <i className={tool.get('icon')} />
          </button>
        );
      });

    return (
      <div id='toolbar-'>
        <div className='map-toolbar-wrapper'>
          <div className='map-toolbar'>
            <div className='btn-group btn-group-lg stable-toolbar'>{stableButton}</div>
            <div
              className='btn-group btn-group-lg bottom-toolbar'
              role='group'
              id='arrow'
              aria-label='toolbar'>
              {tools}
            </div>
          </div>
          <div className='upper-toolbar'>{widgets}</div>
          <div className='information' id='information' />
        </div>
      </div>
    );
  }
};

/**
 * ToolbarView module.<br>
 * Use <code>require('views/toolbar')</code> for instantiation.
 * @module ToolbarView-module
 * @returns {ToolbarView}
 */
module.exports = React.createClass(ToolbarView);
