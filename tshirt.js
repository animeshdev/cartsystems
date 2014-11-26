var express    = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
   db = require('./config/database'),
   async = require('async'),
  router     = express.Router();
  var Tshirt = db.tshirtModel;

router
    
    .use(bodyParser.json())
    .use(methodOverride())
    .route('/tshirt')
        .get(function (req, res) {
             Tshirt
              .find(null, { _id: 0 })
              .sort('size')
              .exec(function (err, tshirts) {
                if( err ) return res.send(500, err);
                if( !tshirts ) return res.send(404, new Error("Tshirts not found."));
                res.send(tshirts);
            });
        })
        .post(function (req, res) {
          
            var tshirt = new Tshirt(req.body);

             tshirt.save(function (err, tshirt) {
              if( err ) return res.send(500, err);
              res.send(tshirt);

            });
            
        });

router
   
    .route('/tshirt/:sku')

        .get(function (req, res) {

                Tshirt
                  .findOne({ 'sku': req.params.sku  }, { _id: 0 })
                  .exec(function (err, tshirt) {
                    if( err ) return res.send(500, err);
                    if( !tshirt ) return res.send(404, new Error("tshirt not found."));
                    res.send(tshirt);
                });
        })

        .put(function (req, res) {

          if (req.user.role != 'admin') { return res.send(401); }

  

                var locals = {};
                var sku = req.params.sku;
                var tshirtId; //Define userId o

                var newTshirt = new Tshirt(req.body).toObject();
                delete newTshirt.$promise;
                delete newTshirt.$resolved;
                delete newTshirt._id;

                async.series([
                //Load user to get userId first
                function(callback) {

                   Tshirt
                          .findOne({ 'sku': sku  } )
                          .exec(function (err, Tshirt) {
                            if( err ) return res.send(500, err);
                            if( !Tshirt ) return res.send(404, new Error("Tshirt not found."));

                            tshirtId = Tshirt.id;
                            callback();
                        });
                },
                //Load posts (won't be called before task 1's "task callback" has been called)
                function(callback) {
                    Tshirt.update({_id: tshirtId}, newTshirt, {upsert: true}, function (err, Tshirt) {
                      if( err ) return res.send(500, err);
                      locals = Tshirt;
                      callback();
                    });
                }
            ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
                if (err) return next(err);
                //Here locals will be populated with 'user' and 'posts'
                res.send(locals);
            });

        })
        .delete(function (req, res) {

          if (req.user.role != 'admin') { return res.send(401); }

            Tshirt
              .remove({ 'sku': req.params.sku  } , function (err) {

                    if( err ) return res.send(500, err);

                    res.json(null);
                });
        });

module.exports = router;
