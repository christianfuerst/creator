const { Client, PrivateKey, Asset } = require("dsteem");

var fs = require("fs");

var config = JSON.parse(fs.readFileSync("config.json"));

const client = new Client(config.rpc);

var wif = config.key;
var account = config.account;

module.exports = {
  claimAccount: function claimAccount() {
    const op = [
      "claim_account",
      {
        creator: account,
        fee: Asset.from("0.000 STEEM"),
        extensions: [],
      },
    ];
    claim(op);
    setInterval(() => {
      claim(op);
    }, 1000 * 60 * 60 * 12); //12h

    function claim(op) {
      console.log("Claiming account...");
      client.broadcast
        .sendOperations([op], PrivateKey.from(wif))
        .then((res) => {
          console.log("You have successfully claimed a discounted account");
          // 10 seconds delay to prevent to many ops beeing broadcasted in one block
          setTimeout(() => claim(op), 10000);
        })
        .catch((err) => {
          console.log("Error claiming account...");
        });
    }
  },
};
