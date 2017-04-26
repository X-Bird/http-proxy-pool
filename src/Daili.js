let PromisePool = require('es6-promise-pool');
let Bluebird = require('bluebird');
let request = require('request');
let _ = require('lodash');
let Iconv = require('iconv-lite');


// todo: 本地存储一些已经拿下来的ip地址

class Daili {

    constructor(options) {

        this.poolMayBad = [];
        this.pool = [];
        // this.doingCount = 0;
        // this.threshold = 5;
        this.poolSize = options.poolSize || 10;

        this.getNewProxyCount = options.getNewProxyCount || 10;
        this.api = options.api;

        // this.DOING_FLAG = false;

        // this.randomDelayMin = options.randomDelayMin || 5000;
        // this.randomDelayMax = options.randomDelayMax || 10000;
        this.pingTarget = options.pingTarget || 'http://baidu.com';
        this.maintainConcurrency = options.maintainConcurrency || 10;
        this.getProxyListTimeout = options.getProxyListTimeout || 30000;
        this.validateProxyTimeoutMs = options.validateProxyTimeoutMs || 2000;

        setInterval(function () {
            console.log(`poolMayBad length: ${this.poolMayBad.length}, pool length: ${this.pool.length}`);
        }.bind(this), 10000);

        this.maintain();

    }

    async maintain() {

        while (true) {

            if (this.pool.length >= this.poolSize) {
                await Bluebird.delay(5000);
                continue;
            }


            // if (this.poolMayBad.length < CFG.IP_POOL_MAY_BAD_SIZE && this.doingCount <= this.threshold) {
            // console.log('go on');
            // this.doingCount++;

            await new Bluebird(async function (resolve, reject) {
                try {

                    let  result = await this.getNewProxy(this.getNewProxyCount, this.getProxyListTimeout);

                    // console.log(result);

                    let pool = new PromisePool(this.promiseProducer.bind(this), this.maintainConcurrency, { promise: Bluebird });

                    // let ip = await (new PromisePool(this.promiseProducer.bind(this), 1, { promise: Bluebird }))
                    // setInterval(function () { console.log(pool.isRejected, pool.isFulfilled) }.bind(this), 2000);
                    await pool.start();
                    // console.log('one round ');

                }
                catch (e) {
                    if (e.message === 'GET_NEW_PROXY_ERROR') {
                        // console.log('GET_NEW_PROXY_ERROR');
                    }
                    // never reject
                    // return Bluebird.reject(e);
                }
                finally {
                    console.log('finally');
                    return resolve(true);
                }
            }.bind(this));

            // console.log('finally');

            // this.doingCount--;
            // }
        }
    }

    pick() {
        if (this.pool.length > 0) {
            return this.pool[_.random(0, this.pool.length - 1)].ip;
        }
        throw new Error('NO_PROXY');
    }

    ping(webUrl, proxyAddress, timeout) {

        return new Bluebird(function (resolve, reject) {

            var startTime = new Date();
            request({
                url: webUrl,
                proxy: 'http://' + proxyAddress,
                timeout: timeout
            }, function (err, resp, body) {

                // console.log(6);

                var endTime = new Date();
                var goodResult = {
                    isGood: true,
                    ip: proxyAddress,
                    ms: endTime.getTime() - startTime.getTime(),
                    badCount: 0
                };

                if (err) return reject(new Error('VALID_PROXY_ERROR'));
                // console.log('验证成功一个');
                if (resp.statusCode == 200) return resolve(goodResult);

                return reject(new Error('VALID_PROXY_FAILED'));

            }.bind(this));
        })
    }

    // 这个 promise pool 有点问题
    // 已知问题
    // 1. 当producer是async函数的时候，await pool.start() 永远不会停止，因为 async 函数里面即使return null，也是一个promise，不是null？（猜测，待验证）
    // 2. 当producer里面所有的promise都是reject的，整个pool可能会忽略 producer 的return null条件，直接结束了 pool 这个promise
    promiseProducer() {
        // console.log('验证之前的条件判断');
        // console.log(this.poolMayBad.length, this.pool.length, CFG.IP_POOL_SIZE);

        if (this.poolMayBad.length === 0 || this.pool.length > this.poolSize)
            return null;

        return new Bluebird(async function (resolve, reject) {
            // console.log(10);
            // console.log('这里其实应该就是得开始进行验证了');



            try {
                // await Bluebird.delay(_.random(CFG.IP_PROXY_GETTING_RANDOM_DELAY_MIN_MS, CFG.IP_PROXY_GETTING_RANDOM_DELAY_MAX_MS));
                
                let ip = this.poolMayBad.shift();;
                // console.log(11);
                let goodIp = await this.ping(this.pingTarget, ip, this.validateProxyTimeoutMs);
                // console.log('validating proxy');
                // console.log('get one valid proxy');
                // console.log(12);
                this.pool.push(goodIp);

                return resolve(true);

            }
            catch (e) {
                if (e.message === 'VALID_PROXY_ERROR') { }
                if (e.message === 'VALID_PROXY_FAILED') { }
                // do nothing
                // console.log(e);
                // return Bluebird.reject(e);
                // console.log(13);
                return resolve(false);
            }
        }.bind(this));


    }

    getNewProxy(count, timeout) {
        // console.log('gettting new proxy');
        // console.log(this.poolMayBad.length, this.pool.length);
        // console.log(14);
        return new Bluebird(function (resolve, reject) {
            request({
                url: this.api + count,
                encoding: null,  // body返回二进制数据
                timeout: timeout
            }, function (err, resp, body) {
                // console.log(15);
                if (err) {
                    // console.log(16);
                    return reject(new Error('GET_NEW_PROXY_ERROR'));
                };

                // console.log('got new proxy list');

                body = Iconv.encode(Iconv.decode(body, 'gb2312'), 'utf8').toString();
                // console.log(body);

                if (resp.statusCode == 200 && /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(body)) {
                    let tmpArr = body.trim().split(/\r\n/);
                    // console.log(tmpArr);
                    for (let i = 0; i < tmpArr.length; i++) {
                        // console.log('add');
                        this.poolMayBad.push(tmpArr[i]);
                    }
                    return resolve(tmpArr);
                }

                return reject(new Error('GET_NEW_PROXY_FAILED'));

            }.bind(this));
        }.bind(this));
    }

    reportBadIp(ip) {
        var p = this.pool
            , index = 0;

        for (var i = 0; i < p.length; i++) {
            if (p[i].ip == ip) {
                p[i].badCount++;

                if (p[i].badCount >= 20)
                    p.splice(i, 1);
                break;
            }
        }
    }
}


module.exports = Daili;