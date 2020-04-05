var express =  require("express");
var app = express();
var bodyParser = require("body-parser");
var hive = require('steem-js-patched');
var fs = require('fs')
const dsteem = require('dsteem');

var con = require('./database.js')

var config = JSON.parse(fs.readFileSync('config.json'))


hive.api.setOptions({ url: config.rpc });
const client = new dsteem.Client(config.rpc);

var payment = require("./scripts/payment.js")
var create = require('./scripts/createToken.js')
var claim = require('./scripts/claim.js')


if(config.accept_payment == 'true'){
	payment.getPayment()
}

if(config.claim == 'true'){
	claim.claimAccount()
}

//remove header
app.disable('x-powered-by');
//create express connection and serve static files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static('images'));
app.use(express.static('dest'));
app.set('view engine', 'ejs');
app.use(bodyParser.json()); // for parsing application/json


app.get('/', (req, res) => {
	res.render('index')
})

app.post('/code', (req, res) => {
	var code = req.body.code
	var sql = 'SELECT * FROM tokens WHERE id=?;'
	con.query(sql, [code], (err, result) => {
		if(err){
			console.log('Error selecting token! ' + err)
			res.status(500)
		}
		else{
			if(result.length != 0){
				if(result[0].status != '1'){
					res.setHeader('Content-Type', 'application/json');
			    res.end(JSON.stringify({ valid: true, code: code }));
				}
				else{
					res.setHeader('Content-Type', 'application/json');
			    res.end(JSON.stringify({ valid: false, code: code }));
				}
			}
			else{
				res.setHeader('Content-Type', 'application/json');
		    res.end(JSON.stringify({ valid: false, code: code }));
			}
		}
	})
})

app.post('/createAccount', (req, res) => {
	var code = req.body.code
	var name = req.body.name
	var key = req.body.key

	var sql = 'SELECT * FROM tokens WHERE id=? AND status <> "1";'
	create.updateToken(code)
	con.query(sql, [code], (err, result) => {
		if(err){
			console.log('Error selecting token! ' + err)
			res.status(500)
		}
		else{
			if(result.length != 0 && result[0].status !='1'){


				/*const jsonMetadata = JSON.stringify(['account_creation_service', {
				  creator: config.account,
					price: config.price
				}]);
				var wif = config.key
				var fee = '0.000 HIVE'
				var creator = config.account
				var publicKeys = JSON.stringify(hive.auth.generateKeys(name, key, ['owner', 'active', 'posting', 'memo']));
				var owner = { weight_threshold: 1, account_auths: [], key_auths: [[publicKeys.owner, 1]] };
				var active = { weight_threshold: 1, account_auths: [], key_auths: [[publicKeys.active, 1]] };
				var posting = { weight_threshold: 1, account_auths: [], key_auths: [[publicKeys.posting, 1]] };
				hive.broadcast.accountCreate(wif, fee, creator, name, owner, active, posting, publicKeys.memo, jsonMetadata, function(err, result) {
				  console.log(err, result);
					if(err){
						res.setHeader('Content-Type', 'application/json');
						res.end(JSON.stringify({ created: false, name: name, key: key }));
					} else{
						res.setHeader('Content-Type', 'application/json');
						res.end(JSON.stringify({ created: true, name: name, key: key }));
						create.updateToken(code)
					}
				});*/


				const ownerKey = dsteem.PrivateKey.fromLogin(name, key, 'owner');
				const activeKey = dsteem.PrivateKey.fromLogin(name, key, 'active');
				const postingKey = dsteem.PrivateKey.fromLogin(name, key, 'posting');
				const memoKey = dsteem.PrivateKey.fromLogin(
				    name,
				    key,
				    'memo'
				).createPublic(opts.addressPrefix);

				const ownerAuth = {
				    weight_threshold: 1,
				    account_auths: [],
				    key_auths: [[ownerKey.createPublic(opts.addressPrefix), 1]],
				};
				const activeAuth = {
				    weight_threshold: 1,
				    account_auths: [],
				    key_auths: [[activeKey.createPublic(opts.addressPrefix), 1]],
				};
				const postingAuth = {
				    weight_threshold: 1,
				    account_auths: [],
				    key_auths: [[postingKey.createPublic(opts.addressPrefix), 1]],
				};

				//create account
				const privateKey = dsteem.PrivateKey.fromString(config.key);
				let ops = [];
				const create_op = [
				    'create_claimed_account',
				    {
				        creator: config.account,
				        new_account_name: name,
				        owner: ownerAuth,
				        active: activeAuth,
				        posting: postingAuth,
				        memo_key: memoKey,
				        json_metadata: '',
				        extensions: []
				    },
				];
				ops.push(create_op)
				//send transaction to blockchain
				client.broadcast.sendOperations(ops, privateKey).then(
				    function(result) {
							res.setHeader('Content-Type', 'application/json');
							res.end(JSON.stringify({ created: true, name: name, key: key }));
							create.updateToken(code)
				    },
				    function(error) {
			        console.error(error);
							res.setHeader('Content-Type', 'application/json');
							res.end(JSON.stringify({ created: false, name: name, key: key }));
				    }
				);


			}
			else{
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ created: false, name: name, key: key }));
			}
		}
	})
})

app.get('/api', (req, res) => {
	var api_response = {
		price_per_account: config.price.split(" ")[0],
		currency: config.price.split(" ")[1],
		owner_account: config.account,
		memo: 'account_creation'
	}
	res.json(api_response)
})

app.listen(5000)
