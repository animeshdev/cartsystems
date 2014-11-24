var express    = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
   db = require('./config/database'),
   async = require('async'),
  router     = express.Router();
  var Tshirt = db.tshirtModel;

  var Kart = db.kartModel;

  var time_to_expire = 300;
  var redis = require("redis"),
    client = redis.createClient();

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
    .route('/viewkart')

        .get(function (req, res) {

                  client.hgetall("kart.44", function(err, objs) {
                    if(!objs) {
                        res.statusCode = 404;
                        return res.send({ error: 'Not cart yet!!' });
                      } 
                    if(!err) {
                        res.send(objs);
                      } else {
                        res.statusCode = 500;
                        console.log('Internal error(%d): %s',res.statusCode,err.message);
                        res.send({ error: 'Server error' });
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

module.exports = router;
