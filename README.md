## 配置项
* poolSize
* getNewProxyCount
* api
* port

## 使用示例
```
// server.js
let HttpProxyPool = require('http-proxy-pool');

console.log(HttpProxyPool);

HttpProxyPool({
    poolSize: 50,
    getNewProxyCount: 100,
    api: '取得代理地址的api',
    port: 3344
});

// task.js
// get ip
// http get http://localhost:3344/ip -> return 123.123.123.123:1232
// report bad ip
// http get http://localhost:3344/bad?ip=123.123.123.123:1232


```

#### todo
* 自动清理策略
* 自动维护优质代理策略
* 数据库记录

