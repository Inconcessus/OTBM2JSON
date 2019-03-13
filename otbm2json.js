const fs = require("fs");
const HEADERS = require("./lib/headers");
const Node = require("./lib/node");

const NODE_ESC = 0xFD;
const NODE_INIT = 0xFE;
const NODE_TERM = 0xFF;

__VERSION__ = "1.1.0";

function writeOTBM(__OUTFILE__, data) {

  /*
   * Function writeOTBM
   * Writes OTBM from intermediary JSON structure
   */

  // Write all nodes
  fs.writeFileSync(__OUTFILE__, serializeOTBM(data));
  
}

function writeNode(node) {

  /*
   * Function writeNode
   * Recursively writes all JSON nodes to OTBM node structure
   */

  // Already binary: return immediately
  if(node instanceof Buffer) {
    return node;
  }

  // Concatenate own data with children (recursively)
  // and pad the node with start & end identifier
  return Buffer.concat([
    Buffer.from([NODE_INIT]),
    writeElement(node),
    Buffer.concat(getChildNode(node).map(writeNode)),
    Buffer.from([NODE_TERM])
  ]);

}

function getChildNode(node) {

  /*
   * Function getChildNode
   * Returns child node or dummy array if child does not exist
   */

  return getChildNodeReal(node) || new Array();

}

function getChildNodeReal(node) {

  /*
   * Function getChildNodeReal
   * Give children of a node a particular identifier
   */

  switch(node.type) {
    case HEADERS.OTBM_TILE_AREA:
      return node.tiles;
    case HEADERS.OTBM_TILE:
    case HEADERS.OTBM_HOUSETILE:
      return node.items;
    case HEADERS.OTBM_TOWNS:
      return node.towns;
    case HEADERS.OTBM_ITEM:
      return node.content;
    case HEADERS.OTBM_MAP_DATA:
      return node.features;
    default:
      return node.nodes;
  }

}

function writeElement(node) {

  /*
   * Function Node.setChildren
   * Give children of a node a particular identifier
   */

  var buffer;

  // Write each node type
  switch(node.type) {
    case HEADERS.OTBM_MAP_HEADER:
      buffer = Buffer.alloc(17); 
      buffer.writeUInt8(HEADERS.OTBM_MAP_HEADER, 0);
      buffer.writeUInt32LE(node.version, 1);
      buffer.writeUInt16LE(node.mapWidth, 5);
      buffer.writeUInt16LE(node.mapHeight, 7);
      buffer.writeUInt32LE(node.itemsMajorVersion, 9);
      buffer.writeUInt32LE(node.itemsMinorVersion, 13);
      break;
    case HEADERS.OTBM_MAP_DATA:
      buffer = Buffer.alloc(1); 
      buffer.writeUInt8(HEADERS.OTBM_MAP_DATA, 0);
      buffer = Buffer.concat([buffer, writeAttributes(node)]);
      break;
    case HEADERS.OTBM_TILE_AREA:
      buffer = Buffer.alloc(6); 
      buffer.writeUInt8(HEADERS.OTBM_TILE_AREA, 0);
      buffer.writeUInt16LE(node.x, 1);
      buffer.writeUInt16LE(node.y, 3);
      buffer.writeUInt8(node.z, 5);
      break;
    case HEADERS.OTBM_TILE:
      buffer = Buffer.alloc(3); 
      buffer.writeUInt8(HEADERS.OTBM_TILE, 0);
      buffer.writeUInt8(node.x, 1);
      buffer.writeUInt8(node.y, 2);
      buffer = Buffer.concat([buffer, writeAttributes(node)]);
      break;
    case HEADERS.OTBM_HOUSETILE:
      buffer = Buffer.alloc(7);
      buffer.writeUInt8(HEADERS.OTBM_HOUSETILE, 0);
      buffer.writeUInt8(node.x, 1);
      buffer.writeUInt8(node.y, 2);
      buffer.writeUInt32LE(node.houseId, 3);
      buffer = Buffer.concat([buffer, writeAttributes(node)]);
      break;
    case HEADERS.OTBM_ITEM:
      buffer = Buffer.alloc(3); 
      buffer.writeUInt8(HEADERS.OTBM_ITEM, 0);
      buffer.writeUInt16LE(node.id, 1);
      buffer = Buffer.concat([buffer, writeAttributes(node)]);
      break;
    case HEADERS.OTBM_WAYPOINT:
      buffer = Buffer.alloc(3 + node.name.length + 5);
      buffer.writeUInt8(HEADERS.OTBM_WAYPOINT, 0);
      buffer.writeUInt16LE(node.name.length, 1)
      buffer.write(node.name, 3, "ASCII");
      buffer.writeUInt16LE(node.x, 3 + node.name.length);
      buffer.writeUInt16LE(node.y, 3 + node.name.length + 2);
      buffer.writeUInt8(node.z, 3 + node.name.length + 4);
      break;
    case HEADERS.OTBM_WAYPOINTS:
      buffer = Buffer.alloc(1); 
      buffer.writeUInt8(HEADERS.OTBM_WAYPOINTS, 0);
      break;
    case HEADERS.OTBM_TOWNS:
      buffer = Buffer.alloc(1);
      buffer.writeUInt8(HEADERS.OTBM_TOWNS, 0);
      break;
    case HEADERS.OTBM_TOWN:
      buffer = Buffer.alloc(7 + node.name.length + 5);
      buffer.writeUInt8(HEADERS.OTBM_TOWN, 0);
      buffer.writeUInt32LE(node.townid, 1);
      buffer.writeUInt16LE(node.name.length, 5)
      buffer.write(node.name, 7, "ASCII");
      buffer.writeUInt16LE(node.x, 7 + node.name.length);
      buffer.writeUInt16LE(node.y, 7 + node.name.length + 2);
      buffer.writeUInt8(node.z, 7 + node.name.length + 4);
      break;
    default:
      throw("Could not write node. Unknown node type: " + node.type); 
  }

  return escapeCharacters(buffer);

}

function escapeCharacters(buffer) {

  /*
   * Function escapeCharacters
   * Escapes special 0xFD, 0xFE, 0xFF characters in buffer
   */

  for(var i = 0; i < buffer.length; i++) {
    if(buffer.readUInt8(i) === NODE_TERM || buffer.readUInt8(i) === NODE_INIT || buffer.readUInt8(i) === NODE_ESC) {
      buffer = Buffer.concat([buffer.slice(0, i), Buffer.from([NODE_ESC]), buffer.slice(i)]); i++;
    }
  }

  return buffer;

}

function writeASCIIString16LE(string) {

  /*
   * Function writeASCIIString16LE
   * Writes an ASCII string prefixed with its string length (2 bytes)
   */

  var buffer = Buffer.alloc(2 + string.length);
  buffer.writeUInt16BE(string.length, 0);
  buffer.write(string, 2, string.length, "ASCII");

  return buffer;

}

function writeAttributes(node) {

  /*
   * Function writeAttributes
   * Writes additional node attributes
   */

  var buffer;
  var attributeBuffer = Buffer.alloc(0); 

  if(node.destination) {
    buffer = Buffer.alloc(6);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_TELE_DEST);
    buffer.writeUInt16LE(node.destination.x, 1);
    buffer.writeUInt16LE(node.destination.y, 3);
    buffer.writeUInt8(node.destination.z, 5);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  // Write description property
  if(node.description) {
    buffer = Buffer.alloc(1);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_DESCRIPTION, 0);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer, writeASCIIString16LE(node.description)])
  }

  // Node has an unique identifier
  if(node.uid) {
    buffer = Buffer.alloc(3);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_UNIQUE_ID, 0);
    buffer.writeUInt16LE(node.uid, 1);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  // Node has an action identifier
  if(node.aid) {
    buffer = Buffer.alloc(3);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_ACTION_ID, 0);
    buffer.writeUInt16LE(node.aid, 1);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  // Node has rune charges
  if(node.runeCharges) {
    buffer = Buffer.alloc(3);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_RUNE_CHARGES);
    buffer.writeUInt16LE(node.runeCharges, 1);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  // Spawn file
  if(node.spawnfile) {
    buffer = Buffer.alloc(1);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_EXT_SPAWN_FILE, 0);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer, writeASCIIString16LE(node.spawnfile)])
  }

  // Text attribute
  if(node.text) {
    buffer = Buffer.alloc(1);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_TEXT, 0);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer, writeASCIIString16LE(node.text)])
  }

  // House file
  if(node.housefile) {
    buffer = Buffer.alloc(1);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_EXT_HOUSE_FILE, 0);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer, writeASCIIString16LE(node.housefile)])
  }

  // Write HEADERS.OTBM_ATTR_ITEM
  if(node.tileid) {
    buffer = Buffer.alloc(3);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_ITEM, 0);
    buffer.writeUInt16LE(node.tileid, 1);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  // Write node count
  if(node.count) {
    buffer = Buffer.alloc(2);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_COUNT, 0);
    buffer.writeUInt8(node.count, 1);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  // Write depot identifier
  if(node.depotId) {
    buffer = Buffer.alloc(3);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_DEPOT_ID, 0);
    buffer.writeUInt16LE(node.depotId, 1);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  // Write house door ID
  if(node.houseDoorId) {
    buffer = Buffer.alloc(2);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_HOUSEDOORID, 0);
    buffer.writeUInt8(node.houseDoorId, 1);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  // Write the zone fields
  if(node.zones) {
    buffer = Buffer.alloc(5);
    buffer.writeUInt8(HEADERS.OTBM_ATTR_TILE_FLAGS, 0);
    buffer.writeUInt32LE(writeFlags(node.zones), 1);
    attributeBuffer = Buffer.concat([attributeBuffer, buffer]);
  }

  return attributeBuffer;

}

function writeFlags(zones) {

  /*
   * Function writeFlags
   * Writes OTBM tile bit-flags to integer
   */

  var flags = HEADERS.TILESTATE_NONE;

  flags |= zones.protection && HEADERS.TILESTATE_PROTECTIONZONE;
  flags |= zones.noPVP && HEADERS.TILESTATE_NOPVP;
  flags |= zones.noLogout && HEADERS.TILESTATE_NOLOGOUT;
  flags |= zones.PVPZone && HEADERS.TILESTATE_PVPZONE;
  flags |= zones.refresh && HEADERS.TILESTATE_REFRESH;

  return flags;

}

function serializeOTBM(data) {

  /*
   * Function serializeOTBM
   * Serializes OTBM from intermediary JSON structure
   */

  // OTBM Header
  const VERSION = Buffer.alloc(4).fill(0x00);

  // Write all nodes
  return Buffer.concat([VERSION, writeNode(data.data)]);

}

function readOTBM(__INFILE__, transformCallback) {

  /*
   * Function readOTBM
   * Reads OTBM file to intermediary JSON structure
   */

  function readNode(data) {

    /*
     * Function readNode
     * Recursively parses OTBM nodal tree structure
     */

    // Cut off the initializing 0xFE identifier
    var children = new Array();
    var nodeData = null;

    // Start reading the array but skip first 0xFE identifier
    for(var i = 1; i < data.length; i++) {

      var cByte = data.readUInt8(i);

      // Escape character: skip reading this and following byte
      if(cByte === NODE_ESC) {
        i++;
        continue;
      }

      // Data belonging to the parent node, between 0xFE and (OxFE || 0xFF)
      if(nodeData === null && (cByte === NODE_INIT || cByte === NODE_TERM)) {
        nodeData = data.slice(1, i);
      }

      // A new node is started within another node: recursion
      if(cByte === NODE_INIT) {

        // Read the child
        var child = readNode(data.slice(i));
        children.push(child.node);

        // Skip the index over the full child length and proceed reading
        i = i + child.i;
        continue;
      }

      // Node termination
      if(cByte === NODE_TERM) {

        // Once the node has been terminated we can create it from binary
        var node = new Node(nodeData, children);

        // When streaming areas return early and discard the node object
        if(transformCallback instanceof Function) {

          // When a feature is completed after transformation convert it back to OTBM (binary)
          if(node.type === HEADERS.OTBM_TILE_AREA) {
            node = writeNode(transformCallback(node));
          }

        }

        return { i, node }

      }

    }

  }

  const data = fs.readFileSync(__INFILE__);

  // First four magic bytes are the format identifier
  const MAP_IDENTIFIER = data.readUInt32LE(0);

  // Confirm OTBM format by reading magic bytes (NULL or "OTBM")
  if(MAP_IDENTIFIER !== 0x00000000 && MAP_IDENTIFIER !== 0x4D42544F) {
    throw("Unknown OTBM format: unexpected magic bytes.");
  }

  // Create an object to hold the data
  var mapData = {
    "version": __VERSION__,
    "identifier": MAP_IDENTIFIER,
    "data": readNode(data.slice(4)).node
  }

  return mapData;

}

function transformOTBM(__INFILE__, __OUTFILE__, transformation) {

   /*
    * Function transformOTBM
    * Hopefully a lower-memory transformation function for OTBM
    * An input file, output file, and transformation function must be passed
    */

  // Read the OTBM file and fire the transformation callback on each feature
  writeOTBM(__OUTFILE__, readOTBM(__INFILE__, transformation));

}

module.exports.read = readOTBM;
module.exports.write = writeOTBM;
module.exports.serialize = serializeOTBM;
module.exports.transformOTBM = transformOTBM;
module.exports.HEADERS = HEADERS;
module.exports.__VERSION__ = __VERSION__;
