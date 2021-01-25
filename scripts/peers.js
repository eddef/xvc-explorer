var mongoose = require('mongoose')
  , lib = require('../lib/explorer')
  , db = require('../lib/database')
  , settings = require('../lib/settings')
  , request = require('request');

var COUNT = 5000; //number of blocks to index

function exit() {
  mongoose.disconnect();
  process.exit(0);
}

var dbString = 'mongodb://' + settings.dbsettings.user;
dbString = dbString + ':' + settings.dbsettings.password;
dbString = dbString + '@' + settings.dbsettings.address;
dbString = dbString + ':' + settings.dbsettings.port;
dbString = dbString + '/' + settings.dbsettings.database;

mongoose.connect(dbString, function(err) {
  if (err) {
    console.log('Unable to connect to database: %s', dbString);
    console.log('Aborting');
    exit();
  } else {
      var headers = {
          'content-type': 'text/plain;'
       };
     var dataString = '{"jsonrpc": "1.0", "id":"curltest", "method": "getpeerinfo"}';
     var options = {
        url: 'http://127.0.0.1:9195/',
        method: 'POST',
        headers: headers,
        body: dataString,
        //json: true
     }
    request(options, function (error, response, rawbody) {
        //console.log(JSON.parse(rawbody));
        const json_data = JSON.parse(rawbody);
        const body = json_data.result;
        //console.log(body);
        //console.log(body.length)
      lib.syncLoop(body.length, function (loop) {
        //console.log(body.length);
        var i = loop.iteration();
        var portSplit = body[i].addr.lastIndexOf(":");
        var port = "";
        if (portSplit < 0) {
          portSplit = body[i].addr.length;
        } else {
          port = body[i].addr.substring(portSplit+1);
        }
        var address = body[i].addr.substring(0,portSplit);
        db.find_peer(address, function(peer) {
          if (peer) {
            if (isNaN(peer['port']) || peer['port'].length < 2 || peer['country'].length < 1 || peer['country_code'].length < 1) {
              db.drop_peers(function() {
                console.log('Saved peers missing ports or country, dropping peers. Re-reun this script afterwards.');
                exit();
              });
            }
            // peer already exists
            loop.next();
          } else {
            request({uri: 'https://freegeoip.app/json/' + address, json: true}, function (error, response, geo) {
              db.create_peer({
                address: address,
                port: port,
                protocol: body[i].version,
                version: body[i].subver.replace('/', '').replace('/', ''),
                country: geo.country_name,
                country_code: geo.country_code
              }, function(){
                loop.next();
              });
            });
          }
        });
      }, function() {
        exit();
      });
    });
  }
});
