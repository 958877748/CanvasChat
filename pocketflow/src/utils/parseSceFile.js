const fs = require('fs');
const path = require('path');

// --- Helper functions mimicking ac.java ---

/**
 * Mimics ac.a(DataInputStream) - Custom string reader
 * @param {Buffer} buffer
 * @param {{offset: number}} offsetObj - Pass an object {offset: value} to track position
 * @returns {string|null}
 */
function readAcString(buffer, offsetObj) {
    if (offsetObj.offset >= buffer.length) {
        // console.warn(`readAcString: Attempt to read at EOF. Offset: ${offsetObj.offset}, Buffer Length: ${buffer.length}`);
        return null;
    }
    let length = buffer.readUInt8(offsetObj.offset);
    offsetObj.offset += 1;

    if (length === 0) return null;

    if (length === 255) { // Marker for 16-bit length
        if (offsetObj.offset + 1 >= buffer.length) { // Need 2 bytes for the short
            // console.warn(`readAcString: EOF when trying to read 16-bit length. Offset: ${offsetObj.offset}`);
            return null; 
        }
        const k_val = buffer.readUInt16BE(offsetObj.offset); // Read as Big Endian (e.g., 0x2206 if bytes are 22 06)
        offsetObj.offset += 2;
        // Perform the J2ME byte swap: (val_MSB_LSB >> 8) | ((val_MSB_LSB & 0xFF) << 8)
        // This effectively makes LSB the MSB and MSB the LSB of the new length.
        // If k_val = 0x2206 (MSB=22, LSB=06), then length becomes 0x0622.
        length = (k_val >> 8) | ((k_val & 0xFF) << 8);
    }

    if (offsetObj.offset + length > buffer.length) {
        // console.warn(`readAcString: Calculated string length (${length}) exceeds buffer. Offset: ${offsetObj.offset}, Remaining: ${buffer.length - offsetObj.offset}`);
        return `ERROR_STRING_LENGTH_EXCEEDS_BUFFER_LEN[${length}]_OFFSET[${offsetObj.offset}]_REM[${buffer.length - offsetObj.offset}]`; // Or handle error appropriately
    }

    const strBytes = buffer.subarray(offsetObj.offset, offsetObj.offset + length);
    offsetObj.offset += length;
    try {
        return new TextDecoder('utf-8').decode(strBytes);
    } catch (e) {
        console.warn("UTF-8 decoding error for a string, returning raw bytes as hex:", strBytes.toString('hex'));
        return `ERROR_DECODING_STRING_HEX[${strBytes.toString('hex')}]`;
    }
}

/**
 * Mimics ac.a(String, char, char) - Complex string splitter
 * @param {string} inputString
 * @param {string} outerDelimiter
 * @param {string} innerDelimiter
 * @returns {string[][]}
 */
function splitAcString(inputString, outerDelimiter, innerDelimiter) {
    if (!inputString) return [];
    const result = [];
    let inQuote = false;
    const outerSplits = [];
    let lastOuterSplit = 0;

    for (let i = 0; i < inputString.length; i++) {
        const char = inputString[i];
        if (char === '"' && (i === 0 || inputString[i - 1] !== '\\')) {
            inQuote = !inQuote;
        }
        if (!inQuote && char === outerDelimiter) {
            outerSplits.push(inputString.substring(lastOuterSplit, i));
            lastOuterSplit = i + 1;
        }
    }
    outerSplits.push(inputString.substring(lastOuterSplit));

    for (const outerPart of outerSplits) {
        if (outerPart.trim() === "") continue;
        const innerSplitsRaw = [];
        let lastInnerSplit = 0;
        inQuote = false; // Reset for inner parsing

        for (let i = 0; i < outerPart.length; i++) {
            const char = outerPart[i];
            if (char === '"' && (i === 0 || outerPart[i - 1] !== '\\')) {
                inQuote = !inQuote;
            }
            if (!inQuote && char === innerDelimiter) {
                innerSplitsRaw.push(outerPart.substring(lastInnerSplit, i));
                lastInnerSplit = i + 1;
            }
        }
        innerSplitsRaw.push(outerPart.substring(lastInnerSplit));
        
        const cleanedInnerSplits = innerSplitsRaw.map(s => {
            let str = s.trim();
            // Remove surrounding quotes if they are not escaped
            if (str.startsWith('"') && str.endsWith('"')) {
                 // Basic check, J2ME version is more robust with `\`
                let quoteCount = 0;
                for(let k=0; k<str.length; k++) if(str[k] === '"' && (k===0 || str[k-1] !== '\\')) quoteCount++;
                if(quoteCount <= 2) { // Only strip if they are the outer pair
                    str = str.substring(1, str.length - 1);
                }
            }
            return str.replace(/\\"/g, '"'); // Unescape quotes
        });
        result.push(cleanedInnerSplits);
    }
    return result;
}


/**
 * Mimics ac.b(DataInputStream)
 * @param {Buffer} buffer
 * @param {{offset: number}} offsetObj
 * @returns {string[][]|null}
 */
function readAcScript(buffer, offsetObj) {
    const str = readAcString(buffer, offsetObj);
    if (str && str.length > 0) {
        return splitAcString(str, ';', ' ');
    }
    return null;
}

/**
 * Mimics ac.d(DataInputStream) - short array parser
 * @param {Buffer} buffer
 * @param {{offset: number}} offsetObj
 * @returns {number[]|null}
 */
function readAcShortArray(buffer, offsetObj) {
    const scriptArray = readAcScript(buffer, offsetObj); // ac.b reads string then splits
    if (scriptArray && scriptArray.length > 0 && scriptArray[0]) {
        const stringArray = scriptArray[0];
        const shortArray = stringArray.map(s => parseInt(s, 10));
        return shortArray.filter(n => !isNaN(n)); // Ensure they are numbers
    }
    return null;
}


/**
 * Mimics h.b(DataInputStream) - Parses trigger zones
 * @param {Buffer} buffer
 * @param {{offset: number}} offsetObj
 * @returns {object[]|null} Array of { zones: short[][], script: string[][] }
 */
function parseTriggerZones(buffer, offsetObj) {
    const mainStr = readAcString(buffer, offsetObj);
    if (!mainStr || mainStr.length === 0) {
        return null;
    }

    const triggerZoneObjects = [];
    // ac.a(mainStr, '$', '#')
    const zoneDefinitions = splitAcString(mainStr, '$', '#');

    for (const zoneDef of zoneDefinitions) {
        if (zoneDef.length < 2) continue;

        const zoneCoordsStr = zoneDef[0];
        const zoneScriptStr = zoneDef[1];

        // ac.a(zoneCoordsStr, '/', ',')
        const coordPairsRaw = splitAcString(zoneCoordsStr, '/', ',');
        const zones = coordPairsRaw.map(pairStr => {
            if (pairStr.length < 2) return [0,0]; // Should not happen with valid data
            return [parseInt(pairStr[0], 10), parseInt(pairStr[1], 10)];
        });

        // ac.a(zoneScriptStr, ';', ' ')
        const script = splitAcString(zoneScriptStr, ';', ' ');
        
        triggerZoneObjects.push({
            zones: zones, // Array of [x, y]
            script: script // String[][]
        });
    }
    return triggerZoneObjects;
}

// --- Main SCE Parser ---
function parseSceFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        return null;
    }

    try {
        const buffer = fs.readFileSync(filePath);
        const offsetObj = { offset: 0 };
        const sceneData = {};

        console.log(`Initial buffer length: ${buffer.length}`);

        // 1. Mappic ID
        const mappicIdByte = buffer.readUInt8(offsetObj.offset);
        offsetObj.offset += 1;
        sceneData.mappic = `mappic_${mappicIdByte}`;
        console.log(`After mappicId: offset=${offsetObj.offset}, value=${mappicIdByte}`);

        // 2. Mapdata ID
        sceneData.mapdataId = buffer.readUInt8(offsetObj.offset);
        offsetObj.offset += 1;
        console.log(`After mapdataId: offset=${offsetObj.offset}, value=${sceneData.mapdataId}`);

        // 3. Triggers (short[])
        console.log(`Before triggers: offset=${offsetObj.offset}`);
        sceneData.triggers = readAcShortArray(buffer, offsetObj);
        console.log(`After triggers: offset=${offsetObj.offset}, value=${JSON.stringify(sceneData.triggers)}`);

        // 4. A boolean flag (h.p)
        sceneData.pFlag = buffer.readUInt8(offsetObj.offset) !== 0;
        offsetObj.offset += 1;
        console.log(`After pFlag: offset=${offsetObj.offset}, value=${sceneData.pFlag}`);

        // 5. Trigger zones/events (this.y in h.java)
        console.log(`Before triggerZones: offset=${offsetObj.offset}`);
        sceneData.triggerZones = parseTriggerZones(buffer, offsetObj);
        console.log(`After triggerZones: offset=${offsetObj.offset}, value=${JSON.stringify(sceneData.triggerZones)}`);

        // 6. Scene script (this.r in h.java)
        console.log(`Before sceneScript: offset=${offsetObj.offset}`);
        sceneData.sceneScript = readAcScript(buffer, offsetObj);
        console.log(`After sceneScript: offset=${offsetObj.offset}, script lines=${sceneData.sceneScript ? sceneData.sceneScript.length : 0}`);
        // console.log(`Scene Script (first 5 lines): ${sceneData.sceneScript ? JSON.stringify(sceneData.sceneScript.slice(0,5)) : 'null'}`);


        // 7. Number of sprites
        console.log(`Before numSprites read: offset=${offsetObj.offset}`);
        if (offsetObj.offset + 3 >= buffer.length) { // Check if enough bytes for int (4 bytes)
             sceneData.sprites = [];
             sceneData.spriteInitialPositions = [];
             console.warn("Warning: Reached end of file before reading sprite count. Assuming 0 sprites.");
             return sceneData;
        }

        // Log the bytes that will be read as numSprites
        if (offsetObj.offset + 4 <= buffer.length) {
            console.log(`Bytes for numSprites: ${buffer.readUInt8(offsetObj.offset).toString(16).padStart(2,'0')} ${buffer.readUInt8(offsetObj.offset+1).toString(16).padStart(2,'0')} ${buffer.readUInt8(offsetObj.offset+2).toString(16).padStart(2,'0')} ${buffer.readUInt8(offsetObj.offset+3).toString(16).padStart(2,'0')}`);
        } else {
            console.log(`Not enough bytes remaining for numSprites. Remaining: ${buffer.length - offsetObj.offset}`);
        }

        const numSprites = buffer.readInt32BE(offsetObj.offset);
        offsetObj.offset += 4;
        console.log(`After numSprites read: offset=${offsetObj.offset}, numSprites=${numSprites}`);

        sceneData.sprites = [];
        sceneData.spriteInitialPositions = [];


        for (let i = 0; i < numSprites; i++) {
            console.log(`--- Reading sprite ${i + 1}/${numSprites} ---`);
            console.log(`Sprite loop start: offset=${offsetObj.offset}`);
            if (offsetObj.offset >= buffer.length) {
                console.warn(`Warning: Reached end of file while reading sprite ${i + 1}/${numSprites}. Breaking loop.`);
                break;
            }
            const sprite = {};

            // internalId
            if (offsetObj.offset + 0 >= buffer.length) { console.error("EOF before internalId"); break; }
            sprite.internalId = buffer.readInt8(offsetObj.offset); offsetObj.offset += 1;
            console.log(`  internalId: offset=${offsetObj.offset}`);

            // name
            console.log(`  Before name: offset=${offsetObj.offset}`);
            sprite.name = readAcString(buffer, offsetObj);
            console.log(`  After name: offset=${offsetObj.offset}`);
            
            // startTileX
            console.log(`  Before startTileX: offset=${offsetObj.offset}, remaining bytes: ${buffer.length - offsetObj.offset}`);
            if (offsetObj.offset + 1 >= buffer.length) { console.error("EOF before startTileX"); break; }
            const startTileX = buffer.readInt16BE(offsetObj.offset); offsetObj.offset += 2; // This is line ~229
            console.log(`  startTileX: offset=${offsetObj.offset}`);
            
            // startTileY
            if (offsetObj.offset + 1 >= buffer.length) { console.error("EOF before startTileY"); break; }
            const startTileY = buffer.readInt16BE(offsetObj.offset); offsetObj.offset += 2;
            sceneData.spriteInitialPositions.push({x: startTileX, y: startTileY});
            console.log(`  startTileY: offset=${offsetObj.offset}`);

            // initialDirection
            if (offsetObj.offset + 0 >= buffer.length) { console.error("EOF before initialDirection"); break; }
            sprite.initialDirection = buffer.readUInt8(offsetObj.offset); offsetObj.offset += 1;
            // ... (add more checks for other fields if needed) ...
            
            sprite.initialState = buffer.readUInt8(offsetObj.offset); offsetObj.offset += 1;
            sprite.speedType = buffer.readUInt8(offsetObj.offset); offsetObj.offset += 1;
            sprite.animationSpeedType = buffer.readUInt8(offsetObj.offset); offsetObj.offset += 1;
            console.log(`  After animSpeedType: offset=${offsetObj.offset}`);
            
            sprite.animationDefinitionId = readAcString(buffer, offsetObj);
            console.log(`  After animDefId: offset=${offsetObj.offset}`);
            const graphicBaseId = readAcString(buffer, offsetObj);
            sprite.spriteGraphicId = graphicBaseId ? `sprite_${graphicBaseId}`: null;
            console.log(`  After graphicBaseId: offset=${offsetObj.offset}`);
            sprite.behaviorControllerId = readAcString(buffer, offsetObj);
            console.log(`  After behaviorCtrlId: offset=${offsetObj.offset}`);
            
            sprite.spriteScript = readAcScript(buffer, offsetObj);
            console.log(`  After spriteScript: offset=${offsetObj.offset}`);
            if (offsetObj.offset + 0 >= buffer.length) { console.error("EOF before typeOrFaction"); break; }
            sprite.typeOrFaction = buffer.readUInt8(offsetObj.offset); offsetObj.offset += 1;
            console.log(`  After typeOrFaction: offset=${offsetObj.offset}`);
            sprite.interactionScript = readAcScript(buffer, offsetObj);
            console.log(`  After interactionScript: offset=${offsetObj.offset}`);
            
            sceneData.sprites.push(sprite);
        }

        return sceneData;

    } catch (error) {
        console.error(`Error parsing SCE file ${filePath}:`, error);
        return null;
    }
}

module.exports = parseSceFile;

