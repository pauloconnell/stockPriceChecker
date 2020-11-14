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
  mongoose.connect(CONNECTION_STRING, {useNewUrlParser: true, useUnifiedTopology: true});
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

    let incLike={};    // fill this object with optional increment or push to DB
   
      // increment like
      Stock.findOneAndUpdate(
      {name: stockData.name},
       { },  // no inc yet must check if this ip has been used already $inc: { like: 1 }
        {new:true, upsert: true, useFindAndModify:false},
        (err, doc)=>{
          if(err){
            console.log(err,"line 37");
          }else{
            console.log("doc from DB is ",(doc.ips.length));
            //add like and ips to our stockData object to check ips 
            
            console.log("includes ip "+doc.ips.includes(stockData.ip));
            if(doc.ips.includes(stockData.ip)){
              update=false;
            };
            stockData.like=doc.like;
          }

        });
    
    
    
        // load price into our object stockData
        stockData.price=getPrice(stockData.name);
        
         //get ip address = ip
   
    
         // see if in DB already
        if(update){        // if we are sending a like
          //increment likes and push IP address
          Stock.findOneAndUpdate(
            {name: stockData.name},
            {$inc: { like: 1 }, $push:{ ips: stockData.ip}},
            {new:true, useFindAndModify:false},
            (err,doc)=>{
              if(err){
                console.log(err);
              }else
                 stockData.like=doc.like;          // tricky-here I've added total 
                 console.log("likes are"+doc.like);
            }) 
          }
        return stockData;
    
  }
  
  let getPrice=(stockName)=>{
    //let xhr=new XMLHttpRequest();
    //let requestURL = https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote
   // xhr.open('GET', requestURL, true)// async=true
    //xhr.onload=()+{
        //let apiResponse=JSON.parse(xhr.responseText)
      // add price to stockDoc object stockDoc[stock][price]
    
     // }
    return 1;
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
      
      if(typeof(stock)===Object){
        twoStocks=true;
        console.log("it's an object"+stock);
        stock1.name=Object.keys(stock)[0][0];
        stock2.name=Object.keys(stock)[0][1];
        if(like){
          stock1=findUpdateStock(stock1, like, getPrice);
          stock2=findUpdateStock(stock2, like, getPrice);
          
          stock1.relative=stock1.like-stock2.like;
          stock2.relative=stock2.like-stock1.like;
          res.json({'stockData': stock1, stock2});  
        }
        
      }else{// ie only 1 stock here:
        stockData.name=stock;
        stockData=findUpdateStock(stockData, like, getPrice);
      }
      console.log("response is: ", stockData);
      res.json({'stockData' : stockData }); //./views/index.html');
    });
    
};
