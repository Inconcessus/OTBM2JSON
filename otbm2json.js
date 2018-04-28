const fs = require("fs");

__VERSION__ = "0.1.0";
__RME_VERSION__ = "10.98";
__OUTFILE__ = "OTBM.json";
__INFILE__ = "map.otbm";

fs.readFile(__INFILE__, function(error, data) {

  // First four magic bytes are the format identifier
  const MAP_IDENTIFIER = data.readUInt32LE(0);

  // Confirm OTBM format by reading magic bytes (NULL or "OTBM")
  if (MAP_IDENTIFIER !== 0x00000000 && MAP_IDENTIFIER !== 0x4d42544f) {
    throw "Unknown OTBM format: unexpected magic bytes.";
  }

  // Create an object to hold the data
  var mapData = {
    identifier: MAP_IDENTIFIER,
    OTBMHeader: OTBMRootHeader(data.slice(6, 22)),
    data: parseNode(data.slice(4))
  }

  // Write the JSON output
  fs.writeFile(__OUTFILE__, JSON.stringify(mapData), function(error) {
    console.log("Data succesfully written to " + __OUTFILE__ + ".");
  });
  
});

var Node = function(data) {
	
  /* Class Node
   * Holds a particular OTBM node of type (see below)
   */

  // Magic bytes
  const OTBM_MAP_DATA = 0x02;
  const OTBM_TILE_AREA = 0x04;
  const OTBM_TILE = 0x05;
  const OTBM_ITEM = 0x06;
  const OTBM_TOWNS = 0x0c;
  const OTBM_TOWN = 0x0d;
  const OTBM_HOUSETILE = 0x0e;
  const OTBM_WAYPOINTS = 0x0f;
  const OTBM_WAYPOINT = 0x10;

  switch (data.readUInt8(0)) {

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
  
};

Node.prototype.getChildName = function() {
	
  /* FUNCTION Node.getChildName
   * Give children of a node a particular identifier
    */

  switch(this.type) {
    case "OTBM_TILE_AREA":
      return "tiles";
    case "OTBM_TILE":
    case "OTBM_HOUSETILE":
      return "items";
    case "OTBM_TOWNS":
      return "towns";
    case "OTBM_ITEM":
	  return "content";
    case "OTBM_MAP_DATA":
      return "features";
    default:
      return "nodes";
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
  const OTBM_ATTR_TILE_FLAGS = 0x03;
  const OTBM_ATTR_ACTION_ID = 0x04;
  const OTBM_ATTR_UNIQUE_ID = 0x05;
  const OTBM_ATTR_TEXT = 0x06;
  const OTBM_ATTR_DESC = 0x07;
  const OTBM_ATTR_TELE_DEST = 0x08;
  const OTBM_ATTR_ITEM = 0x09;
  const OTBM_ATTR_DEPOT_ID = 0x0a;
  const OTBM_ATTR_HOUSEDOORID = 0x0e;
  const OTBM_ATTR_COUNT = 0x0f;
  const OTBM_ATTR_RUNE_CHARGES = 0x16;

  var i = 0;

  // Collect additional properties
  var properties = new Object();

  // Read buffer from beginning
  while(i + 1 < data.length) {
	  
    // Read the leading byte
    switch (data.readUInt8(i++)) {
		
      // Text is written (N bytes)
      case OTBM_ATTR_TEXT:
        properties.text = readASCIIString16LE(data.slice(i));
        i += properties.text.length + 2;
        break;

      // House door identifier (1 byte)
      case OTBM_ATTR_HOUSEDOORID:
        properties.houseDoorId = data.readUInt8(i);
        i++;
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
          x: data.readUInt16LE(i),
          y: data.readUInt16LE(i + 2),
          z: data.readUInt8(i + 4)
        };
        i += 5;
        break;
    }
	
  }

  return properties;
  
}

function parseNode(data) {
	
  /* function parseNode
   * Recursively parses nodes in the OTBM node tree
   */

  // Magic delimiters
  const NODE_MISSING = -1;
  const ESCAPE_CHAR = 0xfd;
  const NODE_START = 0xfe;
  const NODE_END = 0xff;

  var iDepth;

  // Slice off the initial byte (NODE_START)
  var data = data.slice(1);

  // Look for the position of depth change
  var iStart = data.indexOf(NODE_START);
  var iEnd = data.indexOf(NODE_END);

  // If identifiers are missing
  if (iStart === NODE_MISSING) {
    iDepth = iEnd;
  } else if (iEnd === NODE_MISSING) {
    iDepth = iStart;
  } else {
    iDepth = Math.min(data.indexOf(NODE_START), data.indexOf(NODE_END));
  }

  // Node data at current depth until next depth change
  var currentNode = new Node(data.slice(0, iDepth));

  // Current node depth
  var cDepth = 0;

  while(true) {
	  
    // Read the byte
    switch (data.readUInt8(iDepth)) {
		
      // Identified the start of a new node
      case NODE_START:
        if (++cDepth === 1) {
			
          var childName = currentNode.getChildName();

          if (!currentNode[childName]) {
            currentNode[childName] = new Array();
          }

          // Recursion
          currentNode[childName].push(parseNode(data.slice(iDepth)));
        }
        break;

      // Current node is closed
      case NODE_END:
        if (--cDepth === -1) {
          return currentNode;
        }
        break;
    }

    iDepth++;
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
  };
  
}
