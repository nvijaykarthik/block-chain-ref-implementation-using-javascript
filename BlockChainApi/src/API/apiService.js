var express = require('express');
var router = express.Router();
const request = require('request');
const reqPromise = require('request-promise');
const uuid = require('uuid');
const serverInfo = require('../Server-info');
const chainDistribution = require('./chainDistribution')
const blockChain = require('../blockchain');
const viCoin = blockChain.SingletonBlockChain.getInstance();

router.get('/blockchain', function (req, res) {
    res.send(viCoin);
});

router.get('/blockchain/chain', function (req, res) {
    res.send({ chain: viCoin.chain, pendingTransactions: viCoin.pendingTransactions, rejectedTransactions: viCoin.rejectedTransactions });
});

router.post('/transaction', function (req, res) {
    let transaction = new blockChain.Transactions(
        req.body.voter,
        req.body.candidate,
        1,
        uuid().split('-').join(''))
    viCoin.createTransaction(transaction);
    let requests = chainDistribution.broadCastTransaction(transaction)
    if (requests.length > 0) {
        Promise.all(requests)
            .then(data => {
                res.json(
                    {
                        message: `Creating and broadcasting Transaction successfully!`
                    }
                );
            });
    } else {
        res.json({
            message: `Transaction is added to block with index: ${viCoin.pendingTransactions.length - 1}`
        });
    }
});

router.post('/transaction/broadcast', function (req, res) {
    let transaction = new blockChain.Transactions(
        req.body.voter,
        req.body.candidate,
        req.body.vote,
        req.body.id)
    viCoin.createTransaction(transaction);
    res.json({
        message: `Transaction is added to block with index: ${viCoin.pendingTransactions.length - 1}`
    });
});

router.post('/broadcast/chain', function (req, res) {
    if (viCoin.isTempChainValid(req.body.chain)) {
        viCoin.updateChain(req.body.chain, req.body.pendingTransactions, req.body.rejectedTransactions)
        res.json({
            message: 'Chain Added Successfully'
        });
    } else {
        res.json({
            message: 'Invalid chain'
        });
    }

});


setInterval(viCoin.minePendingTransactions, 10000)

router.get('/mine', function (req, res) {
    viCoin.minePendingTransactions();
    let newBlock = viCoin.getLatestBlock();
    chainDistribution.broadcastChain();
    res.json({
        message: 'Mining new Block successfully!',
        newBlock
    });
});

router.get('/checkMyVote', function (req, res) {
    let user=req.query.user;
    let alreadyVoted=viCoin.verifyVoteCasted(user);
    res.json(alreadyVoted);
});

router.get('/countVote', function (req, res) {
    let count = viCoin.countVotesForCandidate(req.query.candidate);
    res.json({
        candidate: req.query.candidate,
        count: count
    })
})

router.post('/countVote', function (req, res) {
    let updatedCandidate = viCoin.countVotesForCandidates(req.body.candidates);
    res.json({
        candidates:updatedCandidate
    })
})

router.get('/updateMyChain', function (req, res) {
    chainDistribution.updateMyChain();
    res.json({
        status: "Chain Updated",
        chain: viCoin.chain

    })
});
router.get('/myTransactionStatus',(req,res)=>{
    let user=req.query.user;
    let alreadyVoted=viCoin.myTransactionStatus(user);
    res.json(alreadyVoted);
})

module.exports = router;