var express    = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
   db = require('./config/database'),
   utilhelp = require('./config/utility'),

   async = require('async'),
  router     = express.Router();
  var Tshirt = db.tshirtModel;

  var Kart = db.kartModel;

  var WasHot = db.washotModel;

  var time_to_expire = 300;
  var redis = require("redis"),
    client = redis.createClient();

     var ttl    = 60; 

router
.route('/myrole')
    .get(function (req, res) {
        
        res.send( {'role':req.user.role , 'username':req.user.username }  );   
    });
router
   
    .use(bodyParser.json())
    .use(methodOverride())

    .route('/addproduct')
        .post(function (req, res) {
            var key = 'kart.' + 44;
            if ( (!req.body.sku) || (!req.body.amount)){
              res.statusCode = 404;
              res.send("Error. You need id and amount in the body.");
            } else {

                  Tshirt
                  .findOne({ 'sku': req.body.sku  }, { _id: 0 })
                  .exec(function (err, tshirt) {
                   
                    if(!tshirt) {
                      res.statusCode = 404;
                      return res.send({ error: 'Try with a correct tshirt ID' });
                    }

                    if(!err) {
                      client.hmset(key, req.body.sku, req.body.amount, function(err, result) {

                          //console.log(result);  
                          if (err) {
                              console.log('Internal error(%d): %s',res.statusCode,err.message);
                              res.send('Internal error(%d): %s',res.statusCode,err.message);
                          } 
                          else {
                              console.log('product added to cart!');
                              res.statusCode = 200;
                              res.send("product added to cart");
                          } 
                      });
                      client.expire('kart.'+44, time_to_expire);
                    } else {
                      res.statusCode = 500;
                      console.log('Internal error(%d): %s',res.statusCode,err.message);
                      res.send({ error: 'Server error' });
                    }
                  });
            }
            
        });


router
   
    .route('/getprod/:sku')

        .get(function (req, res) {

                Tshirt
                  .findOne({ 'sku': req.params.sku  }, { _id: 0 })
                  .exec(function (err, tshirt) {
                    

                        if(!tshirt) {
                          res.statusCode = 404;
                          return res.send({ error: 'Not found' });
                        }
                        if(!err) {
                        
                          client.get("hot."+req.params.sku, function(err, instance){
                            if (!instance) {
                              
                              client.set ("hot."+req.params.sku, 1, function(error, result) {
                                if (error) console.log('Error1: ' + error);
                                else {
                                  console.log('Instance saved!');
                                }
                              });
                            }
                            else {

                              client.incr("hot."+req.params.sku, function(error, inst){
                                if (error) console.log('Error: ' + error);
                                else console.log('Instance incremented!');
                              });

                              client.expire("hot."+req.params.sku, ttl, function(error){
                                if (error) console.log('Error: ' + error);
                                else console.log('Instance expire time restaured!');
                              });
                            }
                          });

                          var washot = new WasHot({
                            tshirt_id : req.params.sku
                          });
                          washot.save(function(err) {
                            if(!err) {
                              console.log("WasHot created");
                            } 
                            else {
                              console.log('Internal error(%d): %s',res.statusCode,err.message);
                              res.statusCode = 500;
                              res.send('Internal error(%d): %s',res.statusCode,err.message);
                            }            
                          });
                
                res.send(tshirt);

              } else {
                res.statusCode = 500;
                console.log('Internal error(%d): %s',res.statusCode,err.message);
                res.send({ error: 'Server error' });
              }
      
        });//end of prod find
// end of getprod
    });

router
    .route('/viewkart')

        .get(function (req, res) {

                var result = {};

                  client.hgetall("kart.44", function(err, objs) {

                     if(err) {
                            res.statusCode = 500;
                            console.log('Internal error(%d): %s',res.statusCode,err.message);
                            res.send({ error: 'Server error' });
                          }

                          if(!objs) {
                              Kart
                              .findOne({ 'user_id': 44  } )
                              .exec(function (err, kart) {


                                if( err ) return res.send(500, err);

                                if( !kart ) 
                                  {  
                                    res.statusCode = 404;
                                     res.send( { error: 'Not cart yet!!' } );
                                  } else {

                                       
                                        var arr = kart.kartlist;
                                        var rv = {};
                                        var result = [];
                                       for (var i = 0; i < arr.length; ++i){
                                        var key = arr[i].id ;
                                        var val = arr[i].amount ;
                                        rv[key] = val;

                                        var temp = ["hmset", "kart.44",key,val];
                                        result.push(temp);

                                      }

                                      if(result){

                                      client.multi(result).exec(function (err, replies) {
                                        //console.log(replies);
                                        res.send( rv );
                                      });

                                    }   


                                  }

                              
                          });

                           

                         }else {

                           res.send(objs);
                         } 
                   
                  });
        });

router
    .route('/removekart/:sku')

        .delete(function (req, res) {

            client.hdel("kart.44", req.params.sku, function(err, product) {
              if(product == 0) {
                  res.statusCode = 404;
                  return res.send({ error: 'Not found' });
                } 
              if(!err) {
                  console.log('Removed product to cart');
                    res.send({ status: 'OK' });
                } else {
                  res.statusCode = 500;
                  console.log('Internal error(%d): %s',res.statusCode,err.message);
                  res.send({ error: 'Server error' });
                }
              
            });

        });


router
    .route('/closekart')

        .post(function (req, res) {

            var productsToKart = [];
            client.hgetall("kart.44", function(err, products) {
              if(!products) {
                  res.statusCode = 404;
                  return res.send({ error: 'Not found. Probably your sessions expired.' });
                } 
              if(!err) {
                for(var key in products) {
                  var product = {
                    id : key,
                    amount: products[key]
                  };
                  productsToKart.push(product);
                }
                var kart = new Kart({
                  user_id: 44,
                  kart: productsToKart
                });
                kart.save(function(err) {
                  if(!err) {
                    console.log("Kart " + kart.id + " created");
                    client.expire('kart.'+44, 1);
                    res.send({ status: 'OK', kart:kart });
                  } 
                  else {
                    res.statusCode = 500;
                    res.send({ error: 'Server error' });
                  }  
                });
              } else {
                res.statusCode = 500;
                console.log('Internal error(%d): %s',res.statusCode,err.message);
                res.send({ error: 'Server error' });
              }

           
        });
    });



router
    .route('/closekartlist')

        .get(function (req, res) {

           Kart.find(function(err, karts) {
            if (karts.length == 0) {
              res.statusCode = 404;
              return res.send({ error: 'Not found. Probably not carts yet.' });  
            }
            if(!err) {
              res.send(karts);
            } else {
              res.statusCode = 500;
              res.send({ error: 'Server error' });
            }
          });
           
      });


router
    .route('/hotitems')
    .get( function(req, res){
    console.log("GET - /hots");

    client.keys("hot.*", function (err, replies){
      if (replies.length == 0) {
        res.statusCode = 404;
        return res.send({ error: 'Not hot tshirts now' });
      } 
      if (!err) { 

            var inputs = [];
            replies.forEach(function(item){

                inputs.push( item.substring(4) );
            });

            processhotlist(inputs,res);

      } 
      else {
        res.statusCode = 500;
        console.log('Internal error(%d): %s',res.statusCode,err.message);
        res.send({ error: 'Server error' });
      }

      
        
    });
// 
  });


function processhotlist(replies,res){

            async = require("async");
 
        // Array to hold async tasks
        var asyncTasks = [];
        var hotTshirts = [];
         
        // Loop through some items
        replies.forEach(function(item){
          // We don't actually execute the async thing here
          // We push a function containing it on to an array of "tasks"
          asyncTasks.push(function(callback){
            // Call an async function (often a save() to MongoDB)

             Tshirt
                  .findOne({ 'sku': item  }, { _id: 0 })
                  .exec(function (err, tshirt) {
                if (err) {
                  //console.log("Hot Tshirt Not Found");
                  res.statusCode = 500;
                  console.log('Internal error(%d): %s',res.statusCode,err.message);
                  return res.send({ error: 'Server error' });
                }
                else {
                  hotTshirts.push(tshirt);
                  //console.log("hotTshirts add");
                }
              });
              // Async call is done, alert via callback
              callback();
            });
          });
        
         
        // Note: At this point, nothing has been executed,
        // we just pushed all the async tasks into an array
         
        // To move beyond the iteration example, let's add
        // another (different) async task for proof of concept
        asyncTasks.push(function(callback){
          // Set a timeout for 3 seconds
          setTimeout(function(){
            // It's been 0.5 seconds, alert via callback
            callback();
          }, 500);
        });
         
        // Now we have an array of functions, each containing an async task
        // Execute all async tasks in the asyncTasks array
        async.parallel(asyncTasks, function(){
          // All tasks are done now
          //doSomethingOnceAllAreDone();
          //console.log(hotTshirts);
          res.send(hotTshirts);
        });
}    

router

    .route('/hotitems/:yearstart/:monthstart/:daystart/:yearend/:monthend/:dayend')

    .get( function(req, res){

    console.log("GET - /washot");
 


    var date = new Date();
    if (((req.params.monthstart < 1) || (req.params.monthstart > 12)) || ((req.params.monthend < 1) || (req.params.monthend > 12)))
    {
      console.log("Incorrect month");
      res.statusCode = 404;
      return res.send("Incorrect month");
    }    
    if (((req.params.daystart < 1) || (req.params.daystart > 31)) || ((req.params.dayend < 1) || (req.params.dayend > 31)))
    {
      console.log("Incorrect day");
      res.statusCode = 404;
      return res.send("Incorrect day");
    }
    if (((req.params.monthstart == 4) || (req.params.monthstart == 6) || (req.params.monthstart == 9) || (req.params.monthstart == 11)) 
         && (req.params.daystart > 30))
    {
      console.log("Incorrect day");
      res.statusCode = 404;
      return res.send("Incorrect day");
    }
    if (((req.params.monthend == 4) || (req.params.monthend == 6) || (req.params.monthend == 9) || (req.params.monthend == 11)) 
         && (req.params.dayend > 30))
    {
      console.log("Incorrect day");
      res.statusCode = 404;
      return res.send("Incorrect day");
    }
    if((req.params.monthstart == 2) && 
       (((req.params.yearstart % 400) == 0) || ((req.params.yearstart % 4) == 0)) && ((req.params.yearstart % 100) != 0) 
       && (req.params.daystart > 29))
    {
      console.log("Incorrect day");
      res.statusCode = 404;
      return res.send("Incorrect day");
    }
    if((req.params.monthend == 2) && 
       (((req.params.yearend % 400) == 0) || ((req.params.yearend % 4) == 0)) && ((req.params.yearend % 100) != 0) 
       && (req.params.dayend > 29))
    {
      console.log("Incorrect day");
      res.statusCode = 404;
      return res.send("Incorrect day");
    }
    if((req.params.monthstart == 2) && ((req.params.yearstart % 100) == 0) && (req.params.daystart > 29)){
      console.log("Incorrect day");
      res.statusCode = 404;
      return res.send("Incorrect day");
    }
    if((req.params.monthend == 2) && ((req.params.yearend % 100) == 0) && (req.params.dayend > 29)){
      console.log("Incorrect day");
      res.statusCode = 404;
      return res.send("Incorrect day");
    }
    if ((req.params.yearstart < 2000) || (req.params.yearend < 2000)) {
      console.log("Year should be bigger than 2000");
      res.statusCode = 404;
      return res.send("Year should be bigger than 2000");
    }
    if (req.params.yearend < req.params.yearstart) {
      console.log("Year end shouldn't be smaller than year start");
      res.statusCode = 404;
      return res.send("Year end shouldn't be smaller than year start");
    } 
    else if ((req.params.yearstart == req.params.yearend) && (req.params.monthend < req.params.monthstart)) {
      console.log("Month end shouldn't be smaller than month start");
      res.statusCode = 404;
      return res.send("Month end shouldn't be smaller than month start");
    }
    else if ((req.params.monthstart == req.params.monthend) && (req.params.dayend < req.params.daystart)) {
      console.log("Day end shouldn't be smaller than day start");
      res.statusCode = 404;
      return res.send("Day end shouldn't be smaller than day start");
    }


    // console.log(req.params.daystart);
    // console.log(req.params.dayend);


    // var dateStart = new Date(req.params.yearstart, req.params.monthstart, req.params.daystart) ;
    // var dateEnd =  new Date(req.params.yearend, req.params.monthend, req.params.dayend) ;


    var dayst = req.params.daystart + 'T00:00:00Z';
    var dayed = req.params.dayend + 'T00:00:00Z';

    // // "2013-09-15T00:00:00Z" 

    // convert date to isostring that mongo understand

    var dateStart = new Date( req.params.yearstart +'-'+ req.params.monthstart + '-' + dayst );

    var dateEnd = new Date( req.params.yearend +'-'+ req.params.monthend + '-' + dayed );



    var cond = {created : {"$gte" : dateStart, "$lt" : dateEnd }};
    WasHot.find( cond ,  function (err, washots) {
      if (washots.length == 0) {
        console.log("No find washots");
        res.statusCode = 404;
        return res.send("No find washots");
      }
      if(!err) {

        var inputs = [];
        washots.forEach(function(item){

            inputs.push( item.tshirt_id );
        });

        processhotlist(inputs,res);

        //res.send(washots);
      } else {
        res.statusCode = 500;
        console.log('Internal error(%d): %s',res.statusCode,err.message);
        res.send({ error: 'Server error' });
      }
    });
  });

module.exports = router;
