/*
 * Example script of using the otbm2json library
 * Changes all tiles on a map to chessboard pattern in global coordinates
 */

const otbm2json = require("../../otbm2json");

const mapReader = new otbm2json.StreamReader();

mapReader.on("area", function(tile) {
  console.log(tile);
});

mapReader.read("void.otbm");
