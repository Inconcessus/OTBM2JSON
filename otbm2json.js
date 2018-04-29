const fs = require("fs");

__VERSION__ = "0.1.0";
__RME_VERSION__ = "10.98";
__OUTFILE__ = "OTBM.json";
__INFILE__ = "map.otbm";

fs.readFile(__INFILE__, function(error, data) {

  // First four magic bytes are the format identifier
  const MAP_IDENTIFIER = data.readUInt32LE(0);

  // Confirm OTBM format by reading magic bytes (NULL or "OTBM")
  if(MAP_IDENTIFIER !== 0x00000000 && MAP_IDENTIFIER !== 0x4D42544F) {
    throw("Unknown OTBM format: unexpected magic bytes.");
  }

  var start = Date.now();

  // Create an object to hold the data
  var mapData = {
    "version": __VERSION__,
    "identifier": MAP_IDENTIFIER,
    "OTBMHeader": OTBMRootHeader(data.slice(6, 22)),
    "data": parseNode(data.slice(22))
  };

  var end = Date.now() - start;
  
  // Write the JSON output
  fs.writeFile(__OUTFILE__, JSON.stringify(mapData), function(error) {
    console.log("OTBM data succesfully parsed in " + end + "ms and written to " + __OUTFILE__ + ".");
  });
  
});

var Node = function(data, children) {

  /* Class Node
   * Holds a particular OTBM node of type (see below)
   */

  // Magic bytes
  const OTBM_MAP_DATA = 0x02;
  const OTBM_TILE_AREA = 0x04;
  const OTBM_TILE = 0x05;
  const OTBM_ITEM = 0x06;
  const OTBM_TOWNS = 0x0C;
  const OTBM_TOWN = 0x0D;
  const OTBM_HOUSETILE = 0x0E;
  const OTBM_WAYPOINTS = 0x0F;
  const OTBM_WAYPOINT = 0x10;

  // Remove the escape character from the node data string
  data = this.removeEscapeCharacters(data);

  switch(data.readUInt8(0)) {

    // High level map data (e.g. areas, towns, and waypoints)
    case OTBM_MAP_DATA:
      this.type = "OTBM_MAP_DATA";
      Object.assign(this, parseAttributes(data.slice(1)));
      break;

    // A tile area
    case OTBM_TILE_AREA:
      this.type = "OTBM_TILE_AREA";
      this.x = data.readUInt16LE(1);
      this.y = data.readUInt16LE(3);
      this.z = data.readUInt8(5);
      break;

    // A specific tile at location inside the parent tile area
    case OTBM_TILE:
      this.type = "OTBM_TILE";
      this.x = data.readUInt8(1);
      this.y = data.readUInt8(2);
      Object.assign(this, parseAttributes(data.slice(3)));
      break;

    // A specific item inside the parent tile
    case OTBM_ITEM:
      this.type = "OTBM_ITEM";
      this.id = data.readUInt16LE(1);
      Object.assign(this, parseAttributes(data.slice(3)));
      break;

    // Parse OTBM_HOUSETILE entity
    case OTBM_HOUSETILE:
      this.type = "OTBM_HOUSETILE";
      this.x = data.readUInt8(1);
      this.y = data.readUInt8(2);
      this.houseId = data.readUInt32LE(3);
      Object.assign(this, parseAttributes(data.slice(7)));
      break;

    // Parse OTBM_WAYPOINTS structure
    case OTBM_WAYPOINTS:
      this.type = "OTBM_WAYPOINTS";
      break;

    // Single waypoint entity
    case OTBM_WAYPOINT:
      this.type = "OTBM_WAYPOINT";
      this.name = readASCIIString16LE(data.slice(1));
      this.x = data.readUInt16LE(3 + this.name.length);
      this.y = data.readUInt16LE(5 + this.name.length);
      this.z = data.readUInt8(7 + this.name.length);
      break;

    // Parse OTBM_TOWNS
    case OTBM_TOWNS:
      this.type = "OTBM_TOWNS";
      break;

    // Single town entity
    case OTBM_TOWN:
      this.type = "OTBM_TOWN";
      this.id = data.readUInt16LE(1);
      // Some two extra bytes ???
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

  const ESCAPE_CHAR = 0xFD;

  var iEsc = -1;

  while(true) {

    // Find the next escape character
    iEsc = nodeData.slice(iEsc + 1).indexOf(ESCAPE_CHAR);

    // No more: stop iteration
    if(iEsc === -1) {
      return nodeData;
    }

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
    case "OTBM_TILE_AREA":
      this.tiles = children;
      break;
    case "OTBM_TILE":
    case "OTBM_HOUSETILE":
      this.items = children;
      break;
    case "OTBM_TOWNS":
      this.towns = children;
      break;
    case "OTBM_ITEM":
      this.content = children;
      break;
    case "OTBM_MAP_DATA":
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

function parseAttributes(data) {

  /* FUNCTION parseAttributes
   * Parses a nodes attribute structure
   */

  // Magic tile flag bits
  const TILESTATE_NONE = 0x0000;
  const TILESTATE_PROTECTIONZONE = 0x0001;
  const TILESTATE_DEPRECATED = 0x0002;
  const TILESTATE_NOPVP = 0x0004;
  const TILESTATE_NOLOGOUT = 0x0008;
  const TILESTATE_PVPZONE = 0x0010;
  const TILESTATE_REFRESH = 0x0020;

  // Magic identification bytes
  const OTBM_ATTR_DESCRIPTION = 0x01;
  const OTBM_ATTR_EXT_FILE = 0x02;
  const OTBM_ATTR_TILE_FLAGS = 0x03;
  const OTBM_ATTR_ACTION_ID = 0x04;
  const OTBM_ATTR_UNIQUE_ID = 0x05;
  const OTBM_ATTR_TEXT = 0x06;
  const OTBM_ATTR_DESC = 0x07;
  const OTBM_ATTR_TELE_DEST = 0x08;
  const OTBM_ATTR_ITEM = 0x09;
  const OTBM_ATTR_DEPOT_ID = 0x0A;
  const OTBM_ATTR_EXT_SPAWN_FILE = 0x0B;
  const OTBM_ATTR_EXT_HOUSE_FILE = 0x0D;
  const OTBM_ATTR_HOUSEDOORID = 0x0E;
  const OTBM_ATTR_COUNT = 0x0F;
  const OTBM_ATTR_RUNE_CHARGES = 0x16;

  var i = 0;
  
  // Collect additional properties
  var properties = new Object();
  
  // Read buffer from beginning
  while(i + 1 < data.length) {
	  
    // Read the leading byte
    switch(data.readUInt8(i++)) {

      // Text is written
      case OTBM_ATTR_TEXT:
        properties.text = readASCIIString16LE(data.slice(i));
        i += properties.text.length + 2;
        break;

      // Spawn file name
      case OTBM_ATTR_EXT_SPAWN_FILE:
        properties.spawnfile = readASCIIString16LE(data.slice(i));
        i += properties.spawnfile.length + 2;
        break;

      // House file name
      case OTBM_ATTR_EXT_HOUSE_FILE:
        properties.housefile = readASCIIString16LE(data.slice(i));
        i += properties.housefile.length + 2;
        break;
		
      // House door identifier (1 byte)
      case OTBM_ATTR_HOUSEDOORID:
        properties.houseDoorId = data.readUInt8(i);
        i += properties.houseDoorId.length + 2;
        break;

      // Description is written (N bytes)
      // May be written multiple times
      case OTBM_ATTR_DESCRIPTION:
        var descriptionString = readASCIIString16LE(data.slice(i));
        if(properties.description) {
          properties.description = properties.description + " " + descriptionString;
        } else {
          properties.description = descriptionString;
        }
        i += descriptionString.length + 2;
        break;
		
      // Description is written (N bytes)
      case OTBM_ATTR_DESC:
        properties.text = readASCIIString16LE(data.slice(i));
        i += properties.text.length + 2;
        break;

      // Depot identifier (2 byte)
      case OTBM_ATTR_DEPOT_ID:
        properties.depotId = data.readUInt16LE(i);
        i += 2;
        break;

      // Tile flags indicating the type of tile (4 Bytes)
      case OTBM_ATTR_TILE_FLAGS:
        var flags = data.readUInt32LE(i);

        // Read individual tile flags using bitwise AND &
        properties.protectionZone = flags & TILESTATE_PROTECTIONZONE;
        properties.noPVP = flags & TILESTATE_NOPVP;
        properties.noLogout = flags & TILESTATE_NOLOGOUT;
        properties.PVPZone = flags & TILESTATE_PVPZONE;
        properties.refresh = flags & TILESTATE_REFRESH;

        i += 4;
        break;

      // N (2 Bytes)
      case OTBM_ATTR_RUNE_CHARGES:
        properties.runeCharges = data.readUInt16LE(i);
        i += 2;
        break;

      // The item count (1 byte)
      case OTBM_ATTR_COUNT:
        properties.count = data.readUInt8(i);
        i++;
        break;

      // The main item identifier	(2 bytes)
      case OTBM_ATTR_ITEM:
        properties.id = data.readUInt16LE(i);
        i += 2;
        break;

      // Action identifier was set (2 bytes)
      case OTBM_ATTR_ACTION_ID:
        properties.aid = data.readUInt16LE(i);
        i += 2;
        break;

      // Unique identifier was set (2 bytes)
      case OTBM_ATTR_UNIQUE_ID:
        properties.uid = data.readUInt16LE(i);
        i += 2;
        break;

      // Teleporter given destination (x, y, z using 2, 2, 1 bytes respectively)
      case OTBM_ATTR_TELE_DEST:
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

function parseNode(data) {

  /* FUNCTION parseNode
   * Recursively parses OTBM nodal tree structure
   */
 
  const ESCAPE_CHAR = 0xFD;
  const NODE_START = 0xFE;
  const NODE_END = 0xFF;

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
    if(nodeData === null && (cByte === NODE_START || cByte === NODE_END)) {
      nodeData = data.slice(0, i);
    }

    // Escape character: skip reading this and following byte
    if(cByte === ESCAPE_CHAR) {
      i = i + 2;
      continue;
    }

    // A new node is started within another node: recursion
    if(cByte === NODE_START) {
      child = parseNode(data.slice(i));
      children.push(child.node);

      // Skip index over full child length
      i = i + 2 + child.i;
      continue;
    }

    // Node termination
    if(cByte === NODE_END) {
      return {
        "node": new Node(nodeData, children),
        "i": i
      }
    }

    i++;
	
  }
  
}

function OTBMRootHeader(buffer) {
	
  /* function OTBMRootHeader
   * Reads out OTBM header information
   */

  return {
    version: buffer.readUInt32LE(0),
    mapWidth: buffer.readUInt16LE(4),
    mapHeight: buffer.readUInt16LE(6),
    itemsMajorVersion: buffer.readUInt32LE(8),
    itemsMinorVersion: buffer.readUInt32LE(12)
  }
  
}
