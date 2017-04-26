let express = require('express');
let Daili = require('./src/Daili');

let app = express();
let d = new Daili({
    poolSize: 50,
    getNewProxyCount: 100,
    api: ''
});

app.get('/ip', (req, res) => {
    // console.log('shit');

    let ip;
    try {
        ip = d.pick();
        return res.send(ip);
    }
    catch(e) {
        return res.send(400)
    }
});

app.get('/bad', (req, res) => {

    let ip = req.query.ip;
    console.log(`bad ip ${ip}`);
    d.reportBadIp(ip);

    return res.send(200);
})


app.listen(3344, function () {
    console.log('listening on port 3344!');
});