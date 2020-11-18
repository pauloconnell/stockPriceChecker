/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect       = require('chai').expect;
var MongoClient  = require('mongodb');
var mongoose     = require('mongoose');
let XMLHttpRequest= require('xmlhttprequest').XMLHttpRequest;
var stockData    ={};

module.exports = function (app) {
   // connect to DB
  const CONNECTION_STRING ='mongodb+srv://paul:'+process.env.DB+'@cluster0.tjq8t.mongodb.net/stockPriceDB?retryWrites=true&w=majority'; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});
  mongoose.connect(CONNECTION_STRING, {useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false});
  console.log("mongoDB is connected status = ");
  
  // define schema
  let stockSchema=new mongoose.Schema({
    name: {type: String, required:true},
    like: {type:Number, default:0},
    ips: [String]
  });
  //create model collection
  let Stock=mongoose.model('Stock', stockSchema);
  
  
  //define DB function will check DB for this stock(upsert) if like=true, check IP to see if already liked, if not increment and update ip
  let findUpdateStock=(stockData, update, getPrice)=>{


    let dbLike=0;
     //look up stock in DB
      Stock.findOne(
      {name: stockData.name},
      // { },  // no inc yet must check if this ip has been used already $inc: { like: 1 }
        {new:true},
        (err, doc)=>{
          if(err){
            console.log(err,"line 37");
          }else{
              if(doc.ips){
                console.log("doc from DB # of ips saved is ",(doc));
                //add like and ips to our stockData object to check ips 

                console.log("includes ip "+doc.ips.includes(stockData.ip));
                if(doc.ips.includes(stockData.ip)){
                  update=false;        // if ip already has like saved, we don't update the DB
                };
                dbLike=doc.like;  // load up the likes for this stock
                console.log("DB like field", dbLike)  
                // load price into our object stockData
                //getPrice(stockData);
                //return stockData;
                }  
              }  
          });
        console.log("update is ",update);
        if(!dbLike){
          dbLike=0;
        }
          
        stockData.like=dbLike;
        
    
        // load price into our object stockData
        stockData=getPrice(stockData);
        
        console.log("line 68 likes here?", stockData);
         //get ip address = ip
        console.log("like true?"+update);
    
         // see if in DB already
        if(update){        // if we are sending a like
          //increment likes and push IP address
          console.log("about to update likes and IP address");
          Stock.findOneAndUpdate(
            {name: stockData.name},
            {$inc: { like: 1 }, $push:{ ips: stockData.ip}},
            {new:true, useFindAndModify:false},
            (err,doc)=>{
              if(err){
                console.log(err);
              }else{
                if(doc){
                   dbLike=doc.like;          
                   console.log(doc+" - doc and likes are"+dbLike);
                }
              }
           })
           stockData.like++;
        }
        console.log("Sending back @ line 84 ",stockData);
        return stockData;
  }
  
  let getPrice=(stockData)=>{
    //let xhr=new XMLHttpRequest();
    //let requestURL = https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote
   // xhr.open('GET', requestURL, true)// async=true
    //xhr.onload=()+{
        //let apiResponse=JSON.parse(xhr.responseText)
      // add price to stockDoc object stockDoc[stock][price]
    
     // }
    
    stockData.price=1;
    return stockData;
  } 
  
    app.route('/api/stock-prices')
    .get(function (req, res){
      stockData={};  // clear our object for new data
      var stock;
      var like=0;
      var like1=0;  //relative likes
      var like2=0;  //relative likes
      var userIp;
      var update;
      var twoStocks=false;
      var stock1={};
      var stock2={};
      
      console.log("inside API");
      if (req.query){
        stock=req.query.stock;
        like=req.query.like;
        if(!like)      // like may be undefined, so change to false
          like=false;
        console.log("query is "+stock+"like is "+like);
      }
      // if (req.body){
      //   stock=req.body.stock;
      //   like=req.body.like;
      //   console.log("body is "+stock);
      // }
     
     userIp = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     (req.connection.socket ? req.connection.socket.remoteAddress : null);
      console.log("ip is type: "+typeof(userIp));
      stockData.ip=userIp.split(",")[0];
      console.log("stock is type: "+typeof(stock));
      
      if(typeof(stock)=='object'){
        twoStocks=true;
        console.log("1st stock is "+stock[0]);
        stock1.ip=stockData.ip;
        stock2.ip=stockData.ip;
        stock1.stock=stock[0];
        stock2.stock=stock[1];
        console.log("objects are ",stock1,stock2);
        
        
       
          stock1=findUpdateStock(stock1, like, getPrice);
          stock2=findUpdateStock(stock2, like, getPrice);
          console.log("line 149 ",stock1);
         if(like){
          stock1.relative=stock1.like-stock2.like;
          stock2.relative=stock2.like-stock1.like;
          return res.json({'2stockData': stock1, 'stockData':stock2});  
        }
        
      }else{// ie only 1 stock here:
        stockData.name=stock;
        stockData=findUpdateStock(stockData, like, getPrice);
      }
      console.log("response is: ", stockData);
      delete(stockData.ip);
      res.json({'stockData' : stockData }); //./views/index.html');
    });
    
};
