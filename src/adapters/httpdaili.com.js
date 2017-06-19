const request = require('request');
const Bluebird = require('bluebird');
const Iconv = require('iconv-lite');

const CFG = require('../../config');

let Adapter_httpdaili_dot_com = function (count) {

    return new Bluebird((resolve, reject) => {
        request({
            url: `${CFG.httpdaili_dot_com}${count}`,
            encoding: null,  // body返回二进制数据
            timeout: CFG.httpdaili_dot_com_timeout

        }, (err, resp, body) => {

            if (err) {
                return reject(new Error('GET_NEW_PROXY_ERROR'));
            };

            body = Iconv.encode(Iconv.decode(body, 'gb2312'), 'utf8').toString();

            if (resp.statusCode == 200 && /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(body)) {

                let result = [];
                let tmpArr = body.trim().split(/\r\n/);

                for (let i = 0; i < tmpArr.length; i++) {
                    let tmp = tmpArr[i].split(':');
                    result.push({
                        "protocol": "https",
                        "address": tmp[0],
                        "port": tmp[1]
                    });
                }

                return resolve(result);
            }

            return reject(new Error('GET_NEW_PROXY_FAILED'));

        });
    });
};

module.exports = Adapter_httpdaili_dot_com;