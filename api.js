var express    = require('express'),
    //Bourne     = require('bourne'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
   db = require('./config/database'),
   async = require('async'),
    router     = express.Router();

    var Contact = db.Contact;

router
    
     .use(bodyParser.json())
    .use(methodOverride())
    .route('/contact')
        .get(function (req, res) {
             Contact
              .find(null, { _id: 0 })
              .sort('name.last')
              .exec(function (err, contacts) {
                if( err ) return res.send(500, err);
                if( !contacts ) return res.send(404, new Error("Contacts not found."));
                res.send(contacts);
            });
        })
        .post(function (req, res) {

            var contact = new Contact(req.body);

            console.log(req.body);

            contact.save(function (err, contact) {
              if( err ) return res.send(500, err);
              res.send(contact);

            });
            
        });

router
    // .param('id', function (req, res, next) {
    //     req.dbQuery = { id: parseInt(req.params.id, 10) };
    //     next();
    // })
    .route('/contact/:name')

        .get(function (req, res) {

                Contact
                  .findOne({ 'name.clean': req.params.name  }, { _id: 0 })
                  .exec(function (err, contact) {
                    if( err ) return res.send(500, err);
                    if( !contact ) return res.send(404, new Error("Contact not found."));
                    res.send(contact);
                });


        })


        .put(function (req, res) {


            // var contact = req.body;
            // delete contact.$promise;
            // delete contact.$resolved;
            // db.update(req.dbQuery, contact, function (err, data) {
            //     res.json(data[0]);
            // });


        var locals = {};
        var name = req.params.name;
        var userId; //Define userId o

        var newcontact = new Contact(req.body).toObject();
        //var newcontact = newcontact.toObject();
        delete newcontact.$promise;
        delete newcontact.$resolved;

        delete newcontact._id;
        //var upsertData = contact.toObject();

        async.series([
        //Load user to get userId first
        function(callback) {

           Contact
                  .findOne({ 'name.clean': name  } )
                  .exec(function (err, contact) {
                    if( err ) return res.send(500, err);
                    if( !contact ) return res.send(404, new Error("Contact not found."));

                    userId = contact.id;
                    callback();

                    //res.send(contact);
                });
           
        },
        //Load posts (won't be called before task 1's "task callback" has been called)
        function(callback) {

            Contact.update({_id: userId}, newcontact, {upsert: true}, function (err, contact) {
              if( err ) return res.send(500, err);

              locals = contact;
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


            Contact
              .remove({ 'name.clean': req.params.name  } , function (err) {


                    if( err ) return res.send(500, err);
                    //if( !contact ) return res.send(404, new Error("Contact not found."));

                    res.json(null);

                })

              ;

            // db.delete(req.dbQuery, function () {
            //     res.json(null);
            // });


        });

module.exports = router;
