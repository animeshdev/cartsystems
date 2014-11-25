var express = require('express'),
    contact     = require('./api'),
    tshirt     = require('./tshirt'),
    kart     = require('./kart'),
    users   = require('./accounts'),
    pass = require('./config/pass'),
    app     = express();

app

    .use(express.static('./public'))

    .use(users)
    // .all('/api/*', pass.userIsAuthenticated )
    // .use('/api', contact)

    .use('/api', tshirt)

    .use('/api', kart)
    
    .get('*', function (req, res) {

        res.sendfile('public/main.html');

        // if ( !req.user  ) {
        //     res.redirect('/login');
        // } else {
        //     res.sendfile('public/main.html');
        // }


    })
    .listen(5000);
