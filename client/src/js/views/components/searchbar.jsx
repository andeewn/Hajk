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

var SelectionToolbar = require('components/selectiontoolbar');
var SearchResultGroup = require('components/searchresultgroup');

/**
 * @class
 */
var SearchBarView = {
  /**
   * @property {string} value
   * @instance
   */
  value: undefined,

  /**
   * @property {number} timer
   * @instance
   */
  timer: undefined,

  /**
   * @property {number} loading
   * @instance
   */
  loading: 0,

  /**
   * Get initial state.
   * @instance
   * @return {object}
   */
  getInitialState: function() {
    return {
      visible: false,
      displayPopup: this.props.model.get('displayPopup'),
      haveUrlSearched: false,
      updateCtr: 2,
    };
  },

  /**
   * Triggered when the component is successfully mounted into the DOM.
   * @instance
   */
  componentDidMount: function () {
    this.value = this.props.model.get('value');
    if (this.props.model.get('items')) {
      this.setState({
        showResults: true,
        result: {
          status: 'success',
          items: this.props.model.get('items')
        }
      });
    }

    this.props.model.on("change:displayPopup", () => {
      this.setState({
        displayPopup: this.props.model.get('displayPopup')
      });
    });

	    var str
      , result
      , typeName;

	    /* This function will parse the variables s and v from the URL,
	    If they are present, and execute a search if they are specified.
	    s is the type of the object to search for. (s = adress, fastighet...)
	    v is the value to search for. (v = stor, storatorget...)
	     */

    // get s and v from URL
    var paramGet = function (name) {
      var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
      return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    };

    var s = paramGet('s');
    var v = paramGet('v');

    // will add a filter if s is not null with the specified type. if s is null a wildcard filter is added.
    if(s == null){
      this.props.model.set('filter', '*');
    }else{
      var filterName = '*';
      this.props.model.get('sources').map((wfslayer, i) => {
      if(s.toUpperCase() == wfslayer.caption.toUpperCase()){
        filterName = wfslayer.caption;
      }
      });
      this.props.model.set('filter', filterName);
    }

    if((!this.state.haveUrlSearched) && typeof v !== 'undefined') {
      var field = document.getElementById("searchbar-input-field");
      field.value = v;

      this.value = v;
      this.props.model.set('value', this.value);
      this.setState({
        value: this.value,
        minimized: false,
        force: true
      });
      this.props.model.set('force', true);
      if (this.refs.searchInput.value.length > 3) {
        this.search();
      } else {
        this.setState({
          loading: false
        });
      }
    }
  },

  componentDidUpdate: function(){

    var hit = document.getElementById('hit-0-group-0');
    console.log("running componentDidUpdate");
    if (!this.state.haveUrlSearched){
      try {
        console.log("clicking on hit");
        hit.click();
      } catch (err){
        console.log("error when clicking");
        console.log(err);
      }
    }

    if (this.state.updateCtr > 1){
      this.state.updateCtr -= 1;
    } else {
      this.state.haveUrlSearched = true;
    }
  },

  /**
   * Triggered before the component mounts.
   * @instance
   */
  componentWillMount: function () {
    this.props.model.get('layerCollection') ?
      this.bindLayerVisibilityChange() :
      this.props.model.on('change:layerCollection', this.bindLayerVisibilityChange);
  },

  /**
   * Triggered when component unmounts.
   * @instance
   */
  componentWillUnmount: function () {
    this.props.model.get('layerCollection').each((layer) => {
      layer.off("change:visible", this.search);
    });
    this.props.model.off('change:layerCollection', this.bindLayerVisibilityChange);
    this.props.model.off("change:displayPopup");
  },

  /**
   * Clear the search result.
   * @instance
   */
  clear: function () {
    if (typeof $("#sokRensa") !== "undefined") {
      $("#sokRensa").click();
    }
    this.value = "";
    this.props.model.set('value', "");
    this.props.model.clear();
    this.setState({
      loading: true,
      showResults: true,
      result: []
    });
  },

  /**
   * Handle key down event, this will set state.
   * @instance
   * @param {object} event
   */
  handleKeyDown: function (event) {
    this.props.model.set('filter', '*');
    if (event.keyCode === 13 && event.target.value.length < 5) {
      event.preventDefault();
      this.props.model.set('value', event.target.value);
      this.setState({
        force: true
      });
      this.props.model.set('force', true);
      this.search();
    }
  },

  minimize: function() {
    this.setState({
      minimized: true
    });
  },

  /**
   * Perform a search in the model to update results.
   * @instance
   */
  update: function() {
    this.props.model.search();
  },

  /**
   * Search requested information.
   * @instance
   * @param {object} event
   */
  search: function (event) {
    this.setState({
      loading: true
    });
    this.loading = Math.random();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      var loader = this.loading;
      this.props.model.abort();
      this.props.model.search(result => {
        var state = {
          loading: false,
          showResults: true,
          result: result
        };
        if (loader !== this.loading) {
          state.loading = true;
        }
        this.setState(state);
      });
    }, 200);
  },

  /**
   * Bind an event handler to layer visibility change.
   * If a layer changes visibility the result vill update.
   * @instance
   */
  bindLayerVisibilityChange : function () {
    this.props.model.get('layerCollection').each((layer) => {
      layer.on("change:visible", () => {
        //this.update(); // causes a search to be done everytime a layer's visibility changes. Then it only searches in adresser and fastighet
      });
    });
  },

  /**
   * Set search filter and perform a search.
   * @instance
   * @param {string} type
   * @param {object} event
   *
   */
  setFilter: function (event) {
    this.props.model.set('filter', event.target.value);
    this.search();
  },

  /**
   * Render the search options component.
   * @instance
   * @return {external:ReactElement}
   */
  renderOptions: function () {
    var settings = this.props.model.get('settings')
    ,   sources = this.props.model.get('sources')
    ;
    return (
      <div>
        <div>
          <span>Sök: </span>&nbsp;
          <select value={this.props.model.get('filter')} onChange={(e) => { this.setFilter(e) }}>
            <option value="*">--  Alla  --</option>
            {
              (() => {
                return sources.map((wfslayer, i) => {
                  return (
                    <option key={i} value={wfslayer.caption}>
                      {wfslayer.caption}
                    </option>
                  )
                })
              })()
            }
          </select>
        </div>
      </div>
    );
  },

  onChangeDisplayPopup: function (e) {
    this.props.model.set("displayPopup", e.target.checked);
  },

  exportSelected: function(type) {
    this.props.model.export(type);
  },

  /**
   * Render the result component.
   * @instance
   * @return {external:ReactElement}
   */
  renderResults: function () {
    var groups = this.props.model.get('items');
    return (
      <div className="search-results" key="search-results">
        <h3>Sökresultat <span className="pull-right btn btn-default" onClick={() => {this.clear()}} id="snabbsokRensa">Rensa</span></h3>
        <div>
          <input type="checkbox" id="display-popup" ref="displayPopup" onChange={(e) => {this.onChangeDisplayPopup(e)}} checked={this.state.displayPopup}></input>
          <label htmlFor="display-popup">Visa information</label>
        </div>
        <div className="result-list">
        {
          (() => {
            if (groups && groups.length > 0) {
              if (this.state.minimized) {
                return (
                  <div>
                    <button className="btn btn-link"onClick={() => { this.setState({ minimized: false }) }}>Visa resultat</button>
                  </div>
                );
              }
              return groups.map((item, i) => {
                var id = "group-" + i;
                return (
                  <SearchResultGroup
                        id={id}
                        key={id}
                        result={item}
                        numGroups={groups.length}
                        model={this.props.model}
                        parentView={this}
                        map={this.props.model.get('map')} />
                );
              });
            } else {
              return (<div>Sökningen gav inget resultat.</div>);
            }
          })()
        }
        </div>
      </div>

    );
  },

  /**
   * Render the panel component.
   * @instance
   * @return {external:ReactElement}
   */
  render: function () {

    var results = null
    ,   value = this.props.model.get('value')
    ,   showResults = this.props.model.shouldRenderResult()
    ,   options = this.renderOptions();


    if (showResults) {

      if (this.state.loading) {
        results = (
          <p>
            <span className="sr-only">Laddar...</span>
            <i className="fa fa-refresh fa-spin fa-3x fa-fw"></i>
          </p>
        );
      } else {
        if ((this.refs.searchInput &&
             this.refs.searchInput.value.length > 3) ||
             this.props.model.get('force')) {
               results = this.renderResults();
        } else {
          results = (
            <p className="alert alert-info" id="alertSearchbar">
              Skriv minst fyra tecken för att påbörja automatisk sökning. Tryck på <b>retur</b> för att forcera en sökning.
            </p>
          )
        }

      }
    }

    var search_on_input = (event) => {
      this.props.model.set('filter', '*');
      this.value = event.target.value;
      this.props.model.set('value', this.value);
      this.setState({
        value: this.value,
        minimized: false,
        force: false
      });
      this.props.model.set('force', false);
      if (this.refs.searchInput.value.length > 3) {
        this.search();
      } else {
        this.setState({
          loading: false
        });
      }
    };

    return (
      <div className="search-tools">
        <div className="form-group">
          <div className="input-group">
            <div className="input-group-addon">
              <i className="fa fa-search"></i>
            </div>
            <input
              id="searchbar-input-field"
              type="text"
              ref="searchInput"
              className="form-control"
              placeholder="Ange adress eller fastighetsbeteckning.."
              value={value}
              onKeyDown={this.handleKeyDown}
              onChange={search_on_input} />
          </div>
        </div>
        {results}
      </div>
    );
  }
};
/**
 *
 * Ta bort sök alternative ovanför {results} above
 *         <div className="search-options">{options}</div>
 */



/**
 * SearchBarView module.<br>
 * Use <code>require('components/searchbar')</code> for instantiation.
 * @module SearchBarView-module
 * @returns {SearchBarView}
 */
module.exports = React.createClass(SearchBarView);
