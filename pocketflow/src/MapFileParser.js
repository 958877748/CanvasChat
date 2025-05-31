const { Node } = require('pocketflow');
const parseMapFile = require('./utils/parseMapFile');

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
        return parseMapFile(filePath);
    }

    /**
     * 处理结果
     * @param {{savedJsons: [string, Object][]}} shared - 共享数据对象
     * @param {string} prepRes - prep返回的结果
     * @param {Object} execRes - exec返回的结果
     */
    async post(shared, prepRes, execRes) {
        // 将解析结果保存到共享数据中
        shared.savedJsons = shared.savedJsons || [];
        shared.savedJsons.push([prepRes, execRes]);
        console.log(`已解析: ${prepRes}`, execRes);

        if (shared.foundFiles.length > 0) {
            return "continue";
        } else {
            return "end";
        }
    }
}

module.exports = { MapFileParser };
