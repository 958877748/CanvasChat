const fs = require('fs/promises');
const path = require('path');
const { Node } = require('pocketflow');

/**
 * 创建JSON文件节点
 */
class CreateJsonFile extends Node {

    /**
     * 准备数据
     * @param {{savedJsons: [string, Object][]}} shared - 共享数据对象
     */
    async prep(shared) {
        return [shared.jsonDir, shared.savedJsons.shift()];
    }

    /**
     * 创建JSON文件
     */
    async exec([jsonDir, [filePath, jsonData]]) {
        // 拿到文件名 并去除后缀
        const fileName = path.basename(filePath).replace('.sce', '.json');
        const absolutePath = path.resolve(process.cwd(), jsonDir, fileName);

        // 确保目录存在
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });

        // 写入JSON文件
        const jsonString = JSON.stringify(jsonData);
        await fs.writeFile(absolutePath, jsonString, 'utf8');

        return absolutePath;
    }

    /**
     * 处理结果
     */
    async post(shared, prepRes, execRes) {
        console.log(`JSON文件已创建: ${execRes}`);
        if (shared.savedJsons.length > 0) {
            return "continue";
        } else {
            return "end";
        }
    }
}

module.exports = CreateJsonFile;
