const PromisePool = require('es6-promise-pool');
const Bluebird = require('bluebird');
const request = require('request');
const _ = require('lodash');
const Iconv = require('iconv-lite');

const ping = require('./ValidateProxy');


// todo: 本地存储一些已经拿下来的ip地址

class Daili {

    constructor(options) {

        this.checking = false;
        this.lastCheck = new Date() - 1000 * 60 * 30;
        this.poolMayBad = [];
        this.pool = [];

        this._adapters = options.adapters;


        this.poolSize = options.poolSize || 10;

        this.getNewProxyCount = options.getNewProxyCount || 10;
        this.api = options.api;

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

            if (new Data() - this.lastCheck > 1000 * 60 * 30 && !this.checking) {
                // todo: get all proxy needed to check , put into a queue
                // todo: checking = true
                // todo: do async check
                // todo: after checked , set checking = false, this.lastCheck = new Date();
            }

            if (this.pool.length >= this.poolSize) {
                await Bluebird.delay(1000);
                continue;
            }

            await new Bluebird(async function (resolve, reject) {

                try {

                    // todo: make many adapter to get different website's proxies
                    let result = await this.getNewProxy(this.getNewProxyCount, this.getProxyListTimeout);

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

    // 这个 promise pool 有点问题
    // 已知问题
    // 1. 当producer是async函数的时候，await pool.start() 永远不会停止，因为 async 函数里面即使return null，也是一个promise，不是null？（猜测，待验证）
    // 2. 当producer里面所有的promise都是reject的，整个pool可能会忽略 producer 的return null条件，直接结束了 pool 这个promise
    promiseProducer() {
        // console.log('验证之前的条件判断');
        // console.log(this.poolMayBad.length, this.pool.length, CFG.IP_POOL_SIZE);

        if (this.poolMayBad.length === 0)
            return null;

        return new Bluebird(async (resolve, reject) => {

            try {
                // await Bluebird.delay(_.random(CFG.IP_PROXY_GETTING_RANDOM_DELAY_MIN_MS, CFG.IP_PROXY_GETTING_RANDOM_DELAY_MAX_MS));

                // todo: format ip to {protocol: '', address: '', port: ''}
                let ip = this.poolMayBad.shift();

                let goodIp = await ping(ip.protocol, ip.address, ip.port, this.validateProxyTimeoutMs);
                // let goodIp = await this.ping(this.pingTarget, ip, this.validateProxyTimeoutMs);

                // todo: save good proxy to db
                this.pool.push(goodIp);

                return resolve(true);

            }
            catch (e) {
                if (e.message === 'VALID_PROXY_ERROR') { }
                if (e.message === 'VALID_PROXY_FAILED') { }
                return resolve(false);
            }
        });


    }

    getNewProxy(count, timeout) {
        // todo: need global timeout controll
        return Bluebird.any(this._adapters);
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