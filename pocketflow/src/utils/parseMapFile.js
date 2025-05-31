const fs = require('fs');

function parseMapFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        return null;
    }

    try {
        const buffer = fs.readFileSync(filePath);
        let offset = 0;
        const mapData = {};

        // 1. Map Width
        if (offset + 3 >= buffer.length) { console.error("EOF before mapWidth"); return null; }
        mapData.width = buffer.readInt32BE(offset);
        offset += 4;

        // 2. Map Height
        if (offset + 3 >= buffer.length) { console.error("EOF before mapHeight"); return null; }
        mapData.height = buffer.readInt32BE(offset);
        offset += 4;

        // 3. Number of Layers
        if (offset >= buffer.length) { console.error("EOF before numLayers"); return null; }
        mapData.numLayers = buffer.readUInt8(offset); // readByte() is signed, numLayers should be unsigned
        offset += 1;

        const totalTilesPerLayer = mapData.width * mapData.height;
        mapData.layers = [];

        // 4. Layer 1 tile data
        if (offset + totalTilesPerLayer > buffer.length) { console.error("EOF before layer 1 data"); return null; }
        const layer1Data = [];
        for (let i = 0; i < totalTilesPerLayer; i++) {
            layer1Data.push(buffer.readUInt8(offset + i)); // Tile IDs are usually unsigned bytes
        }
        mapData.layers.push({ type: "background", tiles: layer1Data });
        offset += totalTilesPerLayer;

        // 5. Layer 2 tile data (optional)
        if (mapData.numLayers > 2) {
            if (offset + totalTilesPerLayer > buffer.length) { console.error("EOF before layer 2 data"); return null; }
            const layer2Data = [];
            for (let i = 0; i < totalTilesPerLayer; i++) {
                layer2Data.push(buffer.readUInt8(offset + i));
            }
            mapData.layers.push({ type: "foreground", tiles: layer2Data });
            offset += totalTilesPerLayer;
        }

        // 6. Layer 3 tile data (collision/attribute layer)
        // This layer is always present according to the J2ME logic (this.l is always read)
        if (offset + totalTilesPerLayer > buffer.length) { console.error("EOF before attribute layer data"); return null; }
        const attributeLayerData = [];
        for (let i = 0; i < totalTilesPerLayer; i++) {
            attributeLayerData.push(buffer.readUInt8(offset + i));
        }
        mapData.layers.push({ type: "attribute", tiles: attributeLayerData });
        offset += totalTilesPerLayer;
        
        mapData.animatedTiles = [];
        // 7. Number of animated tile definitions
        if (offset >= buffer.length) { // Check if there's at least one byte for numAnimatedTiles
             console.warn("Warning: Reached end of file before numAnimatedTiles. Assuming 0.");
             return mapData; // Return what we have so far
        }
        const numAnimatedTiles = buffer.readUInt8(offset);
        offset += 1;

        for (let i = 0; i < numAnimatedTiles; i++) {
            if (offset >= buffer.length) { console.warn(`EOF before anim tile ${i+1} delay`); break; }
            const animationSpeed = buffer.readUInt8(offset);
            offset += 1;

            if (offset >= buffer.length) { console.warn(`EOF before anim tile ${i+1} frame count`); break; }
            const numFramesInAnimation = buffer.readUInt8(offset);
            offset += 1;
            
            const animationFrames = [];
            if (offset + numFramesInAnimation > buffer.length) { console.warn(`EOF during anim tile ${i+1} frames`); break; }
            for (let j = 0; j < numFramesInAnimation; j++) {
                animationFrames.push(buffer.readUInt8(offset + j));
            }
            offset += numFramesInAnimation;
            mapData.animatedTiles.push({ speed: animationSpeed, frames: animationFrames });
        }

        if (offset < buffer.length) {
            console.warn(`Warning: ${buffer.length - offset} unparsed bytes remaining at the end of the .map file.`);
        }


        return mapData;

    } catch (error) {
        console.error(`Error parsing .map file ${filePath}:`, error);
        return null;
    }
}

module.exports = parseMapFile;
