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

var ToolModel = require('tools/tool');
var HighlightLayer = require('layers/highlightlayer');

var FeatureModel = Backbone.Model.extend({
  defaults:{
    feature: undefined,
    information: undefined,
    layer: undefined
  },

  initialize: function () {
    this.id = this.cid;
  }
});

var FeatureCollection = Backbone.Collection.extend({
  model: FeatureModel
});

/**
 * @typedef {Object} InfoClickModel~InfoClickModelProperties
 * @property {string} type - Default: infoclick
 * @property {string} panel - Default: InfoPanel
 * @property {boolean} visible - Default: false
 * @property {external:"ol.map"} map
 * @property {string} wmsCallbackName - Default: LoadWmsFeatureInfo
 * @property {external:"ol.feature"[]} features
 * @property {external:"ol.feature"} selectedFeature
 * @property {external:"ol.layer"} highlightLayer
 * @property {string} markerImg - Default: "assets/icons/marker.png"
 */
var InfoClickModelProperties = {
  type: 'infoclick',
  panel: 'InfoPanel',
  visible: false,
  map: undefined,
  wmsCallbackName: "LoadWmsFeatureInfo",
  features: undefined,
  selectedFeature: undefined,
  highlightLayer: undefined,
  markerImg: "assets/ico" +
  "ns/marker.png",
  anchor: [
    16,
    16
  ],
  imgSize: [
    32,
    32
  ],
  displayPopup: true,
  popupOffsetY: 0
};

/**
 * Prototype for creating an infoclick model.
 * @class
 * @augments {external:"Backbone.Model"}
 * @param {InfoClickModel~InfoClickModelProperties} options - Default options
 */
var InfoClickModel = {
  /**
   * @instance
   * @property {InfoClickModel~InfoClickModelProperties} defaults - Default settings
   */
  defaults: InfoClickModelProperties,

  initialize: function (options) {
    ToolModel.prototype.initialize.call(this);
    this.initialState = options;

    this.set('highlightLayer', new HighlightLayer({
      anchor: this.get('anchor'),
      imgSize: this.get('imgSize'),
      markerImg: this.get('markerImg')
    }));
    this.set("features", new FeatureCollection());
    this.get("features").on("add", (feature, collection) => {
      if (collection.length === 1) {
        this.set('selectedFeature', feature);
      }
    });
    this.on("change:selectedFeature", (sender, feature) => {
      setTimeout(() => {
        if (this.get('visible')) {
          this.highlightFeature(feature);
        }
      }, 0);
    });
  },

  configure: function (shell) {
    var map = shell.getMap().getMap();

    this.layerCollection = shell.getLayerCollection();
    this.map = map;
    this.map.on('singleclick', (event) => {
      try {
        setTimeout(a => {
          if (!map.get('clickLock') && !event.filty) {
            this.onMapPointer(event);
          }
        }, 0);
      } catch (e) {}
    });
    this.set('map', this.map);
    this.map.addLayer(this.get('highlightLayer').layer);
    $('#popup-closer').click(() => {
      this.clearHighlight();
    });
  },

  /**
   * Handle when users clicks anywhere in the map.
   * Support for WMS layers and vector layers.
   * @instance
   * @param {object} event - Mouse event
   */
  onMapPointer: function (event) {
    var wmsLayers = this.layerCollection.filter((layer) => {
          return (layer.get("type") === "wms" || layer.get("type") === "arcgis") &&
                 layer.get("queryable") &&
                 layer.getVisible();
        })
    ,   projection = this.map.getView().getProjection().getCode()
    ,   resolution = this.map.getView().getResolution()
    ,   infos = []
    ,   promises = []
    ;

    this.layerOrder = {};
    this.get("features").reset();

    this.map.getLayers().forEach((layer, i) => {
      this.layerOrder[layer.get('name')] = i;
    });

    this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
      if (layer && layer.get('name') && (layer.get('queryable') !== false)) {
        if (
          layer.get('name') !== 'preview-layer' &&
          layer.get('name') !== 'highlight-wms'
        ) {
          promises.push(new Promise((resolve, reject) => {
              features = [feature];
              _.each(features, (feature) => {
                  this.addInformation(feature, layer, (featureInfo) => {
                    if (featureInfo) {
                      infos.push(featureInfo);
                    }
                    resolve();
                  });
              });
          }));
        }
      }
    });

    wmsLayers.forEach((wmsLayer, index) => {
      wmsLayer.index = index;
      promises.push(new Promise((resolve, reject) => {
        wmsLayer.getFeatureInformation({
          coordinate: event.coordinate,
          resolution: resolution,
          projection: projection,
          error: message => {
            resolve();
          },
          success: (features, layer) => {
      var arr = new Array();
            if (Array.isArray(features) && features.length > 0) {
              features.forEach(feature => {
                this.addInformation(feature, wmsLayer, (featureInfo) => {
                    try{ // TODO: solkarta
                      if (wmsLayer.attributes.caption === "Solkartan" && featureInfo.feature.get('geometry') === null){
                        return;
                      }
                      if (wmsLayer.attributes.caption === "Geografiska områden" && featureInfo.feature.get('omrade') === null){
                        return;
                      }
                      if (wmsLayer.attributes.caption === "Stadsutvecklingsprojektet"){
                        arr.push(featureInfo.feature.get('id'));
                          for(i=0; i<arr.length; i++) {
                            if (arr.slice(0,i-1).includes(featureInfo.feature.get('id'))) {
                              return;
                            }
                          }

                    }

                    } catch (e){
                    }

                  if (featureInfo) {
                    infos.push(featureInfo);
                  }
                  resolve();
                });
              });
            } else {
              resolve();
            }
          }
        });
      }));
    });

    this.set('loadFinished', false);

    Promise.all(promises).then(() => {
      infos.sort((a, b) => {
        var s1 = a.information.layerindex
        ,   s2 = b.information.layerindex
        ;

        // Detaljplaner should be sorted on antagen instead of layerindex
        if(typeof a.information.antagen !== "undefined" &&
        typeof b.information.antagen !== "undefined"){
          s1 = a.information.antagen;
          s2 = b.information.antagen;
        }

        return s1 === s2 ? 0 : s1 < s2 ? 1 : -1;
      });

      infos.forEach(info => {
        this.get('features').add(info);
      });

      this.set('loadFinished', true);
      if (this.get('displayPopup')) {
        this.togglePopup(infos, event.coordinate);
      } else {
        this.togglePanel()
      }

      if (infos.length === 0) {
        this.set('selectedFeature', undefined);
        this.get('map').getOverlayById('popup-0').setPosition(undefined);
        this.clearHighlight();
      }

    });
  },

  /**
   * Convert object to markdown
   * @instance
   * @param {object} object to transform
   * @return {string} markdown
   */
  objectAsMarkdown: function (o) {
    return Object
      .keys(o)
      .reduce((str, next, index, arr) =>
        /^geom$|^geometry$|^the_geom$/.test(arr[index]) ?
        str : str + `**${arr[index]}**: ${o[arr[index]]}\r`
      , "");
  },

  /**
   * Check if this device supports touch.
   * @instance
   */
  isTouchDevice: function () {
    try {
      document.createEvent("TouchEvent");
      return true;
    } catch(e) {
      return false;
    }
  },

  /**
   * Enable scroll on infowindow
   * @instance
   * @param {DOMelement} elm
   */
  enableScroll: function (elm) {
    if (this.isTouchDevice()){
      var scrollStartPos = 0;
      elm.addEventListener("touchstart", function(event) {
        scrollStartPos = this.scrollTop + event.touches[0].pageY;
      }, false);
      elm.addEventListener("touchmove", function(event) {
        this.scrollTop = scrollStartPos - event.touches[0].pageY;
      }, false);
    }
  },

  /**
   * Toogle popup
   * @instance
   * @param {array} infos
   * @param {array} coordinate
   */
  togglePopup: function(infos, coordinate) {

    const ovl = this.get('map').getOverlayById('popup-0');

    function isPoint (coord) {
      if (coord.length === 1) {
        coord = coord[0];
      }
      return (
        (coord.length === 2 ||  coord.length === 3) &&
        typeof coord[0] === "number" &&
        typeof coord[1] === "number"
      )
      ? [coord[0], coord[1]]
      : false;
    }

    infos.forEach((info, i) => {
        function display(index, inf) {

          var coords    = inf.feature.getGeometry() ? inf.feature.getGeometry().getCoordinates() : false
          ,   position  = coordinate
          ,   feature   = new Backbone.Model()
          ,   infobox   = $('<div></div>')
          ,   caption   = $(`<div class="popup-navigation"> ${index + 1} av ${infos.length} </div>`)
          ,   next      = $('<span class="fa fa-btn fa-arrow-circle-o-right"></span>')
          ,   prev      = $('<span class="fa fa-btn fa-arrow-circle-o-left"></span>')
          ,   title     = $(`<div class="popup-title">${inf.information.caption}</div>`)
          ,   content   = $(`<div id="popup-content-text"></div>`)
          ,   markdown  = ""
          ,   offsetY   = 0
          ,   html      = "";

          inf.layer.once('change:visible', () => {
            ovl.setPosition(undefined);
            this.clearHighlight();
          });

          if (typeof inf.information.information === "object") {
            markdown = this.objectAsMarkdown(inf.information.information);
          } else {
            markdown = inf.information.information;
          }
          html = marked(markdown, { sanitize: false, gfm: true, breaks: true });
          content.html(html);

          if (coords = isPoint(coords)) {
            position = coords;
          }

          caption.prepend(prev);
          caption.append(next);
          if (infos.length > 1) {
            infobox.append(caption);
          }

          infobox.append(title, content);
          $('#popup-content').show().html(infobox);

          if (this.isTouchDevice()) {
            this.enableScroll($('#popup-content-text')[0]);
            $('#popup-content-text').scrollTop(0);
          }

          if (isPoint(coords)) {
            offsetY = this.get('popupOffsetY');
          }

          ovl.setPosition(position);
          ovl.setOffset([0, offsetY]);

          $(ovl.getElement()).hide().fadeIn(0);

          Object.keys(inf).forEach(key => {
            feature.set(key, inf[key]);
          });
          this.highlightFeature(feature);

          prev.click(() => {
            if (infos[index - 1]) {
              display.call(this, index - 1, infos[index - 1]);
            }
          });
          next.click(() => {
            if (infos[index + 1]) {
              display.call(this, index + 1, infos[index + 1]);
            }
          });
        }
        if (i === 0) {
          display.call(this, i, info);
        }
    });
  },

  /**
   * Add feature to hit list.
   * @instance
   * @param {external:"ol.feature"} feature
   * @param {external:"ol.layer"} layer
   * @param {function} callback to invoke when information is added
   */
  addInformation: function (feature, layer, callback) {

    if (layer.get('name') === 'draw-layer') {
      callback(false);
      return;
    }

    var layerModel = this.layerCollection.findWhere({ name: layer.get("name") })
    ,   layerindex = -1
    ,   properties
    ,   information
    ,   iconUrl = feature.get('iconUrl') || ''
    ,   antagen = false
    ;
   
    properties = feature.getProperties();
    information = layerModel && layerModel.get("information") || "";

    if (feature.infobox) {
      information = feature.infobox;
      information = information.replace(/export:/g, '');
    }
    // Detaljplaner:300(idNummer)
    if(layer.get("name") !== "300") {
      if (information && typeof information === "string") {
        (information.match(/\{.*?\}\s?/g) || []).forEach(property => {
          function lookup(o, s)
        {
          s = s.replace('{', '')
            .replace('}', '')
            .trim()
            .split('.');

          switch (s.length) {
            case 1:
              return o[s[0]] || "";
            case 2:
              return o[s[0]][s[1]] || "";
            case 3:
              return o[s[0]][s[1]][s[2]] || "";
          }
        }
        information = information.replace(property, lookup(properties, property));
      });
      }
    }else {
      //Allow multiple URLs "Detaljplaner"
      if (information && typeof information === "string") {
        (information.match(/\{.*?\}\s?/g) || []).forEach(property => {
          function lookup(o, s)
        {
          s = s.replace('{', '')
            .replace('}', '')
            .trim()
            .split('.');

          switch (s.length) {
            case 1:
              return o[s[0]] || "";
            case 2:
              return o[s[0]][s[1]] || "";
            case 3:
              return o[s[0]][s[1]][s[2]] || "";
          }
        }
        if(property.includes("{antagen}")){
          antagen = lookup(properties, property);
        }
        if (property.substring(1, 4) == "url" && lookup(properties, property).length > 0) {
            if(property.substring(5,6) == ""){
              var val = '<tr><td> <strong>PDF-dokument</strong> </td>\n' +
                '<td> <a href=\"' + lookup(properties, property) + '\" target=\"_blank\"> Öppna detaljplanen i nytt fönster </a> </td></tr>'
            }else{
              var val = '<tr><td></td>\n' +
              '<td> <a href=\"' + lookup(properties, property) + '\" target=\"_blank\">del ' + property.substring(5, 6) + '</a> </td></tr>'
            }

          information = information.replace(property, val);
        } else {
          information = information.replace(property, lookup(properties, property));
        }

      });
      }
    }

    if (!layerModel) {
      layerIndex = 999;
    } else {
      layerindex = this.layerOrder.hasOwnProperty(layerModel.getName())
        ? this.layerOrder[layerModel.getName()]
        : 999;
    }

    var retObj = {
      feature: feature,
      layer: layer,
      information: {
        caption: layerModel && layerModel.getCaption() || "Sökträff",
        layerindex: layerindex,
        information: information || properties,
        iconUrl: iconUrl,
      }
    };

    // used for sorting detaljplaner
    if(antagen !== false){
      retObj.information.antagen = antagen;
    }

    callback(retObj);
  },

  /**
   * Toggle the panel
   * @instance
   */
  togglePanel: function () {
    if (this.get("features").length > 0) {
      this.set('r', Math.round(Math.random() * 1E12));
      this.set('toggled', true);
      this.set('visible', true);
    } else if (this.get("navigation").get("activePanelType") === this.get("panel")) {
      this.set('visible', false);
    }
  },

  /**
   * Create and add feature to highlight layer.
   * @instance
   * @param {external:"ol.feature"} feature
   */
  createHighlightFeature: function (feature) {
    var layer = this.get('highlightLayer');
    layer.clearHighlight();
    this.reorderLayers(feature);
    layer.addHighlight(feature.get('feature').clone());
    layer.setSelectedLayer(feature.get('layer'));
  },

  /**
   * Adds the highlight layer at correct draw order in the map.
   * @instance
   * @param {external:"ol.feature"}
   */
  reorderLayers: function (feature) {

    var layerCollection = this.get('map').getLayers()
    ,   featureInfo = feature.get('information')
    ,   selectedLayer = feature.get('layer')
    ,   insertIndex;

    if (selectedLayer && this.layerOrder.hasOwnProperty(selectedLayer.get('name'))) {
      insertIndex = this.layerOrder[selectedLayer.get('name')];
      insertIndex += 1;
    }

    if (insertIndex) {
      layerCollection.remove(this.get('highlightLayer').getLayer());
      layerCollection.insertAt(insertIndex, this.get('highlightLayer').getLayer());
      insertIndex = undefined;
    }

  },

  /**
   * Highlight feature.
   * @instance
   * @param {external:"ol.feature"} feature
   */
  highlightFeature: function (feature) {
    if (feature) {
      this.createHighlightFeature(feature);
    } else {
      this.get('highlightLayer').clearHighlight();
    }
  },

  /**
   * Highlight feature.
   * @instance
   * @param {external:"ol.feature"} feature
   */
  clearHighlight: function () {
     this.get('highlightLayer').clearHighlight();
  }

};

/**
 * InfoClick model module.<br>s
 * Use <code>require('models/infoclick')</code> for instantiation.
 * @module InfoClickModel-module
 * @returns {InfoClickModel}
 */
module.exports = ToolModel.extend(InfoClickModel);
