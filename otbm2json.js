const fs = require("fs");
const HEADERS = require("./lib/headers");

const NODE_ESC = 0xFD;
const NODE_INIT = 0xFE;
const NODE_TERM = 0xFF;

__VERSION__ = "1.0.1";

function writeOTBM(__OUTFILE__, data) {

  /*
   * Function writeOTBM
   * Writes OTBM from intermediary JSON structure
   */

  // Write all nodes
  fs.writeFileSync(__OUTFILE__, serializeOTBM(data));
  
}

function serializeOTBM(data) {

  /*
   * Function serializeOTBM
   * Serializes OTBM from intermediary JSON structure
   */

  function writeNode(node) {

    /* FUNCTION writeNode
     * Recursively writes all JSON nodes to OTBM node structure
     */

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

    /* FUNCTION getChildNode
     * Returns child node or dummy array if child does not exist
     */

    return getChildNodeReal(node) || new Array();

  }

  function getChildNodeReal(node) {

    /* FUNCTION getChildNodeReal
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

    /* FUNCTION Node.setChildren
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

    /* FUNCTION escapeCharacters
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

    /* FUNCTION writeASCIIString16LE
     * Writes an ASCII string prefixed with its string length (2 bytes)
     */

    var buffer = Buffer.alloc(2 + string.length);
    buffer.writeUInt16LE(string.length, 0);
    buffer.write(string, 2, string.length, "ASCII");
    return buffer;

  }

  function writeAttributes(node) {

    /* FUNCTION writeAttributes
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
  
    /* FUNCTION writeFlags
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

  // OTBM Header
  const VERSION = Buffer.alloc(4).fill(0x00);

  // Write all nodes
  return Buffer.concat([VERSION, writeNode(data.data)]);

}

function readOTBM(__INFILE__) {

  /* FUNCTION readOTBM
   * Reads OTBM file to intermediary JSON structure
   */

  var Node = function(data, children) {

    /* CLASS Node
     * Holds a particular OTBM node of type (see below)
     */

    // Remove the escape character from the node data string
    data = this.removeEscapeCharacters(data);

    switch(data.readUInt8(0)) {

      case HEADERS.OTBM_MAP_HEADER:
        this.type = HEADERS.OTBM_MAP_HEADER;
        this.version = data.readUInt32LE(1),
        this.mapWidth = data.readUInt16LE(5),
        this.mapHeight = data.readUInt16LE(7),
        this.itemsMajorVersion = data.readUInt32LE(9),
        this.itemsMinorVersion = data.readUInt32LE(13)
        break;

      // High level map data (e.g. areas, towns, and waypoints)
      case HEADERS.OTBM_MAP_DATA:
        this.type = HEADERS.OTBM_MAP_DATA;
        Object.assign(this, readAttributes(data.slice(1)));
        break;

      // A tile area
      case HEADERS.OTBM_TILE_AREA:
        this.type = HEADERS.OTBM_TILE_AREA;
        this.x = data.readUInt16LE(1);
        this.y = data.readUInt16LE(3);
        this.z = data.readUInt8(5);
        break;

      // A specific tile at location inside the parent tile area
      case HEADERS.OTBM_TILE:
        this.type = HEADERS.OTBM_TILE;
        this.x = data.readUInt8(1);
        this.y = data.readUInt8(2);
        Object.assign(this, readAttributes(data.slice(3)));
        break;

      // A specific item inside the parent tile
      case HEADERS.OTBM_ITEM:
        this.type = HEADERS.OTBM_ITEM;
        this.id = data.readUInt16LE(1);
        Object.assign(this, readAttributes(data.slice(3)));
        break;

      // Parse HEADERS.OTBM_HOUSETILE entity
      case HEADERS.OTBM_HOUSETILE:
        this.type = HEADERS.OTBM_HOUSETILE;
        this.x = data.readUInt8(1);
        this.y = data.readUInt8(2);
        this.houseId = data.readUInt32LE(3);
        Object.assign(this, readAttributes(data.slice(7)));
        break;

      // Parse HEADERS.OTBM_WAYPOINTS structure
      case HEADERS.OTBM_WAYPOINTS:
        this.type = HEADERS.OTBM_WAYPOINTS;
        break;

      // Single waypoint entity
      case HEADERS.OTBM_WAYPOINT:
        this.type = HEADERS.OTBM_WAYPOINT;
        this.name = readASCIIString16LE(data.slice(1));
        this.x = data.readUInt16LE(3 + this.name.length);
        this.y = data.readUInt16LE(5 + this.name.length);
        this.z = data.readUInt8(7 + this.name.length);
        break;

      // Parse HEADERS.OTBM_TOWNS
      case HEADERS.OTBM_TOWNS:
        this.type = HEADERS.OTBM_TOWNS;
        break;

      // Single town entity
      case HEADERS.OTBM_TOWN:
        this.type = HEADERS.OTBM_TOWN;
        this.townid = data.readUInt32LE(1);
        this.name = readASCIIString16LE(data.slice(5));
        this.x = data.readUInt16LE(7 + this.name.length);
        this.y = data.readUInt16LE(9 + this.name.length);
        this.z = data.readUInt8(11 + this.name.length);
        break;
    }

    // Set node children
    if(children.length) {
      this.setChildren(children);
    }

  }

  Node.prototype.removeEscapeCharacters = function(nodeData) {

    /* FUNCTION removeEscapeCharacter
     * Removes 0xFD escape character from the byte string
     */

    var iEsc = 0;
    var index;

    while(true) {

      // Find the next escape character
      index = nodeData.slice(++iEsc).indexOf(NODE_ESC);

      // No more: stop iteration
      if(index === -1) {
        return nodeData;
      }

      iEsc = iEsc + index;

      // Remove the character from the buffer
      nodeData = Buffer.concat([
        nodeData.slice(0, iEsc),
        nodeData.slice(iEsc + 1)
      ]);

    }

  };

  Node.prototype.setChildren = function(children) {

    /* FUNCTION Node.setChildren
     * Give children of a node a particular identifier
     */

    switch(this.type) {
      case HEADERS.OTBM_TILE_AREA:
        this.tiles = children;
        break;
      case HEADERS.OTBM_TILE:
      case HEADERS.OTBM_HOUSETILE:
        this.items = children;
        break;
      case HEADERS.OTBM_TOWNS:
        this.towns = children;
        break;
      case HEADERS.OTBM_ITEM:
        this.content = children;
        break;
      case HEADERS.OTBM_MAP_DATA:
        this.features = children;
        break;
      default:
        this.nodes = children;
        break;
    }

  };

  function readASCIIString16LE(data) {

    /* FUNCTION readASCIIString16LE
     * Reads a string of N bytes with its length
     * deteremined by the value of its first two bytes
     */

    return data.slice(2, 2 + data.readUInt16LE(0)).toString("ASCII");

  }

  function readAttributes(data) {

    /* FUNCTION readAttributes
     * Parses a nodes attribute structure
     */

    var i = 0;

    // Collect additional properties
    var properties = new Object();

    // Read buffer from beginning
    while(i + 1 < data.length) {

      // Read the leading byte
      switch(data.readUInt8(i++)) {

        // Text is written
        case HEADERS.OTBM_ATTR_TEXT:
          properties.text = readASCIIString16LE(data.slice(i));
          i += properties.text.length + 2;
          break;

        // Spawn file name
        case HEADERS.OTBM_ATTR_EXT_SPAWN_FILE:
          properties.spawnfile = readASCIIString16LE(data.slice(i));
          i += properties.spawnfile.length + 2;
          break;

        // House file name
        case HEADERS.OTBM_ATTR_EXT_HOUSE_FILE:
          properties.housefile = readASCIIString16LE(data.slice(i));
          i += properties.housefile.length + 2;
          break;

        // House door identifier (1 byte)
        case HEADERS.OTBM_ATTR_HOUSEDOORID:
          properties.houseDoorId = data.readUInt8(i);
          i += properties.houseDoorId.length + 2;
          break;

        // Description is written (N bytes)
        // May be written multiple times
        case HEADERS.OTBM_ATTR_DESCRIPTION:
          var descriptionString = readASCIIString16LE(data.slice(i));
          if(properties.description) {
            properties.description = properties.description + " " + descriptionString;
          } else {
            properties.description = descriptionString;
          }
          i += descriptionString.length + 2;
          break;

        // Description is written (N bytes)
        case HEADERS.OTBM_ATTR_DESC:
          properties.text = readASCIIString16LE(data.slice(i));
          i += properties.text.length + 2;
          break;

        // Depot identifier (2 byte)
        case HEADERS.OTBM_ATTR_DEPOT_ID:
          properties.depotId = data.readUInt16LE(i);
          i += 2;
          break;

        // Tile flags indicating the type of tile (4 Bytes)
        case HEADERS.OTBM_ATTR_TILE_FLAGS:
          properties.zones = readFlags(data.readUInt32LE(i));
          i += 4;
          break;

        // N (2 Bytes)
        case HEADERS.OTBM_ATTR_RUNE_CHARGES:
          properties.runeCharges = data.readUInt16LE(i);
          i += 2;
          break;

        // The item count (1 byte)
        case HEADERS.OTBM_ATTR_COUNT:
          properties.count = data.readUInt8(i);
          i += 1;
          break;

        // The main item identifier	(2 bytes)
        case HEADERS.OTBM_ATTR_ITEM:
          properties.tileid = data.readUInt16LE(i);
          i += 2;
          break;

        // Action identifier was set (2 bytes)
        case HEADERS.OTBM_ATTR_ACTION_ID:
          properties.aid = data.readUInt16LE(i);
          i += 2;
          break;

        // Unique identifier was set (2 bytes)
        case HEADERS.OTBM_ATTR_UNIQUE_ID:
          properties.uid = data.readUInt16LE(i);
          i += 2;
          break;

        // Teleporter given destination (x, y, z using 2, 2, 1 bytes respectively)
        case HEADERS.OTBM_ATTR_TELE_DEST:
          properties.destination = {
            "x": data.readUInt16LE(i),
            "y": data.readUInt16LE(i + 2),
            "z": data.readUInt8(i + 4)
          }
          i += 5;
          break;
      }

    }

    return properties;

  }

  function readFlags(flags) {

    /* FUNCTION readFlags
     * Reads OTBM bit flags
     */

    // Read individual tile flags using bitwise AND &
    return {
      "protection": flags & HEADERS.TILESTATE_PROTECTIONZONE,
      "noPVP": flags & HEADERS.TILESTATE_NOPVP,
      "noLogout": flags & HEADERS.TILESTATE_NOLOGOUT,
      "PVPZone": flags & HEADERS.TILESTATE_PVPZONE,
      "refresh": flags & HEADERS.TILESTATE_REFRESH
    }

  }

  function readNode(data) {

    /* FUNCTION readNode
     * Recursively parses OTBM nodal tree structure
     */

    // Cut off the initializing 0xFE identifier
    data = data.slice(1);

    var i = 0;
    var children = new Array();
    var nodeData = null;
    var child;

    // Start reading the array
    while(i < data.length) {

      var cByte = data.readUInt8(i);

      // Data belonging to the parent node, between 0xFE and (OxFE || 0xFF)
      if(nodeData === null && (cByte === NODE_INIT || cByte === NODE_TERM)) {
        nodeData = data.slice(0, i);
      }

      // Escape character: skip reading this and following byte
      if(cByte === NODE_ESC) {
        i = i + 2;
        continue;
      }

      // A new node is started within another node: recursion
      if(cByte === NODE_INIT) {
        child = readNode(data.slice(i));
        children.push(child.node);

        // Skip index over full child length
        i = i + 2 + child.i;
        continue;
      }

      // Node termination
      if(cByte === NODE_TERM) {
        return {
          "node": new Node(nodeData, children),
          "i": i
        }
      }

      i++;

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

module.exports.read = readOTBM;
module.exports.write = writeOTBM;
module.exports.serialize = serializeOTBM;
module.exports.HEADERS = HEADERS;
module.exports.__VERSION__ = __VERSION__;
