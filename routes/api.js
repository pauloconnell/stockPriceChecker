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
var stockArray   =[];

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
  let findUpdateStock=async(stockData, update, nextStep)=>{


    let dbLike=0;
     //look up stock in DB
      await Stock.findOne(
      {name: stockData.name},
      // { },  // no inc yet must check if this ip has been used already $inc: { like: 1 }
      //  {new:true },
        (err, doc)=>{
          if(err){
            console.log(err,"line 37");
          }else{
            console.log("just got our doc ", doc);
            if (doc==null) return;  // incase this stock has not been added to DB yet
              if(doc.ips){
                console.log("54 doc from DB # of ips saved is "+doc.ips.length,(doc.ips));
                //add like and ips to our stockData object to check ips 

                console.log("57 includes ip "+doc.ips.includes(stockData.ip));
                if(doc.ips.includes(stockData.ip)){
                  update=false;        // if ip already has like saved, we don't update the DB
                };
                dbLike=doc.like;  // load up the likes for this stock
                console.log("62 DB like field / update: ", dbLike, update)  
                // load price into our object stockData
                //getPrice(stockData);
                //return stockData;
                }else console.log("66 no doc.ips yet", doc);  
              }  
          });
        console.log("69 update is "+update+"likes are "+dbLike);
        if(!dbLike){
          dbLike=0;
        }
          
        stockData.like=dbLike;
        
    
        // load price into our object stockData
        stockData=nextStep(stockData);    // will be getPrice if 1 stock or build response if 2 stocks
        
        console.log("79 likes here?", stockData);
         //get ip address = ip
        console.log("82 update true?"+update);
    
         // see if in DB already
        if(update){        // if we are sending a like
          //increment likes and push IP address
          console.log("87 about to update likes and IP address");
          Stock.findOneAndUpdate(
            {name: stockData.name},
            {$inc: { like: 1 }, $push:{ ips: stockData.ip}},
            {new:true, upsert:true, useFindAndModify:false},
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
        console.log("104 Sending back @ line 84 ",stockData);
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
  
  let buildResponse=(stockData)=>{
   
    //compose response object in stockData for 2 stocks - 1 stock at a time
    stockArray.push(getPrice(stockData));  //load stock array with this stock's data
    return stockData;
  }
  
    app.route('/api/stock-prices')
    .get(async function (req, res){
      stockData={};  // clear our object for new data
      stockArray=[]  // " "
      var stock;
      var like=0;
      var like1=0;  //relative likes
      var like2=0;  //relative likes
      var userIp;
      var update;
      var twoStocks=false;
      var stock1={};
      var stock2={};
      
      console.log("143 inside API");
      if (req.query){
        stock=req.query.stock;
        like=req.query.like;
        
        if(!like)      // like may be undefined, so change to false
          like=false;
        console.log("150 query is "+stock+"like is "+like);
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
      stockData.ip=userIp.split(",")[0];    // convert to array, pull the first element out = user ip address
      console.log("stock is type: "+typeof(stock));
      
      if(typeof(stock)=='object'){//ie. we have 2 stocks here
        twoStocks=true;
        console.log("168 1st stock is "+stock[0]);
        stock1.ip=stockData.ip;
        stock2.ip=stockData.ip;
        stock1.name=stock[0];
        stock2.name=stock[1];
        console.log("173 objects are ",stock1,stock2);
        
        stock1=await findUpdateStock(stock1, like, buildResponse);
        console.log("176 StockArray has ", stockArray);
        stock2=await findUpdateStock(stock2, like, buildResponse);
        console.log("179 likes ", stock1.like, stock2.like,stockArray);
        if(like){
          stock1.relativeLikes=stock1.like-stock2.like;
          stock2.relativeLikes=stock2.like-stock1.like;
          delete(stock1.like);
          delete(stock2.like);
          delete(stock1.ip);  //ip is just the ip of the last person locally
          delete(stock2.ip);
          
          return res.json({ stock1, stock2});  
        }else return res.json({stock1, stock2});
        
        
      }else{// ie only 1 stock here:
        stockData.name=stock;
        console.log("line 189 sending single stock: ", stockData, like)
        stockData=await findUpdateStock(stockData, like, getPrice);
      }
      console.log("response is: ", stockData);
      delete(stockData.ip);
      return res.json({'stockData' : stockData }); //./views/index.html');
    });
    
};
