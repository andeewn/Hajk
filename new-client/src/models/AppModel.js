import Plugin from "./Plugin.js";
import ConfigMapper from "./../utils/ConfigMapper.js";
import CoordinateSystemLoader from "./../utils/CoordinateSystemLoader.js";
import { isMobile } from "./../utils/IsMobile.js";
// import ArcGISLayer from "./layers/ArcGISLayer.js";
// import DataLayer from "./layers/DataLayer.js";
import WMSLayer from "./layers/WMSLayer.js";
import WMTSLayer from "./layers/WMTSLayer.js";
import WFSVectorLayer from "./layers/VectorLayer.js";
import { bindMapClickEvent } from "./Click.js";
import { defaults as defaultInteractions } from "ol/interaction";
import { Map, View } from "ol";
// TODO: Uncomment and ensure they show as expected
//{ Rotate, ScaleLine, Attribution, FullScreen } from "ol/control";
import { register } from "ol/proj/proj4";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Fill, Stroke, Style } from "ol/style.js";

var map;

class AppModel {
  registerPanel(panelComponent) {
    this.panels.push(panelComponent);
  }

  closePanels() {
    this.panels.forEach(panel => {
      panel.closePanel();
    });
  }

  onPanelOpen(currentPanel) {
    this.panels
      .filter(panel => panel !== currentPanel)
      .forEach(panel => {
        if (panel.position === currentPanel.position || isMobile) {
          panel.closePanel();
        }
      });
  }

  /**
   * Initialize new AddModel
   * @param object Config
   * @param Observer observer
   */
  constructor(config, globalObserver, HFetchInstance) {
    console.log("HFetchInstance in AppModel is: ", HFetchInstance);

    this.config = config;
    this.HFetchInstance = HFetchInstance;
    this.globalObserver = globalObserver;

    this.panels = [];
    this.plugins = {};
    this.activeTool = undefined;
    this.coordinateSystemLoader = new CoordinateSystemLoader(
      config.mapConfig.projections
    );
    this.layersFromParams = [];
    register(this.coordinateSystemLoader.getProj4());
  }

  /**
   * Add plugin to this tools property of loaded plugins.
   * @internal
   */
  addPlugin(plugin) {
    this.plugins[plugin.type] = plugin;
  }
  /**
   * Get loaded plugins
   * @returns Array<Plugin>
   */
  getPlugins() {
    return Object.keys(this.plugins).reduce((v, key) => {
      return [...v, this.plugins[key]];
    }, []);
  }
  /**
   * Get plugins that are currently loaded in the toolbar.
   * @returns Array<Plugin>
   */
  getToolbarPlugins() {
    return this.getPlugins()
      .filter(plugin => plugin.options.target === "toolbar")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  /**
   * Check if the search plugin is avaliable and if so return it.
   * @returns Array<Plugin>
   */
  getSearchPlugin() {
    return this.getPlugins().find(plugin => plugin.type === "search");
  }
  /**
   * Dynamically load plugins from the configured plugins folder.
   * Assumed that a folder exists with the same name as the requested plugin.
   * There must also be a file present with the same name as well.
   * @param Array<string> - List of plugins to be loaded.
   * @returns Array<Promise> - List of promises to be resolved for.
   */
  loadPlugins(plugins) {
    var promises = [];
    plugins.forEach(plugin => {
      var prom = import(`../plugins/${plugin}/${plugin}.js`)
        .then(module => {
          const toolConfig =
            this.config.mapConfig.tools.find(
              plug => plug.type.toLowerCase() === plugin.toLowerCase()
            ) || {};

          const toolOptions =
            toolConfig && toolConfig.options ? toolConfig.options : {};

          // Crucial step to ensure that target is passed on as an option.
          // First find out if target has been set in JSON config for plugin.
          // If yes, keep it. Else, default to 'toolbar'.
          const target = toolOptions.hasOwnProperty("target")
            ? toolConfig.options.target
            : "toolbar";
          // Next, pass on this determined target to _options_ array of plugin,
          // and not as a property of the plugin itself.
          toolOptions.target = target;

          const sortOrder = toolConfig.hasOwnProperty("index")
            ? Number(toolConfig.index)
            : 0;

          if (Object.keys(toolConfig).length > 0) {
            this.addPlugin(
              new Plugin({
                map: map,
                app: this,
                type: plugin,
                sortOrder: sortOrder,
                options: toolOptions,
                component: module.default
              })
            );
          }
        })
        .catch(err => {
          console.error(err);
        });
      promises.push(prom);
    });
    return promises;
  }

  /**
   * Initialize open layers map
   * @return {ol.Map} map
   */
  createMap() {
    var config = this.translateConfig();
    map = new Map({
      interactions: defaultInteractions(),
      target: config.map.target,
      layers: [],
      logo: false,
      pil: false,
      controls: [],
      overlays: [],
      view: new View({
        zoom: config.map.zoom,
        units: "m",
        resolutions: config.map.resolutions,
        center: config.map.center,
        projection: config.map.projection,
        extent: config.map.length !== 0 ? config.map.extent : undefined
      })
    });
    setTimeout(() => {
      map.updateSize();
    }, 0);

    if (config.tools.some(tool => tool.type === "infoclick")) {
      bindMapClickEvent(map, this.HFetchInstance, mapClickDataResult => {
        this.globalObserver.publish("mapClick", mapClickDataResult);
      });
    }
    return this;
  }

  getMap() {
    return map;
  }

  clear() {
    this.clearing = true;
    this.highlight(false);
    map
      .getLayers()
      .getArray()
      .forEach(layer => {
        if (
          layer.getProperties &&
          layer.getProperties().layerInfo &&
          layer.getProperties().layerInfo.layerType === "layer"
        ) {
          if (layer.layerType === "group") {
            this.globalObserver.emit("hideLayer", layer);
          } else {
            layer.setVisible(false);
          }
        }
      });
    setTimeout(() => {
      this.clearing = false;
    }, 100);
  }

  addMapLayer(layer) {
    const configMapper = new ConfigMapper(this.config.appConfig.proxy);
    let layerItem, layerConfig;
    switch (layer.type) {
      case "wms":
        layerConfig = configMapper.mapWMSConfig(layer, this.config);
        layerItem = new WMSLayer(
          layerConfig.options,
          this.config.appConfig.proxy
        );
        map.addLayer(layerItem.layer);
        break;
      case "wmts":
        layerConfig = configMapper.mapWMTSConfig(layer, this.config);
        layerItem = new WMTSLayer(
          layerConfig.options,
          this.config.appConfig.proxy,
          map
        );
        map.addLayer(layerItem.layer);
        break;
      case "vector":
        layerConfig = configMapper.mapVectorConfig(layer);
        layerItem = new WFSVectorLayer(
          layerConfig.options,
          this.config.appConfig.proxy,
          map
        );
        map.addLayer(layerItem.layer);
        break;
      // case "arcgis":
      //   layerConfig = configMapper.mapArcGISConfig(layer);
      //   layer = new ArcGISLayer(layerConfig);
      //   break;
      // case "data":
      //   layerConfig = configMapper.mapDataConfig(layer);
      //   layer = new DataLayer(layerConfig);
      //   break;
      default:
        break;
    }
  }

  lookup(layers, type) {
    var matchedLayers = [];
    layers.forEach(layer => {
      var layerConfig = this.config.layersConfig.find(
        lookupLayer => lookupLayer.id === layer.id
      );
      layer.layerType = type;
      // Use the general value for infobox if not present in map config.
      if (layerConfig !== undefined && layerConfig.type === "vector") {
        if (!layer.infobox && layerConfig) {
          layer.infobox = layerConfig.infobox;
        }
      }
      matchedLayers.push({
        ...layerConfig,
        ...layer
      });
    });
    return matchedLayers;
  }

  expand(groups) {
    var result = [];
    groups.forEach(group => {
      result = [...result, ...group.layers];
      if (group.groups) {
        result = [...result, ...this.expand(group.groups)];
      }
    });
    return result;
  }

  flattern(layerSwitcherConfig) {
    var layers = [
      ...this.lookup(layerSwitcherConfig.options.baselayers, "base"),
      ...this.lookup(this.expand(layerSwitcherConfig.options.groups), "layer")
    ];
    layers = layers.reduce((a, b) => {
      a[b["id"]] = b;
      return a;
    }, {});

    return layers;
  }

  addLayers() {
    let layerSwitcherConfig = this.config.mapConfig.tools.find(
      tool => tool.type === "layerswitcher"
    );
    this.layers = this.flattern(layerSwitcherConfig);
    Object.keys(this.layers)
      .sort((a, b) => this.layers[a].drawOrder - this.layers[b].drawOrder)
      .map(sortedKey => this.layers[sortedKey])
      .forEach(layer => {
        if (this.layersFromParams.length > 0) {
          layer.visibleAtStart = this.layersFromParams.some(
            layerId => layerId === layer.id
          );
        }
        this.addMapLayer(layer);
      });

    this.highlightSource = new VectorSource();
    this.highlightLayer = new VectorLayer({
      source: this.highlightSource,
      style: new Style({
        stroke: new Stroke({
          color: "rgba(200, 0, 0, 0.7)",
          width: 4
        }),
        fill: new Fill({
          color: "rgba(255, 0, 0, 0.1)"
        }),
        image: new Icon({
          anchor: [0.5, 1],
          scale: 0.15,
          anchorXUnits: "fraction",
          anchorYUnits: "fraction",
          src: "marker.png"
        })
      })
    });
    map.addLayer(this.highlightLayer);

    return this;
  }

  getCenter(e) {
    return [e[0] + Math.abs(e[2] - e[0]) / 2, e[1] + Math.abs(e[3] - e[1]) / 2];
  }

  highlight(feature) {
    if (this.highlightSource) {
      this.highlightSource.clear();
      if (feature) {
        this.highlightSource.addFeature(feature);
        if (window.innerWidth < 600) {
          let geom = feature.getGeometry();
          map.getView().setCenter(this.getCenter(geom.getExtent()));
        }
      }
    }
  }

  parseQueryParams() {
    var o = {};
    document.location.search
      .replace(/(^\?)/, "")
      .split("&")
      .forEach(param => {
        var a = param.split("=");
        o[a[0]] = a[1];
      });
    return o;
  }

  mergeConfig(a, b) {
    var x = parseFloat(b.x),
      y = parseFloat(b.y),
      z = parseInt(b.z, 10),
      l = undefined;
    if (typeof b.l === "string") {
      l = b.l.split(",");
    }

    if (isNaN(x)) {
      x = a.map.center[0];
    }
    if (isNaN(y)) {
      y = a.map.center[1];
    }
    if (isNaN(z)) {
      z = a.map.zoom;
    }

    a.map.center[0] = x;
    a.map.center[1] = y;
    a.map.zoom = z;

    if (l) {
      this.layersFromParams = l;
    }

    return a;
  }

  getADSpecificSearchLayers() {
    // $.ajax({
    //   url: "/mapservice/config/ADspecificSearch",
    //   method: "GET",
    //   contentType: "application/json",
    //   success: data => {},
    //   error: message => {
    //     callback(message);
    //   }
    // });
  }

  overrideGlobalSearchConfig(searchTool, data) {
    var configSpecificSearchLayers = searchTool.options.layers;
    var searchLayers = data.wfslayers.filter(layer => {
      if (configSpecificSearchLayers.find(x => x.id === layer.id)) {
        return layer;
      } else {
        return undefined;
      }
    });
    return searchLayers;
  }

  translateConfig() {
    if (
      this.config.mapConfig.hasOwnProperty("map") &&
      this.config.mapConfig.map.hasOwnProperty("title")
    ) {
      document.title = this.config.mapConfig.map.title; // TODO: add opt-out in admin to cancel this override behaviour.
    }

    let layerSwitcherTool = this.config.mapConfig.tools.find(tool => {
      return tool.type === "layerswitcher";
    });

    let searchTool = this.config.mapConfig.tools.find(tool => {
      return tool.type === "search";
    });

    let editTool = this.config.mapConfig.tools.find(tool => {
      return tool.type === "edit";
    });

    let layers = {};

    if (layerSwitcherTool) {
      layers.wmslayers = this.config.layersConfig.wmslayers || [];
      layers.wfslayers = this.config.layersConfig.wfslayers || [];
      layers.wfstlayers = this.config.layersConfig.wfstlayers || [];
      layers.wmtslayers = this.config.layersConfig.wmtslayers || [];
      layers.vectorlayers = this.config.layersConfig.vectorlayers || [];
      layers.arcgislayers = this.config.layersConfig.arcgislayers || [];

      layers.wmslayers.forEach(l => (l.type = "wms"));
      layers.wmtslayers.forEach(l => (l.type = "wmts"));
      layers.wfstlayers.forEach(l => (l.type = "edit"));
      layers.vectorlayers.forEach(l => (l.type = "vector"));
      layers.arcgislayers.forEach(l => (l.type = "arcgis"));

      let allLayers = [
        ...layers.wmslayers,
        ...layers.wmtslayers,
        ...layers.vectorlayers,
        ...layers.wfstlayers,
        ...layers.arcgislayers
      ];

      this.config.layersConfig = allLayers;
    }

    if (searchTool) {
      if (searchTool.options.layers === null) {
        searchTool.options.sources = layers.wfslayers;
      } else {
        if (
          searchTool.options.layers &&
          searchTool.options.layers.length !== 0
        ) {
          let wfslayers = this.overrideGlobalSearchConfig(searchTool, layers);
          searchTool.options.sources = wfslayers;
          layers.wfslayers = wfslayers;
        } else {
          searchTool.options.sources = layers.wfslayers;
        }
      }
    }

    if (editTool) {
      editTool.options.sources = layers.wfstlayers;
    }

    return this.mergeConfig(this.config.mapConfig, this.parseQueryParams());
  }
}

export default AppModel;
