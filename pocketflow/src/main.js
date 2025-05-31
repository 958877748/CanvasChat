const { Node, Flow } = require('pocketflow');
const { ReadFilesByExtension } = require('./ReadFilesByExtension');
const { SceneFileParser } = require('./SceneFileParser');
const CreateJsonFile = require('./SaveJsonFile');

// 创建节点实例
const fileReader = new ReadFilesByExtension();
const sceneParser = new SceneFileParser();
const createJsonFile = new CreateJsonFile();

// 创建流程
fileReader.on("continue", sceneParser);
sceneParser.on("continue", sceneParser);
sceneParser.on("end", createJsonFile);
createJsonFile.on("continue", createJsonFile);
createJsonFile.on("end", new Node());

// 启动
const shared = {
    readDir: 'C:/Users/guole/Documents/GitHub/jar_game_chcb/jar2/scene',  // 修改为场景文件目录
    extension: 'sce',  // 修改为场景文件扩展名
    jsonDir: 'C:/Users/guole/Documents/GitHub/jar_game_chcb/cocos/assets/scene',  // 修改为输出目录
};

// 启动工作流
new Flow(fileReader).run(shared);