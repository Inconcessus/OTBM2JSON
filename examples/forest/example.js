/*
 * Example script of using the otbm2json library
 * 25% chance to add a tree to a tile
 */

const otbm2json = require("../../otbm2json");

// Read the map data using the otbm2json library
const mapData = otbm2json.read("grass.otbm");

function randomTree() {

  /* function randomTree
   * Returns an identifier of a random tree
   */

  var trees = [
    2701,
    2702,
    2703,
    2704,
    2705,
    2706
  ];

  // Return a random element
  return trees[Math.floor(Math.random() * trees.length)];

}

// Go over all nodes
mapData.data.nodes.forEach(function(x) {

  x.features.forEach(function(x) {

    if(x.type !== otbm2json.HEADERS.OTBM_TILE_AREA) return; 

    x.tiles.forEach(function(x) {

      if(x.type !== otbm2json.HEADERS.OTBM_TILE) return; 

      // On 1/4th of all tiles put a random tree
      if(Math.random() < 0.25) {
        x.items = [{ 
          "type": otbm2json.HEADERS.OTBM_ITEM,
          "id": randomTree()
        }];
      }

    });

  });

});

// Write the output to OTBM using the library
otbm2json.write("forest.otbm", mapData);
