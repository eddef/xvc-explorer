var request = require('request');
var crypto = require('crypto');
//var settings = require('./settings-market-example.json');
var base_url = 'https://api.freiexchange.com';

//
//  Get Market From Fides-ex
//
function get_summary(coin, exchange, cb) {
  var summary = {};
  var url=base_url + '/public/ticker/' + coin.toUpperCase();

  request({uri: url, json: true}, function (error, response, body) {
    if (error) {
      return cb(error, null);
    } else if (body.error !== true) {
      summary['ask'] = parseFloat(body['XVC_BTC'][0]['lowestSell']).toFixed(8);
      summary['bid'] = parseFloat(body['XVC_BTC'][0]['highestBuy']).toFixed(8);
      summary['volume'] = parseFloat(body['XVC_BTC'][0]['volume24h']).toFixed(8);
      summary['volume_btc'] = parseFloat(body['XVC_BTC'][0]['volume24h_btc']).toFixed(8);
      summary['high'] = parseFloat(body['XVC_BTC'][0]['high']).toFixed(8);
      summary['low'] = parseFloat(body['XVC_BTC'][0]['low']).toFixed(8);
      summary['last'] = parseFloat(body['XVC_BTC'][0]['last']).toFixed(8);
      summary['change'] = parseFloat(body['XVC_BTC'][0]['percent_change_24h']);
      return cb(null, summary);
    } else {
      return cb(error, null);
    }
  });
}
// Get Trades
function get_trades(coin, exchange, cb) {
  var req_url=base_url + '/public/trades/' + coin.toUpperCase();
  request({uri: req_url, json: true}, function (error, response, body) {
    if (body.error) {
      return cb(body.error, []);
    } else {
      return cb(null, body['data']);
    }
  });
}



function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/public/orderbook/'  + coin;
  request({uri: req_url, json: true}, function (error, response, body) {
    if (body.success == true) {
      var orders = body.result;
      var buys = [];
      var sells = [];
      if (orders['BUY'].length > 0){
          for (var i = 0; i < orders['BUY'].length; i++) {
            var order = {
              amount: parseFloat(orders.buy[i].Quantity).toFixed(8),
              price: parseFloat(orders.buy[i].Rate).toFixed(8),
              //  total: parseFloat(orders.buy[i].Total).toFixed(8)
              // Necessary because API will return 0.00 for small volume transactions
              total: (parseFloat(orders.buy[i].Quantity).toFixed(8) * parseFloat(orders.buy[i].Rate)).toFixed(8)
            }
            buys.push(order);
          }
      }
      if (orders['SELL'].length > 0) {
        for (var x = 0; x < orders['SELL'].length; x++) {
            var order = {
                amount: parseFloat(orders.sell[x].Quantity).toFixed(8),
                price: parseFloat(orders.sell[x].Rate).toFixed(8),
                //    total: parseFloat(orders.sell[x].Total).toFixed(8)
                // Necessary because API will return 0.00 for small volume transactions
                total: (parseFloat(orders.sell[x].Quantity).toFixed(8) * parseFloat(orders.sell[x].Rate)).toFixed(8)
            }
            sells.push(order);
        }
      }
      return cb(null, buys, sells);
    } else {
      return cb(body.message, [], []);
    }
  });
}

module.exports = {
  get_data: function(settings, cb) {
    var error = null;
    get_orders(settings.coin, settings.exchange, function(err, buys, sells) {
     if (err) { error = err; }
      get_trades(settings.coin, settings.exchange, function(err, trades) {
        if (err) { error = err; }
        get_summary(settings.coin, settings.exchange,  function(err, stats) {
          if (err) { error = err; }
          //Note that chartdata is available for an API, but I can't get it to return anything
          //return cb(error, {buys: buys, sells: sells, chartdata: [], trades: trades, stats: stats});
          return cb(error, {buys: buys, sells: sells, chartdata: [], trades: trades, stats: stats});
        });
      });
    });
  }
};
