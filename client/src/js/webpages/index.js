

goog.provide('app.wp.index');

goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.format.TopoJSON');
goog.require('ol.layer.Vector');
goog.require('ol.proj');
goog.require('ol.source.TileVector');
goog.require('ol.style.Fill');
goog.require('ol.style.Stroke');
goog.require('ol.style.Style');
goog.require('ol.source.Vector');
goog.require('ol.style.Circle');
goog.require('ol.style.Style')
goog.require('ol.format.GeoJSON');
goog.require('ol.tilegrid.TileGrid');


/**
 * The main function.
 */
 app.wp.index = function() {

 var image = new ol.style.Circle({
    radius: 5,
    fill: null,
    stroke: new ol.style.Stroke({color: 'red', width: 1})
  });

  var styles = {
    'Point': [new ol.style.Style({
      image: image
    })],
    'LineString': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'green',
        width: 1
      })
    })],
    'MultiLineString': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'green',
        width: 1
      })
    })],
    'MultiPoint': [new ol.style.Style({
      image: image
    })],
    'MultiPolygon': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'yellow',
        width: 3
      }),
      fill: new ol.style.Fill({
        color: 'rgba(0, 155, 0, 0.3)'
      })
    })],
    'Polygon': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'blue',
        lineDash: [4],
        width: 3
      }),
      fill: new ol.style.Fill({
        color: 'rgba(155, 0, 155, 0.3)'
      })
    })],
    'GeometryCollection': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'magenta',
        width: 2
      }),
      fill: new ol.style.Fill({
        color: 'magenta'
      }),
      image: new ol.style.Circle({
        radius: 10,
        fill: null,
        stroke: new ol.style.Stroke({
          color: 'magenta'
        })
      })
    })],
    'Circle': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'red',
        width: 2
      }),
      fill: new ol.style.Fill({
        color: 'rgba(255,0,0,0.2)'
      })
    })]
  };

  var styleFunction = function(feature, resolution) {
    return styles[feature.getGeometry().getType()];
  };

  //pomucka pro lokalizaci polohy v mape pri nenacteni ostatnich vrstev
  var geojsonObject = {
    'type': 'FeatureCollection',
    'crs': {
      'type': 'name',
      'properties': {
        'name': 'EPSG:4326'
      }
    },
    'features': [
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [14.46418, 50.0756]
        }
      }
    ]
  };

  var vectorLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
          features: (new ol.format.GeoJSON()).readFeatures( geojsonObject, {featureProjection: 'EPSG:3857'})
      }),
      style: styleFunction
  });

  var geojsonFormat = new ol.format.GeoJSON();

  /**
   * [getGeojson description]
   * @param  {ol.feature} feature [description]
   * @return {string}         [description]
   */
  var getGeojson = function(feature){
      return geojsonFormat.writeFeature(feature, {featureProjection: 'EPSG:3857'});
  };


  var arrToMerge = [];

  setTimeout(function(){
    effectiveMerging();
  }, 1500);

  var effectiveMerging = function(){
    var emptyQueue = function(){
      var data = {};
      data.features = [];

      for (var i = 0; i < arrToMerge.length; i++) {
        var dlazdice = JSON.parse(arrToMerge.shift());
        var geojsonTile = topojson.feature(dlazdice, dlazdice.objects.vectile);
        if(geojsonTile.features.length > 0){
          for (var i = 0; i < geojsonTile.features.length; i++) {
            data.features.push(geojsonTile.features[i]);
          };
          
          mergeData(data);
        }
      }

      effectiveMerging();

    };

    if(arrToMerge < 3){
      setTimeout(function(){
        emptyQueue();
      }, 400);
    } else {
      emptyQueue();
    }
  };

  /**
   * [successFunction description]
   * @param  {string} data [description]
   * @return {undefined}      [description]
   */
  var successFunction = function(data){
    arrToMerge.push(data);
  };

  var errorFunction = function(error){
    console.log("Error: ", error);
  };

  var geojsonFeatureToLayer = function( feature, layer ) {
      var f = new ol.format.GeoJSON();
      var olFeature =  f.readFeature( feature, {featureProjection: 'EPSG:3857'});
      layer.getSource().addFeature(olFeature);
  };

  var removeFeatures = function(features){
      for (var i = 0; i < features.length; i++) {
          vectorLayer.getSource().removeFeature(features[i]);
      };
  };

  var topojsonVTLayer = new ol.layer.Vector({
      preload: Infinity,
    source: new ol.source.TileVector({
      format: new ol.format.TopoJSON(),
      tileLoadFunction: function(url){
          $.ajax({url: url, success: successFunction, error: errorFunction});
      },
      url: 'http://localhost:9001/public/tiles/parcels/{z}/{x}/{y}.topojson',
      //url: 'http://localhost:9001/public/tiles/delaunyho/{z}/{x}/{y}.topojson',
      //url: 'http://localhost:9001/public/tiles/hexagon/{z}/{x}/{y}.topojson',
      //url: 'http://localhost:9001/public/okresy//{z}/{x}/{y}.topojson',
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        maxZoom: 23
      })  
    })
  });

   var mergeData = function(data) {    
      var mergedIds = [];

      var features = data.features;
      for (var i = 0; i < features.length; i++) {
          if(mergedIds.indexOf(features[i].properties.id) === -1){
              var mId = features[i].properties.id;
              var nameId = features[i].properties.nazev;
              
              if(mId == 'undefined'){
                  console.log("undefined identificator -- unable to merge");
              }

              mergedIds.push(mId);
              var featuresToDelete = [];

              /**
               * [mSegments description] features for merge
               * @type {Array}
               */
               var mfeatures = [];

               mfeatures.push(features[i]);

              //najdi vsechny dalsi se stejnym id v features.data
              for(var j = 0; j < features.length; j++){
                  if(features[i] !== features[j] && features[i].properties.id === features[j].properties.id){
                      mfeatures.push(features[j]);  //pridej segment
                  }
              }

              //prohledej ostatni features
              var featuresMap = vectorLayer.getSource().getFeatures();
              for(var l = 0; l < featuresMap.length; l++){
                  if(featuresMap[l].get('id') == mId){ 
                      var f = getGeojson(featuresMap[l]);
                      mfeatures.push(JSON.parse(f));
                      featuresToDelete.push(featuresMap[l]);
                  }
              }

              try {

                if(mfeatures.length > 1){
                  var fc = turf.featurecollection(mfeatures);
                  var merged = turf.merge(fc);
                  geojsonFeatureToLayer(merged, vectorLayer);
                } else if(mfeatures.length == 1){
                  geojsonFeatureToLayer(mfeatures[0], vectorLayer);
                }


              } catch (erro){
                  console.log("ERROR - merge data: ", erro);
                  break;
              } 

              removeFeatures(featuresToDelete);
          }
      }
  };


  var map = new ol.Map({
    layers: [topojsonVTLayer, vectorLayer],
    renderer: 'canvas',
    target: document.getElementById('map'),
    view: new ol.View({
      //center: ol.proj.fromLonLat([14.46418, 50.0756]),
      center: ol.proj.fromLonLat([15.2, 49.43]),
      projection: 'EPSG:3857',
      maxZoom: 22,
      zoom: 17
    })
  });

};

goog.exportSymbol('main', app.wp.index);
