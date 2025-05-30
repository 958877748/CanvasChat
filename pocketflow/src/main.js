// 在flow.js中
const { ReadFilesByExtension } = require('./ReadFilesByExtension');
const { Node, Flow } = require('pocketflow');
const { MapFileParser } = require('./MapFileParser');
const CreateJsonFile = require('./CreateJsonFile');


// 创建节点实例
const fileReader = new ReadFilesByExtension();
const mapParser = new MapFileParser();
const createJsonFile = new CreateJsonFile();

// 创建流程
fileReader.on("continue", mapParser);
mapParser.on("continue", mapParser);
mapParser.on("end", createJsonFile);
createJsonFile.on("continue", createJsonFile);
createJsonFile.on("end", new Node());

// 启动
const shared = {
    readDir: 'C:/Users/guole/Documents/GitHub/jar_game_chcb/jar2/mapdata',
    extension: 'map',
    jsonDir: 'C:/Users/guole/Documents/GitHub/jar_game_chcb/cocos/assets/mapdata',
};
new Flow(fileReader).run(shared);