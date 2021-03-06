var hive = require('steem-js-patched');
var fs = require('fs')
const request = require('request');

var config = JSON.parse(fs.readFileSync('./config.json'))

var money = require('./money.js')
var create = require('./createToken.js')
var whitelist = fs.readFileSync('whitelist.txt').toString().split("\n");
//remove empty strings & spaces in strings
whitelist = (whitelist.filter(item => item)).map(str => str.replace(/\s/g, ''));

var price = config.price

module.exports = {
  getPayment: async function getPayment(){
    console.log('Scanning blockchain...')
  	hive.api.streamTransactions('head', async function(err, result) {
  		if (err){
        restart()
        console.log("Error scanning blockchain: "+err)
      } else{
        try {
          let type = result.operations[0][0]
          let data = result.operations[0][1]
          if(type == 'transfer' && data.to == config.account && data.memo == 'account_creation'){
            var amount = data.amount.split(" ")[0]
            var currency = data.amount.split(" ")[1]
            if(amount < price.split(" ")[0] || currency != price.split(" ")[1]){
              money.refund(data.amount, data.from)
            } else {
              request('https://blacklist.usehive.com/user/'+data.from, function (error, res, body) {
                var body = JSON.parse(body)
                if(error) console.log('Error getting blacklist!')
                else {
                  if(config.blacklist != 'false' && body.blacklisted.length != '0' && !whitelist.includes(data.from)){
                    money.refundBlacklist(data.amount, data.from)
                  } else {
                    var number_of_tokens = Math.floor(amount / price.split(" ")[0])
                    var difference = amount - (number_of_tokens * price.split(" ")[0])
                    create.createToken(number_of_tokens, data.from)
                    if(difference > '0'){
                      money.refundDifference(difference, data.from, currency)
                    }
                  }
                }
              })
            }
          }
        } catch (err) {
          restart()
          console.log("Error scanning blockchain: "+err)
        }
      }
  	});
    function restart(){
      setTimeout(() => {
        getPayment()
      }, 15000)
    }
  }
}
