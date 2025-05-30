const fs = require('fs');
const path = require('path');
const { Node } = require('pocketflow');

/**
 * 解析 .map 文件节点
 * @extends {Node}
 */
class MapFileParser extends Node {
    /**
     * 准备数据
     * @param {{foundFiles: string[]}} shared - 共享数据对象
     */
    async prep(shared) {
        return shared.foundFiles.shift();
    }

    /**
     * 执行文件解析
     * @param {string} filePath - 文件路径
     */
    async exec(filePath) {
        if (!filePath) {
            return null;
        }
        return this._parseMapFile(filePath);
    }

    /**
     * 处理结果
     * @param {{parsedMaps: [string, Object][]}} shared - 共享数据对象
     * @param {string} prepRes - prep返回的结果
     * @param {Object} execRes - exec返回的结果
     */
    async post(shared, prepRes, execRes) {
        if (!execRes) {
            return "end";
        }
        // 将解析结果保存到共享数据中
        shared.parsedMaps = shared.parsedMaps || [];
        shared.parsedMaps.push([prepRes, execRes]);
        console.log(`已解析: ${prepRes}`, execRes);
        return "continue";
    }

    /**
     * 解析单个 .map 文件
     * @private
     * @param {string} filePath - 文件路径
     * @returns {Promise<Object>} 解析后的地图数据
     */
    async _parseMapFile(filePath) {
        return new Promise((resolve, reject) => {
            try {
                if (!fs.existsSync(filePath)) {
                    throw new Error(`File not found at ${filePath}`);
                }

                const buffer = fs.readFileSync(filePath);
                let offset = 0;
                const mapData = {};

                // 1. 地图宽度
                if (offset + 3 >= buffer.length) {
                    throw new Error("Unexpected end of file before mapWidth");
                }
                mapData.width = buffer.readInt32BE(offset);
                offset += 4;

                // 2. 地图高度
                if (offset + 3 >= buffer.length) {
                    throw new Error("Unexpected end of file before mapHeight");
                }
                mapData.height = buffer.readInt32BE(offset);
                offset += 4;

                // 3. 图层数量
                if (offset >= buffer.length) {
                    throw new Error("Unexpected end of file before numLayers");
                }
                mapData.numLayers = buffer.readUInt8(offset);
                offset += 1;

                const totalTilesPerLayer = mapData.width * mapData.height;
                mapData.layers = [];

                // 4. 第一层图块数据（背景层）
                if (offset + totalTilesPerLayer > buffer.length) {
                    throw new Error("Unexpected end of file before layer 1 data");
                }
                const layer1Data = [];
                for (let i = 0; i < totalTilesPerLayer; i++) {
                    layer1Data.push(buffer.readUInt8(offset + i));
                }
                mapData.layers.push({ type: "background", tiles: layer1Data });
                offset += totalTilesPerLayer;

                // 5. 第二层图块数据（前景层，可选）
                if (mapData.numLayers > 2) {
                    if (offset + totalTilesPerLayer > buffer.length) {
                        throw new Error("Unexpected end of file before layer 2 data");
                    }
                    const layer2Data = [];
                    for (let i = 0; i < totalTilesPerLayer; i++) {
                        layer2Data.push(buffer.readUInt8(offset + i));
                    }
                    mapData.layers.push({ type: "foreground", tiles: layer2Data });
                    offset += totalTilesPerLayer;
                }

                // 6. 第三层图块数据（碰撞/属性层）
                if (offset + totalTilesPerLayer > buffer.length) {
                    throw new Error("Unexpected end of file before attribute layer data");
                }
                const attributeLayerData = [];
                for (let i = 0; i < totalTilesPerLayer; i++) {
                    attributeLayerData.push(buffer.readUInt8(offset + i));
                }
                mapData.layers.push({ type: "attribute", tiles: attributeLayerData });
                offset += totalTilesPerLayer;

                // 7. 动画图块定义
                mapData.animatedTiles = [];
                if (offset < buffer.length) {
                    const numAnimatedTiles = buffer.readUInt8(offset);
                    offset += 1;

                    for (let i = 0; i < numAnimatedTiles && offset < buffer.length; i++) {
                        if (offset >= buffer.length) break;
                        const animationSpeed = buffer.readUInt8(offset);
                        offset += 1;

                        if (offset >= buffer.length) break;
                        const numFramesInAnimation = buffer.readUInt8(offset);
                        offset += 1;

                        const animationFrames = [];
                        if (offset + numFramesInAnimation > buffer.length) break;
                        for (let j = 0; j < numFramesInAnimation; j++) {
                            animationFrames.push(buffer.readUInt8(offset + j));
                        }
                        offset += numFramesInAnimation;
                        mapData.animatedTiles.push({ speed: animationSpeed, frames: animationFrames });
                    }

                    if (offset < buffer.length) {
                        console.warn(`Warning: ${buffer.length - offset} unparsed bytes remaining at the end of the .map file.`);
                    }
                }

                resolve(mapData);
            } catch (error) {
                reject(new Error(`Error parsing .map file ${filePath}: ${error.message}`));
            }
        });
    }
}

module.exports = { MapFileParser };
