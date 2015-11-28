var color = {},
    lines = {};
var MetroData = MetroData || {},
    initialSelection = [];
$.ajax({
  url: 'http://api.wmata.com/Rail.svc/json/jLines',
  dataType: 'jsonp',
  data: {
    'api_key': config.wmataToken
  },
  success: function(data){
    data.Lines.forEach(function(d,i) {
        color[d.LineCode] = d.DisplayName.toLowerCase();
        lines[d.LineCode] = d.DisplayName + " Line";
        initialSelection.push(d.LineCode);
    });
  }
});
$.ajax({
  url: 'http://api.wmata.com/Rail.svc/json/jStations',
  dataType: 'jsonp',
  data: {
    'api_key': config.wmataToken
  },
  success: function(data){
    MetroData.Stations = data.Stations;
    var map = L.mapbox.map('map', 'mapbox.light') // future: try mapbox.dark and mapbox.pencil
        .setView([38.914, -77.075], 12);
    voronoiMap(map, MetroData.Stations, d3.set(initialSelection));
  }
});
function changeLines(d,i){
    console.log(d,i);
}

function voronoiMap(map, data, initialSelections){

  var pointTypes = d3.map(),
      points = [],
      lastSelectedPoint;

  var voronoi = d3.geom.voronoi()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; });

  var selectPoint = function() {
    d3.selectAll('.selected').classed('selected', false);

    var cell = d3.select(this),
        point = cell.datum();

    lastSelectedPoint = point;
    cell.classed('selected', true);

    d3.select('#selected h1')
      .html('')
      .append('a')
        .text(point.name)
        .attr('href', point.url)
        .attr('target', '_blank')
  }

  var drawPointTypeSelection = function() {
    console.log(pointTypes);
    showHide('#selections')
    labels = d3.select('#toggles').selectAll('input')
      .data(pointTypes.values())
      .enter().append("label");

    labels.append("input")
      .attr('type', 'checkbox')
      .property('checked', function(d) {
        return initialSelections === undefined || initialSelections.has(d.type)
      })
      .attr("value", function(d) { return d.type; })
      .on("change", drawWithLoading);

    labels.append("span")
      .attr('class', 'key')
      .style('background-color', function(d) { return d.color; });

    labels.append("span")
      .text(function(d) { return d.type; });
  }

  var selectedTypes = function() {
    return d3.selectAll('#toggles input[type=checkbox]')[0].filter(function(elem) {
      return elem.checked;
    }).map(function(elem) {
      return elem.value;
    })
  }

  var pointsFilteredToSelectedTypes = function() {
    var currentSelectedTypes = d3.set(selectedTypes());
    return points.filter(function(item){
        return currentSelectedTypes.has(item.LineCode1) || currentSelectedTypes.has(item.LineCode2) || currentSelectedTypes.has(item.LineCode3) || currentSelectedTypes.has(item.LineCode4);
    });
  }

  var drawWithLoading = function(e){
    d3.select('#loading').classed('visible', true);
    if (e && e.type == 'viewreset') {
      d3.select('#overlay').remove();
    }
    setTimeout(function(){
      draw();
      d3.select('#loading').classed('visible', false);
    }, 0);
  }

  var draw = function() {
    console.log("DRAW");
    d3.select('#overlay').remove();

    var bounds = map.getBounds(),
        topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
        bottomRight = map.latLngToLayerPoint(bounds.getSouthEast()),
        existing = d3.set(),
        drawLimit = bounds.pad(0.4);

    filteredPoints = pointsFilteredToSelectedTypes().filter(function(d) {
        // console.log(d);
      var latlng = new L.LatLng(d.Lat, d.Lon);

      if (!drawLimit.contains(latlng)) { return false };

      var point = map.latLngToLayerPoint(latlng);

      key = point.toString();
      if (existing.has(key)) { return false };
      existing.add(key);

      d.x = point.x;
      d.y = point.y;
      return true;
    });

    voronoi(filteredPoints).forEach(function(d) { d.point.cell = d; });


    var svg = d3.select(map.getPanes().overlayPane).append("svg")
      .attr('id', 'overlay')
      .attr("class", "leaflet-zoom-hide")
      .style("width", map.getSize().x + 'px')
      .style("height", map.getSize().y + 'px')
      .style("margin-left", topLeft.x + "px")
      .style("margin-top", topLeft.y + "px");

    var g = svg.append("g")
      .attr("transform", "translate(" + (-topLeft.x) + "," + (-topLeft.y) + ")");

    var svgPoints = g.attr("class", "points")
      .selectAll("g")
        .data(filteredPoints)
      .enter().append("g")
        .attr("class", "point");

    var buildPathFromPoint = function(point) {
      return "M" + point.cell.join("L") + "Z";
    }

    svgPoints.append("path")
      .attr("class", "point-cell")
      .attr("d", buildPathFromPoint)
      .on('click', selectPoint)
      .classed("selected", function(d) { return lastSelectedPoint == d} );

    svgPoints.append("circle")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .style('fill', function(d) {
        var currentSelectedTypes = d3.set(selectedTypes());
        return currentSelectedTypes.has(d.LineCode1) ? color[d.LineCode1] :
            currentSelectedTypes.has(d.LineCode2) ? color[d.LineCode2] :
            currentSelectedTypes.has(d.LineCode3) ? color[d.LineCode3] :
            currentSelectedTypes.has(d.LineCode4) ? color[d.LineCode4] :
            "black";
        })
      .attr("r", 4);
  }

  var mapLayer = {
    onAdd: function(map) {
      map.on('viewreset moveend', drawWithLoading);
      drawWithLoading();
    }
  };

  map.on('ready', function() {
    // d3.csv(url, function(csv) {
      points = data;
      console.log(points);
      points.forEach(function(point) {
        // console.log(point);
        pointTypes.set(point.LineCode1, {type: point.LineCode1, color: color[point.LineCode1]});
      })
      drawPointTypeSelection();
      map.addLayer(mapLayer);
    // })
  });
}

function showHide(selector) {
  d3.select(selector).select('.hide').on('click', function(){
    d3.select(selector)
      .classed('visible', false)
      .classed('hidden', true);
  });

  d3.select(selector).select('.show').on('click', function(){
    d3.select(selector)
      .classed('visible', true)
      .classed('hidden', false);
  });
}

L.mapbox.accessToken = config.mapboxToken;
