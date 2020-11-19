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
  let findUpdateStock=async(stockPass, update, nextStep)=>{


    let dbLike=0;
    console.log("42 about to look up in DB item: ", stockPass, update)
     //look up stock in DB
      await Stock.findOne(
      {name: stockPass.name},
      // { },  // no inc yet must check if this ip has been used already $inc: { like: 1 }
      //  {new:true },
        (err, doc)=>{
          if(err){
            console.log(err,"line 37");
          }else{
            console.log("51 just got our doc ", doc);
            if (doc==null){
               console.log("new stock");     //return;  // incase this stock has not been added to DB yet
            }else{
              if(doc.ips){
                console.log("54 doc from DB # of ips saved is "+doc.ips.length,(doc.ips));
                //add like and ips to our stockData object to check ips 
                //let localArray=doc.ips;
                console.log("57 includes ip "+doc.ips.includes(stockPass.ip));
                if(doc.ips.includes(stockPass.ip)){
                  update=false;        // if ip already has like saved, we don't update the DB
                };
                dbLike=doc.like;  // load up the likes for this stock
                console.log("62 DB like field / update: ", dbLike, update)  
                // load price into our object stockData
                //getPrice(stockData);
                //return stockData;
                }else console.log("66 err if no doc.ips yet here", doc);  //should never happen
              }  
          }
          });
        console.log("69 update is "+update+"likes are "+dbLike);
        if(!dbLike){
          dbLike=0;
        }
          
        stockPass.like=dbLike;
        
    console.log("80 likes here?", stockPass);
        // load price into our object stockData
        stockPass=nextStep(stockPass);    // will be getPrice if 1 stock or build response if 2 stocks
        
        console.log("84 likes here?", stockPass);
         //get ip address = ip
        console.log("86 update true?"+update);
    
         // see if in DB already
        if(update){        // if we are sending a like
          //increment likes and push IP address
          console.log("87 about to update likes and IP address");
          Stock.findOneAndUpdate(
            {name: stockPass.name},
            {$inc: { like: 1 }, $push:{ ips: stockPass.ip}},
            {new:true, upsert:true, useFindAndModify:false},
            (err,doc)=>{
              if(err){
                console.log(err);
              }else{
                if(doc){
                   dbLike=doc.like;          
                   console.log("102",doc+" - doc and likes are"+dbLike);
                }
              }
           })
           stockPass.like++;
        }
        console.log("104 Sending back ",stockPass);
        return stockPass;
  }
  
  let getPrice=(stockPass)=>{
    //let xhr=new XMLHttpRequest();
    //let requestURL = https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote
   // xhr.open('GET', requestURL, true)// async=true
    //xhr.onload=()+{
        //let apiResponse=JSON.parse(xhr.responseText)
      // add price to stockDoc object stockDoc[stock][price]
    
     // }
    
    stockPass.price=1;
    return stockPass;
  } 
  
  let buildResponse=(stockPass)=>{
   
    //compose response object in stockData for 2 stocks - 1 stock at a time
    stockArray.push(getPrice(stockPass));  //load stock array with this stock's data
    return stockPass;
  }
  
    app.route('/api/stock-prices')
    .get(async function (req, res){
      
      
      stockData={};  // clear our object for new data
      stockArray=[];  // " "
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
      console.log("166 ip is type: "+typeof(userIp));
      stockData.ip=userIp.split(",")[0];    // convert to array, pull the first element out = user ip address
      console.log(" 169 stock is type: "+typeof(stock));
      
      if(typeof(stock)=='object'){//ie. we have 2 stocks here
        twoStocks=true;
        console.log("172 1st stock is "+stock[0]);
        stock1.ip=stockData.ip;
        stock2.ip=stockData.ip;
        stock1.name=stock[0];
        stock2.name=stock[1];
        console.log("173 objects are ",stock1,stock2);
        
        stock1=await findUpdateStock(stock1, like, buildResponse);
        console.log("176 StockArray has ", stockArray);
        stock2=await findUpdateStock(stock2, like, buildResponse);
        console.log("179 likes and stockArray: ", stock1.like, stock2.like,stockArray);
        if(twoStocks){   // If 2 stocks set relative likes locally
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
