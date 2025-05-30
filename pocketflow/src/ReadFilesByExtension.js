const fs = require('fs').promises;
const path = require('path');
const { Node } = require('pocketflow');

/**
 * 读取指定目录下特定后缀的文件节点
 */
class ReadFilesByExtension extends Node {

    /**
     * 准备数据
     */
    async prep(shared) {
        return shared;
    }

    /**
     * 执行文件查找
     * @param {{ readDir: string, extension: string }} shared - 共享数据对象
     */
    async exec({ readDir, extension }) {
        return this._findFiles(readDir, extension);
    }

    /**
     * 处理结果
     * @param {Object} shared - 共享数据对象
     * @param {string} prepRes - prep返回的结果
     * @param {string[]} execRes - exec返回的结果
     */
    async post(shared, prepRes, execRes) {
        shared.foundFiles = execRes;
        console.log('找到的文件:', shared.foundFiles);
        return "continue";
    }

    /**
     * 递归查找文件
     * @private
     * @param {string} dir - 要搜索的目录
     * @param {string} extension - 文件扩展名
     * @returns {Promise<string[]>} 找到的文件路径数组
     */
    async _findFiles(dir, extension) {
        let results = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // 如果是目录且需要递归，则递归查找
                    const subFiles = await this._findFiles(fullPath);
                    results = results.concat(subFiles);
                } else if (entry.isFile()) {
                    // 检查文件扩展名是否匹配
                    const ext = path.extname(entry.name).toLowerCase();
                    const targetExt = extension.startsWith('.')
                        ? extension.toLowerCase()
                        : `.${extension.toLowerCase()}`;

                    if (!extension || ext === targetExt) {
                        results.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`读取目录 ${dir} 时出错:`, error);
            throw error;
        }

        return results;
    }
}

module.exports = { ReadFilesByExtension };
