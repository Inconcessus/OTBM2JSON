const HEADERS = require("./headers");

const Node = function(data, children) {

  /*
   * Class Node
   * Holds a particular OTBM node of type (see below)
   */

  // Remove the escape character from the node data string
  data = this.removeEscapeCharacters(data);

  // Set the node type
  this.type = data.readUInt8(0); 

  switch(this.type) {

    case HEADERS.OTBM_MAP_HEADER:
      this.version = data.readUInt32LE(1),
      this.mapWidth = data.readUInt16LE(5),
      this.mapHeight = data.readUInt16LE(7),
      this.itemsMajorVersion = data.readUInt32LE(9),
      this.itemsMinorVersion = data.readUInt32LE(13)
      break;

    // High level map data (e.g. areas, towns, and waypoints)
    case HEADERS.OTBM_MAP_DATA:
      Object.assign(this, this.readAttributes(data.slice(1)));
      break;

    // A tile area
    case HEADERS.OTBM_TILE_AREA:
      this.x = data.readUInt16LE(1);
      this.y = data.readUInt16LE(3);
      this.z = data.readUInt8(5);
      break;

    // A specific tile at location inside the parent tile area
    case HEADERS.OTBM_TILE:
      this.x = data.readUInt8(1);
      this.y = data.readUInt8(2);
      Object.assign(this, this.readAttributes(data.slice(3)));
      break;

    // A specific item inside the parent tile
    case HEADERS.OTBM_ITEM:
      this.id = data.readUInt16LE(1);
      Object.assign(this, this.readAttributes(data.slice(3)));
      break;

    // Parse HEADERS.OTBM_HOUSETILE entity
    case HEADERS.OTBM_HOUSETILE:
      this.x = data.readUInt8(1);
      this.y = data.readUInt8(2);
      this.houseId = data.readUInt32LE(3);
      Object.assign(this, this.readAttributes(data.slice(7)));
      break;

    // Parse HEADERS.OTBM_WAYPOINTS structure
    case HEADERS.OTBM_WAYPOINTS:
      break;

    // Single waypoint entity
    case HEADERS.OTBM_WAYPOINT:
      this.name = this.readASCIIString16LE(data.slice(1));
      this.x = data.readUInt16LE(3 + this.name.length);
      this.y = data.readUInt16LE(5 + this.name.length);
      this.z = data.readUInt8(7 + this.name.length);
      break;

    // Parse HEADERS.OTBM_TOWNS
    case HEADERS.OTBM_TOWNS:
      break;

    // Single town entity
    case HEADERS.OTBM_TOWN:
      this.townid = data.readUInt32LE(1);
      this.name = this.readASCIIString16LE(data.slice(5));
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

  /*
   * Function removeEscapeCharacter
   * Removes 0xFD escape character from the byte string
   */

  for(var i = 0; i < nodeData.length; i++) {

    if(nodeData.readUInt8(i) === HEADERS.NODE_ESC) {
      nodeData = Buffer.concat([
        nodeData.slice(0, i),
        nodeData.slice(i + 1)
      ]);
    }

  }

  return nodeData;

}

Node.prototype.setChildren = function(children) {

  /*
   * Function Node.setChildren
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

}

Node.prototype.readFlags = function(flags) {

  /*
   * Function Node::readFlags
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

Node.prototype.readAttributes = function(data) {

  /*
   * Function readAttributes
   * Parses a nodes attribute structure
   */

  // Collect additional properties
  var properties = new Object();

  // Read buffer from beginning
  for(var i = 0; i < data.length; i++) {

    // Read the leading byte
    switch(data.readUInt8(i)) {

      // Text is written
      case HEADERS.OTBM_ATTR_TEXT:
        properties.text = this.readASCIIString16LE(data.slice(i));
        i += properties.text.length + 2;
        break;

      // Spawn file name
      case HEADERS.OTBM_ATTR_EXT_SPAWN_FILE:
        properties.spawnfile = this.readASCIIString16LE(data.slice(i));
        i += properties.spawnfile.length + 2;
        break;

      // House file name
      case HEADERS.OTBM_ATTR_EXT_HOUSE_FILE:
        properties.housefile = this.readASCIIString16LE(data.slice(i));
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
        var descriptionString = this.readASCIIString16LE(data.slice(i));
        if(properties.description) {
          properties.description = properties.description + " " + descriptionString;
        } else {
          properties.description = descriptionString;
        }
        i += descriptionString.length + 2;
        break;

      // Description is written (N bytes)
      case HEADERS.OTBM_ATTR_DESC:
        properties.text = this.readASCIIString16LE(data.slice(i));
        i += properties.text.length + 2;
        break;

      // Depot identifier (2 byte)
      case HEADERS.OTBM_ATTR_DEPOT_ID:
        properties.depotId = data.readUInt16LE(i);
        i += 2;
        break;

      // Tile flags indicating the type of tile (4 Bytes)
      case HEADERS.OTBM_ATTR_TILE_FLAGS:
        properties.zones = this.readFlags(data.readUInt32LE(i));
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

      // The main item identifier (2 bytes)
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

Node.prototype.readASCIIString16LE = function(data) {

  /*
   * Function readASCIIString16LE
   * Reads a string of N bytes with its length
   * deteremined by the value of its first two bytes
   */

  // First two bytes are the length
  return data.slice(2, 2 + data.readUInt16LE(0)).toString("ASCII");

}


module.exports = Node;
