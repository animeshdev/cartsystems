var mongoose = require('mongoose'),
    bcrypt = require('bcrypt-nodejs'),
    shortId = require('shortid'),
    SALT_WORK_FACTOR = 10;

var uristring = 'mongodb://localhost/cartsystem';

var mongoOptions = { };

mongoose.connect(uristring, mongoOptions, function (err, res) {
  if (err) { 
    console.log('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log('Successfully connected to: ' + uristring);
  }
});

var Schema = mongoose.Schema;

// User schema
var User = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true}
});


// Bcrypt middleware on UserSchema
User.pre('save', function(next) {
  var user = this;

  if(!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if(err) 
    {

      console.log( 'bcrypt error' );
      return next(err);
    }
      

    bcrypt.hash(user.password, salt,null, function(err, hash) {
      if(err) {

        console.log( 'bcrypt error' );
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

//Password verification
User.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if(err) return cb(err);
    cb(null, isMatch);
  });
};



var contactSchema = new Schema({
  name: {
    first: { type: String, default: '' },
    last: { type: String, default: '' },
    clean: { type: String, default: '', unique: true }
  },
  email: { type: String, default: '' },
  number: { type: String, default: '' },
  notes: { type: String, default: '' },
  added: Date
});

contactSchema
  // Index on important fields
  .index({ name: { last: 1, clean: 1 }, email: 1 })
  // Make sure document has 'added' field when first saved
  .pre('save', function (next) {
    if( !this.added ) this.added = new Date();
    this.name.clean = (this.name.first + '-' + this.name.last).toLowerCase();
    next();
  });


var TshirtImageSchema = new Schema({
    kind: {
        type: String,
        enum: ['thumbnail', 'detail'],
        required: true
    },
    url: { type: String, required: true },
    tshirt_id: { type: Schema.Types.ObjectId, ref: 'Tshirt' }
});

var tshirtSchema = new Schema({

  // sku name we have used a shoetid generator .... 
  // for creating unique model number

  sku:    { 

              type: String, require: true
              //,unique:true
            },

  images:    [{ type: Schema.Types.ObjectId, ref: 'TshirtImg' }],

  style:    { type: String, 
              enum:  ['Casual', 'Vintage', 'Alternative'],
              require: true 
            },

  size:     { type: Number, 
              enum: [36, 38, 40, 42, 44, 46],
              require: true 
            },

  colour:   { type: String },
  price :   { type: Number, require: true },
  summary:  { type: String },
  modified: { type: Date, default: Date.now }    
});

// tshirtSchema.path('model').validate(function (v) {
//     return ((v != "") && (v != null));
// });

tshirtSchema

.pre('save', function (next) {
    //if( !this.added ) this.added = new Date();
    this.sku = shortId.generate();
    next();
  });


var Kart = new Schema({
  kart : [
      {   
        id:     { type: String, require: true },
        amount:   { type: Number, require: true } 
      }
    ],
    user_id: { type: String, require:true},
    created: { type: Date, default: Date.now }
});


var kartModel = mongoose.model('Kart', Kart);



var tshirtImageModel = mongoose.model('TshirtImg', TshirtImageSchema);

var tshirtModel = mongoose.model('Tshirt', tshirtSchema);

// Models

var contatcModel = mongoose.model('Contact', contactSchema);

var userModel = mongoose.model('User', User);


// Export Models
exports.userModel = userModel;

exports.Contact = contatcModel;
exports.tshirtModel = tshirtModel;
exports.tshirtImageModel = tshirtImageModel;

exports.kartModel = kartModel;


