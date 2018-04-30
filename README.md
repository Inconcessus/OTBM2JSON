# OTBM2JSON
NodeJS library for programmatically modifying Open Tibia Binary Mapping files. This code reads .otbm files and parses them to an intermediary JSON format. This JSON structure can be programatically modified. Once a change has been comitted to the structure, it can be encoded back to an .otbm file.

# Usage
Import the library in your script

    const otbm2json = require("./otbm2json.js");

The library provides two functions for reading and writing OTBM:

    data = otbm2json.read(filename);
    // ** Modify the data object here **
    otbm2json.write(filename, data);

# JSON Structure
The structure of the JSON read from and to `.otbm` can be seen in the example `OTBM.json`.

# Example
An example script `example.js` is provided. This script uses the `examples/void.otbm` in this repository and replaces all floor tiles with a chessboard and writes to  `examples/chess.otbm` pattern.

<p align="center">
  <img src="images/void.png">
  <img src="images/convert.png">
  <img src="images/chess.png">
</p>

# Version
Current version 0.2.0. This is a work in progress.
