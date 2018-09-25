var Panel = require('views/panel');
var deleteMarkerEnabled = false;
/**
 * @class
 */
var FirSelectionPanelView = {
    /**
     * Get initial state.
     * @instance
     * @return {object}
     */
    getInitialState: function () {
        return {
            activeTool: this.props.model.get('activeTool')
        };
    },

    /**
     * Triggered when the component is successfully mounted into the DOM.
     * @instance
     */
    componentWillMount: function () {
        this.props.model.on('change:activeTool', () => {
            this.setState({
                activeTool: this.props.model.get('activeTool')
            });
        });
    },

    componentWillUnmount () {
        this.props.model.setActiveTool('');
        this.props.model.off('change:activeTool');
    },

    activateTool: function (name) {
        if (this.props.model.get('activeTool') === name) {
            this.props.model.setActiveTool(undefined);
        } else {
            this.props.model.setActiveTool(name);
        }
    },

    finishedDrawing: function() {
        this.props.model.setActiveTool(undefined);
    },

    /*deleteMarker: function(event) {
        console.log("deleteMarker");
        this.props.model.setActiveTool(undefined);
        console.log("setActiveTool", this.props.model.setActiveTool(undefined));

        // Should add a singleclick handler for deletion
        // get the object detail
        var map = this.props.model.get("map");

        // get the object from highlightResultLayer
        var source = this.props.model.get("highlightLayer").get("source");
        console.log("source i deleteMarker", source);
        console.log("map.forEachFeatureAtPixel", map.forEachFeatureAtPixel);
        console.log("pixelFromClickedOnMap", event);
        map.forEachFeatureAtPixel(event.pixel, function(feature, layer){
            console.log("feature", feature);
            if (layer.get("caption") === "FIRSökes"){
                source.removeFeature(feature);

            }
        });
    },*/
    deleteMarker: function(){
        var map = this.props.model.get("map");
        map.on('singleclick', this.firRemoveSelected);
    },

    firRemoveSelected: function(event){
        var map = this.props.model.get("map");
        var source = this.props.model.get("highlightLayer").get("source");
        console.log("source", source);
        console.log("event", event);
        map.forEachFeatureAtPixel(event.pixel, function(feature, layer){
            console.log("deleteMarkerEnabled",deleteMarkerEnabled);
            if (layer.get("caption") === "search-selection-layer") {
                layer.getSource().removeFeature(feature);
            }
        });
        map.un('singleclick', this.firRemoveSelected);
    },

    getClassNames: function (type) {
        return this.state.activeTool === type
            ? 'btn btn-primary'
            : 'btn btn-default';
    },

    /**
     * Render the view
     * @instance
     * @return {external:ReactElement}
     */
    render: function () {
        var anchor = this.props.model.get('anchor');

        return (
            <div className='selection-toolbar'>
                {/*<div>Sök baserat på markering i kartan</div>*/}
                <div className='btn-group btn-group-lg'>
                    <button onClick={() => this.activateTool('polygonSelection')} type='button' className={this.getClassNames('polygonSelection')} title='Markera efter polygon' >
                        <i className='fa iconmoon-yta icon' />
                    </button>
                    <button onClick={() => this.activateTool('squareSelection')} type='button' className={this.getClassNames('squareSelection')} title='Markera flera objekt' >
                        <i className='fa fa-square-o icon' />
                    </button>
                    <button onClick={() => this.activateTool('lineSelection')} type='button' className={this.getClassNames('lineSelection')} title='Markera efter polygon' >
                        <i className='fa iconmoon-linje icon' />
                    </button>
                    <button onClick={() => this.activateTool('pointSelection')} type='button' className={this.getClassNames('pointSelection')} title='Markera efter polygon' >
                        <i className='fa fa-circle icon' />
                    </button>
                </div>&nbsp;&nbsp;&nbsp;&nbsp;<b>Rita sökområde</b><div></div><br/>

                <div className='btn-group btn-group-lg'>
                    <button onClick={() => this.finishedDrawing()} type='button' className={this.getClassNames('plusSelection')} style={{backgroundColor: "green"}} title='Markera efter polygon' >
                        <i className='fa fa-check fa-0' />&nbsp;<span style={{fontSize: 16}}>Klar</span>
                    </button>
                    <button onClick={this.deleteMarker} type='button' className={this.getClassNames('minusSelection')} title='Ta bort objekt' >
                        <i className='fa fa-trash fa-0' />&nbsp;<span style={{fontSize: 16}}>Radera Objekt</span>
                    </button>
                </div>

            </div>
        );
    }
};

/**
 * SelectionPanelView module.<br>
 * Use <code>require('views/anchorpanel')</code> for instantiation.
 * @module SelectionPanelView-module
 * @returns {SelectionPanelView}
 */
module.exports = React.createClass(FirSelectionPanelView);