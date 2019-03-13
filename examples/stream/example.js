/*
 * Example script of using the otbm2json library
 * Changes all tiles on a map to chessboard pattern in global coordinates
 */

const otbm2json = require("../../otbm2json");

const WHITE_TILE = 100;
const BLACK_TILE = 100;

// Transformation stream input, output, transformation function
otbm2json.transformOTBM("void.otbm", "chess.otbm", transformation);

function transformation(feature) {

  /*
   * Function transFunc
   * All features are passed through this function and can be modified
   * Make sure to modify the object here and return the feature!
   *
   * Features may be either of: OTBM_TILE_AREA
   *
   */

  // For each tile area; go over all actual tiles
  feature.tiles.forEach(function(tile) {

    // Skip anything that is not a tile (e.g. house tiles)
    if(tile.type !== otbm2json.HEADERS.OTBM_TILE) return feature;

    // Create a chessboard pattern using bitwise operators
    // Replace the id property of each tile
    if(tile.x & 1 ^ tile.y & 1) {
      tile.tileid = BLACK_TILE;
    } else {
      tile.tileid = WHITE_TILE;
    }

  });

  return feature;

}
