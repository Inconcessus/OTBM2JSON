/*
 * Example script of using the otbm2json library
 * Changes all tiles on a map to chessboard pattern in global coordinates
 */

const otbm2json = require("./otbm2json");

const BLACK_TILE = 407;
const WHITE_TILE = 406;

// Read the map data using the otbm2json library
const mapData = otbm2json.read("map.otbm");

// Go over all nodes
mapData.data.nodes.forEach(function(x) {

  x.features.forEach(function(x) {

    if(x.type !== "OTBM_TILE_AREA") return;

    x.tiles.forEach(function(x) {

      if(x.type !== "OTBM_TILE") return;

      // Create a chessboard pattern
      if(x.x % 2 === 0 ^ x.y % 2 === 0) {
        x.tileid = BLACK_TILE;
      } else {
        x.tileid = WHITE_TILE;
      }

    });

  });

});

// Write the output to OTBM using the library
otbm2json.write("out.otbm", mapData);
