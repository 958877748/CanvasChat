const { Node } = require('pocketflow');
const parseSceFile = require('./utils/parseSceFile');

/**
 * 解析 .sce 场景文件节点
 * @extends {Node}
 */
class SceneFileParser extends Node {
    /**
     * 准备数据
     * @param {{foundFiles: string[]}} shared - 共享数据对象，包含待处理的场景文件列表
     * @returns {string} 返回要处理的文件路径
     */
    async prep(shared) {
        return shared.foundFiles.shift();
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
        return parseSceFile(filePath);
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
        
        shared.savedJsons = shared.savedJsons || [];
        shared.savedJsons.push([filePath, sceneData]);
        console.log(`已解析场景文件: ${filePath}`);
        return shared.foundFiles.length > 0 ? "continue" : "end";
    }
}

module.exports = { SceneFileParser };