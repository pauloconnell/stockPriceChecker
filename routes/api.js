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
  
  
  
  app.route('/api/stock-prices')
    .get(function (req, res){
    
  var stockData    ={};
  var stockArray   =[];
  
    
    //define some methods to use on our route:
    
    
    //handle like stock
    let handleLikes=(stockPass, nextStep)=>{
    
          //increment likes and push IP address
      console.log("50 about to update likes and IP address");
      Stock.findOneAndUpdate(
        {name: stockPass.name},
        {$inc: { like: 1 }, $push:{ ips: stockPass.ip}},
        {new:true, upsert:true, useFindAndModify:false},
        (err,doc)=>{
          if(err){
            console.log(err);
          }else{
            if(doc){
//                   dbLike=doc.like;          
               stockPass.like=doc.like
               console.log("62",doc+" - doc and likes are"+doc.like);
               getPrice(stockPass, nextStep);      
            }else{
              console.log("65 error?  new doc created");  // should be upserted and returned so never run
            }
          }
       })
    }

    //define DB function will check DB for this stock(upsert) if like=true, check IP to see if already liked, if not increment and update ip
    let findUpdateStock=(stockPass, update, nextStep)=>{
    let dbLike=0;
    
      
    
    console.log("72 about to look up in DB item: ", stockPass, update)
     //look up stock in DB to get likes data
      Stock.findOne(
      {name: stockPass.name},
      // { },  // no inc yet must check if this ip has been used already $inc: { like: 1 }
      //  {new:true },
        (err, doc)=>{
          if(err){
            console.log(err,"line 87");
          }else{
            console.log("88 just got our doc ", stockPass.name, doc);
            if (doc==null){
               console.log("89 new stock");     //return;  // incase this stock has not been added to DB yet
                if(update){
                  handleLikes(stockPass, nextStep)
                }else{
                    stockPass.like=0; // add field to avoid errors
                    console.log("94 stockPass is ", stockPass);  //should never happen
                    getPrice(stockPass, nextStep);
                }
            }else{
              if(doc.ips){
                console.log("94 doc from DB # of ips saved is "+doc.ips.length,(doc.ips));
                //add like and ips to our stockData object to check ips 
                //let localArray=doc.ips;
                console.log("97 includes ip "+doc.ips.includes(stockPass.ip));
                if(doc.ips.includes(stockPass.ip)){
                  update=false;        // if ip already has like saved, we don't update the DB
                };
                
                stockPass.like=doc.like;  // load up the likes for this stock
                console.log("102 DB like field / update: ", doc.like, update)  
                getPrice(stockPass,nextStep);
                
                }else{
                  if(update){
                    handleLikes(stockPass, nextStep)
                  }
                  
                } 
              }  
          }
          });
             
    }
  
let getPrice=(stockPass, nextStep)=>{
  var stockPrice=0;    
  console.log("126", stockPass);
   // format for API call: GET https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote
 const xhr = new XMLHttpRequest();
 const requestUrl='https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/'+stockPass.name+'/quote';
 xhr.open("GET", requestUrl, true);  // true means run async
 xhr.onload = () => {
   
  let string=xhr.responseText;
   //console.log("121",xhr.responseText);
  let resObject=JSON.parse(string);
   console.log("133 ", typeof resObject, resObject.latestPrice); //response is string so convert to JSON {}
  stockPrice=resObject.latestPrice.toFixed(2);   // this will drop off anything after our stockPrice(for smaller numbers)
  console.log("135 done?", typeof stockPrice, stockPrice);
  //let jsonData=JSON.parse(string);
  stockPass.price=stockPrice;
  console.log("143 type is ",typeof stockPass, stockPass );
  //delete(stockPass.ip);
  console.log("145 added stockPrice", stockPass);    //will never get called
  nextStep(stockPass);    
}
 xhr.send();

}    
    
    
//     let xhr=new XMLHttpRequest();
//     let requestURL = "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote";
//     xhr.open('GET', requestURL, true)// async=true
//     xhr.onload=()+{
//         let apiResponse=JSON.parse(xhr.responseText)
//        add price to stockDoc object stockDoc[stock][price]
    
//       }
    
    
   
  
  let buildResponse=(stockPass)=>{
   
    //compose response object in stockData for 2 stocks - 1 stock at a time
    stockArray.push(stockPass);  //load stock array with this stock's data
    console.log("165 ", stockArray);
    if(stockArray.length==2){  //only send response if we have loaded both items in
        stockArray[0].relativeLikes=stockArray[0].like-stockArray[1].like;
        stockArray[1].relativeLikes=stockArray[1].like-stockArray[0].like;
        console.log("172 StockArray has ", stockArray);
        console.log("173 likes and stockArray: ", stockArray[0].like, stockArray[1].like,stockArray);
        delete(stockArray[0].like);
        delete(stockArray[1].like);
       // delete(stockArray[0].ip);  //ip is just the ip of the last person locally
       // delete(stockArray[1].ip);

        //res.json({ stock1, stock2});  

      sendResponse(stockArray);
      }
  }
  
  let sendResponse=(stockPass)=>{
    console.log("182 ",stockPass);
    
    return res.json(stockPass);
  }
  
    
      
      
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
      var responseObject={};
      
      console.log("189 handling API");
      if (req.query){
        stock=req.query.stock;
        like=req.query.like; 
      } 
      if(req.body.stock){
        stock=req.body.stock;
        like=req.body.like;
        console.log("190we are in the body", req.body);
      }
      if(!like)  {    // like may be undefined, so change to false
        like=false;
        console.log("199 query is "+stock+"like is "+like);
      }
    
    // load up user ip address
     userIp = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     (req.connection.socket ? req.connection.socket.remoteAddress : null);
      console.log("206 ip is type: "+typeof(userIp));
      stockData.ip=userIp.split(",")[0];    // convert to array, pull the first element out = user ip address
      console.log(" 208 stock is type: "+typeof(stock));
      
      if(typeof(stock)=='object'){//ie. we have 2 stocks here
        twoStocks=true;
        console.log("212 1st stock is "+stock[0]);
        stock1.ip=stockData.ip;
        stock2.ip=stockData.ip;
        stock1.name=stock[0];
        stock2.name=stock[1];
        console.log("217 objects are ",stock1,stock2);
       //  if(like){          // handled updating likes in findUpdateStock method below
       //   handleLikes(stock1, buildResponse);
       //   handleLikes(stock2, buildResponse); 
       
          findUpdateStock(stock1, like, buildResponse);
          findUpdateStock(stock2, like, buildResponse);
       
        
//        stock1=findUpdateStock(stock1, like, buildResponse);
//        stock2=findUpdateStock(stock2, like, buildResponse);
        
      }else{// ie only 1 stock here:
        stockData.name=stock;
        console.log("line 237 sending single stock: ", stockData, like)
        //if(like){
        //  handleLikes(stockData, sendResponse);  //handling likes in findUpdateStock()
        //}else{
          findUpdateStock(stockData, like, sendResponse);
       
          //res.json({stockData});
      }
      
    });
    
};
