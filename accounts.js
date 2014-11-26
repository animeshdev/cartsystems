var express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session    = require('express-session'),
    //MongoStore = require('connect-mongo')(session)
     async = require('async'),
    db = require('./config/database'),
    //Bourne     = require('bourne'),
    passport = require('passport'),

    crypto     = require('crypto');
    require('./config/pass');

     var redis = require("redis"),
    client = redis.createClient();
     var Kart = db.kartModel;

var router = express.Router();

router
    
     .use(cookieParser())
     .use(bodyParser.json())
     .use(bodyParser.urlencoded())
     .use(session({ secret: '123' }))

     .use(passport.initialize())
     .use(passport.session())
     

    .get('/login', function (req, res) {
        res.sendfile('public/login.html');     
    })



    .post('/login', passport.authenticate('local', { successRedirect: '/',
                                   failureRedirect: '/login' })
    )

    .post('/register', function (req, res) {
     

    var user = new db.userModel();
    user.username = req.body.username;
    user.password = req.body.password;

    user.save(function(err) {
        //var user = this;
        console.log(err);
        if (err) {

            throw err;

          res.redirect('/login');
        }else {

            req.login(user, function(err) {
                if (err) {
                  console.log(err);
                  res.redirect('/login');
                }
                return res.redirect('/');
            });
        }
    });

            
    })
    .get('/logout', function (req, res) {

      async.series([
        //Load user to get userId first
        function(callback) {

            var productsToKart = [];

            client.hgetall("kart.44", function(err, products) {
                if(!err && products ) {


                  for(var key in products) {
                        var product = {
                          id : key,
                          amount: products[key]
                        };
                        productsToKart.push(product);
                  }


                    var kart = new Kart({
                      user_id: 44,
                      kartlist: productsToKart
                    }).toObject();
                    delete kart._id;;

                    Kart.update({user_id: 44}, kart, {upsert: true}, function (err, contact) {
                    if(!err) {
                        console.log("Kart " + contact.id + " created");
                        client.expire('kart.'+44, 1);
                      
                      } 
                      else {

                        client.expire('kart.'+44, 1);
                        console.log( 'errror occured while saving in cart db xxx' );
                        
                      }  
                   
                  });


                   
                  } else {

                     console.log( 'either error or product not found in redis' );
                  }

                  
            });

          callback();
        }
    ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
        if (err) return next(err);
        //Here locals will be populated with 'user' and 'posts'
         req.logout();
         res.redirect('/'); 
    });


      
        
        
    });

module.exports = router;
