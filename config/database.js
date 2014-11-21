var mongoose = require('mongoose'),
    bcrypt = require('bcrypt-nodejs'),
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

var Category = new Schema({
  user_id: { type: Schema.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }
});

var Account = new Schema({
  user_id: { type: Schema.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  currency: { type: String, required: true },
  balance: { type: Number, required: true },
});

var Record = new Schema({
  account_id: { type: Schema.ObjectId, ref: 'Account', required: true },
  user_id: { type: Schema.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  is_expense: { type: Boolean, default: true },
  description: { type: String }
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

// Models

var contatcModel = mongoose.model('Contact', contactSchema);

var userModel = mongoose.model('User', User);
var accountModel = mongoose.model('Account', Account);
var recordModel = mongoose.model('Record', Record);
var categoryModel = mongoose.model('Category', Category);


// Export Models
exports.userModel = userModel;
exports.accountModel = accountModel;
exports.recordModel = recordModel;
exports.categoryModel = categoryModel;
exports.Contact = contatcModel;
