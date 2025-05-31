const fs = require('fs');
const path = require('path');
const { Node } = require('pocketflow');

/**
 * 解析 .sce 场景文件节点
 * @extends {Node}
 */
class SceneFileParser extends Node {
    /**
     * 准备数据
     * @param {{foundSceneFiles: string[]}} shared - 共享数据对象，包含待处理的场景文件列表
     * @returns {string} 返回要处理的文件路径
     */
    async prep(shared) {
        return shared.foundSceneFiles.shift();
    }

    /**
     * 执行场景文件解析
     * @param {string} filePath - 场景文件路径
     * @returns {Promise<Object>} 解析后的场景数据
     */
    async exec(filePath) {
        if (!filePath) {
            return null;
        }
        return this._parseSceneFile(filePath);
    }

    /**
     * 处理解析结果
     * @param {{parsedScenes: [string, Object][]}} shared - 共享数据对象
     * @param {string} filePath - 文件路径
     * @param {Object} sceneData - 解析后的场景数据
     * @returns {Promise<string>} 返回 'continue' 继续处理下一个文件，'end' 结束处理
     */
    async post(shared, filePath, sceneData) {
        if (!sceneData) {
            return "end";
        }
        
        shared.parsedScenes = shared.parsedScenes || [];
        shared.parsedScenes.push([filePath, sceneData]);
        console.log(`已解析场景文件: ${filePath}`);
        return shared.foundSceneFiles.length > 0 ? "continue" : "end";
    }

    /**
     * 解析单个 .sce 文件
     * @private
     * @param {string} filePath - 文件路径
     * @returns {Promise<Object>} 解析后的场景数据
     */
    async _parseSceneFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                console.error(`错误: 文件不存在 ${filePath}`);
                return null;
            }

            const buffer = fs.readFileSync(filePath);
            const offsetObj = { offset: 0 };
            const sceneData = {};

            // 1. 读取地图图片ID
            sceneData.mappic = `mappic_${buffer.readUInt8(offsetObj.offset)}`;
            offsetObj.offset += 1;

            // 2. 读取地图数据ID
            sceneData.mapdataId = buffer.readUInt8(offsetObj.offset);
            offsetObj.offset += 1;

            // 3. 读取触发器
            sceneData.triggers = this._readAcShortArray(buffer, offsetObj);

            // 4. 读取标志位
            sceneData.pFlag = buffer.readUInt8(offsetObj.offset) !== 0;
            offsetObj.offset += 1;

            // 5. 读取触发区域
            sceneData.triggerZones = this._parseTriggerZones(buffer, offsetObj);

            // 6. 读取场景脚本
            sceneData.sceneScript = this._readAcScript(buffer, offsetObj);

            // 7. 读取精灵数据
            if (offsetObj.offset + 4 <= buffer.length) {
                const numSprites = buffer.readInt32BE(offsetObj.offset);
                offsetObj.offset += 4;

                sceneData.sprites = [];
                sceneData.spriteInitialPositions = [];

                for (let i = 0; i < numSprites; i++) {
                    if (offsetObj.offset >= buffer.length) break;

                    const sprite = {
                        internalId: buffer.readInt8(offsetObj.offset++),
                        name: this._readAcString(buffer, offsetObj),
                        initialDirection: buffer.readUInt8(offsetObj.offset++),
                        initialState: buffer.readUInt8(offsetObj.offset++),
                        speedType: buffer.readUInt8(offsetObj.offset++),
                        animationSpeedType: buffer.readUInt8(offsetObj.offset++),
                        animationDefinitionId: this._readAcString(buffer, offsetObj),
                        spriteGraphicId: (() => {
                            const graphicBaseId = this._readAcString(buffer, offsetObj);
                            return graphicBaseId ? `sprite_${graphicBaseId}` : null;
                        })(),
                        behaviorControllerId: this._readAcString(buffer, offsetObj),
                        spriteScript: this._readAcScript(buffer, offsetObj),
                        typeOrFaction: buffer.readUInt8(offsetObj.offset++),
                        interactionScript: this._readAcScript(buffer, offsetObj)
                    };

                    // 读取精灵初始位置
                    const startTileX = buffer.readInt16BE(offsetObj.offset);
                    offsetObj.offset += 2;
                    const startTileY = buffer.readInt16BE(offsetObj.offset);
                    offsetObj.offset += 2;

                    sceneData.spriteInitialPositions.push({ x: startTileX, y: startTileY });
                    sceneData.sprites.push(sprite);
                }
            }

            return sceneData;
        } catch (error) {
            console.error(`解析场景文件 ${filePath} 时出错:`, error);
            return null;
        }
    }

    /**
     * 读取自定义格式的字符串
     * @private
     * @param {Buffer} buffer - 数据缓冲区
     * @param {{offset: number}} offsetObj - 偏移量对象
     * @returns {string|null} 读取的字符串
     */
    _readAcString(buffer, offsetObj) {
        if (offsetObj.offset >= buffer.length) {
            return null;
        }

        let length = buffer.readUInt8(offsetObj.offset++);
        if (length === 0) return null;

        if (length === 255) {
            if (offsetObj.offset + 1 >= buffer.length) return null;
            const k_val = buffer.readUInt16BE(offsetObj.offset);
            offsetObj.offset += 2;
            length = (k_val >> 8) | ((k_val & 0xFF) << 8);
        }

        if (offsetObj.offset + length > buffer.length) {
            return null;
        }

        const strBytes = buffer.subarray(offsetObj.offset, offsetObj.offset + length);
        offsetObj.offset += length;

        try {
            return new TextDecoder('utf-8').decode(strBytes);
        } catch (e) {
            console.warn("UTF-8 解码错误:", strBytes.toString('hex'));
            return null;
        }
    }

    /**
     * 读取自定义格式的脚本
     * @private
     * @param {Buffer} buffer - 数据缓冲区
     * @param {{offset: number}} offsetObj - 偏移量对象
     * @returns {string[][]|null} 解析后的脚本
     */
    _readAcScript(buffer, offsetObj) {
        const str = this._readAcString(buffer, offsetObj);
        return str && str.length > 0 ? this._splitAcString(str, ';', ' ') : null;
    }

    /**
     * 读取短整型数组
     * @private
     * @param {Buffer} buffer - 数据缓冲区
     * @param {{offset: number}} offsetObj - 偏移量对象
     * @returns {number[]|null} 短整型数组
     */
    _readAcShortArray(buffer, offsetObj) {
        const scriptArray = this._readAcScript(buffer, offsetObj);
        if (scriptArray && scriptArray.length > 0 && scriptArray[0]) {
            return scriptArray[0].map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        }
        return null;
    }

    /**
     * 解析触发区域
     * @private
     * @param {Buffer} buffer - 数据缓冲区
     * @param {{offset: number}} offsetObj - 偏移量对象
     * @returns {Array<{zones: number[][], script: string[][]}>|null} 触发区域数据
     */
    _parseTriggerZones(buffer, offsetObj) {
        const mainStr = this._readAcString(buffer, offsetObj);
        if (!mainStr) return null;

        const triggerZoneObjects = [];
        const zoneDefinitions = this._splitAcString(mainStr, '$', '#');

        for (const zoneDef of zoneDefinitions) {
            if (zoneDef.length < 2) continue;

            const zoneCoordsStr = zoneDef[0];
            const zoneScriptStr = zoneDef[1];

            const coordPairsRaw = this._splitAcString(zoneCoordsStr, '/', ',');
            const zones = coordPairsRaw.map(pairStr => {
                return pairStr.length >= 2 ? 
                    [parseInt(pairStr[0], 10), parseInt(pairStr[1], 10)] : 
                    [0, 0];
            });

            const script = this._splitAcString(zoneScriptStr, ';', ' ');
            
            if (zones.length > 0) {
                triggerZoneObjects.push({
                    zones: zones,
                    script: script
                });
            }
        }

        return triggerZoneObjects.length > 0 ? triggerZoneObjects : null;
    }

    /**
     * 分割字符串
     * @private
     * @param {string} inputString - 输入字符串
     * @param {string} outerDelimiter - 外部分隔符
     * @param {string} innerDelimiter - 内部分隔符
     * @returns {string[][]} 分割后的二维字符串数组
     */
    _splitAcString(inputString, outerDelimiter, innerDelimiter) {
        if (!inputString) return [];
        const result = [];
        let inQuote = false;
        const outerSplits = [];
        let lastOuterSplit = 0;

        // 外部分割
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

        // 内部分割
        for (const outerPart of outerSplits) {
            if (outerPart.trim() === "") continue;
            const innerSplitsRaw = [];
            let lastInnerSplit = 0;
            inQuote = false;

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
                if (str.startsWith('"') && str.endsWith('"')) {
                    let quoteCount = 0;
                    for (let k = 0; k < str.length; k++) {
                        if (str[k] === '"' && (k === 0 || str[k - 1] !== '\\')) {
                            quoteCount++;
                        }
                    }
                    if (quoteCount <= 2) {
                        str = str.substring(1, str.length - 1);
                    }
                }
                return str.replace(/\\"/g, '"');
            });
            result.push(cleanedInnerSplits);
        }

        return result;
    }
}

module.exports = { SceneFileParser };