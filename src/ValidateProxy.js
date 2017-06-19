const Bluebird = require('bluebird');
const request = require('request');


/**
 * 
 * @param {string} protocol 
 * @param {string} address 
 * @param {string} port 
 * @param {number} timeout
 * @param {string} to
 */
let ValidateProxy = function (protocol, address, port, timeout = 2000, to = 'http://baidu.com') {

    return new Bluebird((resolve, reject) => {

        let startTime = new Date();
        request({
            url: to,
            proxy: `${protocol}://${address}:${port}`,
            timeout: timeout
        }, (err, resp, body) => {

            if (err) return reject(new Error('VALID_PROXY_ERROR'));

            let endTime = new Date();
            let goodResult = {
                protocol: protocol,
                ip: proxyAddress,
                port: port,
                ms: endTime.getTime() - startTime.getTime(),
                badCount: 0
            };
            if (resp.statusCode == 200) return resolve(goodResult);

            return reject(new Error('VALID_PROXY_FAILED'));

        });
    });
}

module.exports = ValidateProxy;